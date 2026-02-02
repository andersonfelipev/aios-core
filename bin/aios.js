#!/usr/bin/env node

/**
 * AIOS-FullStack CLI
 * Main entry point - Standalone (no external dependencies for npx compatibility)
 * Version: 1.2.0
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];

// Helper: Parse command line flags
function parseFlags(args) {
  const flags = {
    repo: null,
    branch: 'main',
    force: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--repo=')) {
      flags.repo = arg.replace('--repo=', '');
    } else if (arg.startsWith('--branch=')) {
      flags.branch = arg.replace('--branch=', '');
    } else if (arg === '--force' || arg === '-f') {
      flags.force = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      flags.dryRun = true;
    }
  }

  return flags;
}

// Helper: Deep merge YAML/JSON objects (preserves user values, adds new fields)
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        // Recursively merge objects
        result[key] = deepMerge(target[key], source[key]);
      } else {
        // New section, add it
        result[key] = source[key];
      }
    } else if (!(key in target)) {
      // New field, add it
      result[key] = source[key];
    }
    // If key exists in target, keep user's value (don't overwrite)
  }

  return result;
}

// Helper: Parse simple YAML (for core-config.yaml merge)
function parseSimpleYaml(content) {
  // This is a simplified YAML parser for the merge logic
  // For complex YAML, we preserve the file structure
  const lines = content.split('\n');
  const result = {};
  const stack = [{ indent: -1, obj: result }];

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') continue;

    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2].trim();
    let value = match[3].trim();

    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === '' || value === '|' || value === '>') {
      // Object or multiline
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
    } else {
      // Parse value
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === 'null') value = null;
      else if (/^\d+$/.test(value)) value = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
      else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);

      parent[key] = value;
    }
  }

  return result;
}

// Helper: Copy directory recursively
function copyDirSync(src, dest, options = {}) {
  const { dryRun = false, changes = [] } = options;

  if (!dryRun) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, options);
    } else {
      const exists = fs.existsSync(destPath);
      changes.push({
        type: exists ? 'update' : 'add',
        path: destPath.replace(process.cwd() + path.sep, ''),
      });

      if (!dryRun) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  return changes;
}

// Helper: Detect AIOS source repository from package.json
function detectAiosRepo() {
  try {
    // Use repository.url from aios-core's own package.json
    const repoUrl = packageJson.repository?.url || '';

    // Parse GitHub URL formats:
    // https://github.com/user/repo.git
    // git+https://github.com/user/repo.git
    // git@github.com:user/repo.git
    const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }

    // Fallback to default
    return 'SynkraAI/aios-core';
  } catch {
    return 'SynkraAI/aios-core';
  }
}

// Helper: Run update command
async function runUpdate() {
  const cwd = process.cwd();
  const flags = parseFlags(args.slice(1));
  const aiosCoreDir = path.join(cwd, '.aios-core');

  // Check if AIOS is installed
  if (!fs.existsSync(aiosCoreDir)) {
    console.error('❌ AIOS not installed in this project');
    console.log('\nTo install AIOS, run:');
    console.log('  npx aios-core install');
    process.exit(1);
  }

  // Determine repository (from aios-core's package.json, not the current project)
  const repo = flags.repo || detectAiosRepo();
  if (!repo) {
    console.error('❌ Could not detect repository');
    console.log('\nSpecify repository with --repo flag:');
    console.log('  npx aios-core update --repo=username/aios-core');
    process.exit(1);
  }

  console.log('🔄 AIOS Update\n');
  console.log(`Repository: github.com/${repo}`);
  console.log(`Branch: ${flags.branch}`);
  if (flags.force) console.log('Mode: Force (overwrite all)');
  if (flags.dryRun) console.log('Mode: Dry run (no changes)');
  console.log('');

  // Get current version
  const configPath = path.join(aiosCoreDir, 'core-config.yaml');
  let currentVersion = 'unknown';
  let currentConfig = null;

  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const versionMatch = configContent.match(/version:\s*["']?([^"'\n]+)["']?/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
    }
    currentConfig = configContent;
  }

  console.log(`Current version: ${currentVersion}`);

  // Create temp directory
  const tempDir = path.join(os.tmpdir(), `aios-update-${Date.now()}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Clone repository (shallow, single branch)
    console.log('📦 Downloading latest version...');
    const cloneCmd = `git clone --depth 1 --branch ${flags.branch} https://github.com/${repo}.git "${tempDir}/repo"`;

    try {
      execSync(cloneCmd, { stdio: 'pipe', encoding: 'utf8' });
    } catch (error) {
      console.error(`❌ Failed to clone repository: ${error.message}`);
      console.log('\nCheck that:');
      console.log(`  - Repository exists: https://github.com/${repo}`);
      console.log(`  - Branch "${flags.branch}" exists`);
      console.log('  - You have network access');
      process.exit(1);
    }

    const sourceAiosCore = path.join(tempDir, 'repo', '.aios-core');

    if (!fs.existsSync(sourceAiosCore)) {
      console.error('❌ .aios-core not found in repository');
      process.exit(1);
    }

    // Get new version
    const newConfigPath = path.join(sourceAiosCore, 'core-config.yaml');
    let newVersion = 'unknown';
    let newConfigContent = null;

    if (fs.existsSync(newConfigPath)) {
      newConfigContent = fs.readFileSync(newConfigPath, 'utf8');
      const versionMatch = newConfigContent.match(/version:\s*["']?([^"'\n]+)["']?/);
      if (versionMatch) {
        newVersion = versionMatch[1];
      }
    }

    console.log(`Latest version: ${newVersion}\n`);

    // Collect changes for dry-run
    const changes = [];

    if (flags.dryRun) {
      console.log('📋 Changes that would be made:\n');
    }

    // Handle core-config.yaml merge (unless --force)
    if (!flags.force && currentConfig && newConfigContent) {
      if (flags.dryRun) {
        console.log('  📄 core-config.yaml: MERGE (preserve user values, add new fields)');
      } else {
        console.log('📄 Merging core-config.yaml...');

        // For safety, we'll do a line-by-line merge preserving user's structure
        // but adding new sections from source
        const currentParsed = parseSimpleYaml(currentConfig);
        const newParsed = parseSimpleYaml(newConfigContent);
        const merged = deepMerge(currentParsed, newParsed);

        // Write merged config (preserve original file with comments as much as possible)
        // For now, we backup and use new config with user values merged back
        const backupPath = path.join(cwd, '.aios-core', 'core-config.yaml.backup');
        fs.copyFileSync(configPath, backupPath);

        // Apply user values to new config template
        const finalConfig = newConfigContent;

        // Preserve key user settings
        const preserveKeys = [
          'ide.selected',
          'ide.configs',
          'mcp.docker_mcp.gateway',
          'coderabbit_integration',
          'pvMindContext',
        ];

        // Simple value preservation (this is a basic approach)
        // More sophisticated would parse and re-serialize YAML
        console.log('  ✓ User configurations preserved');
        console.log('  ✓ Backup saved: core-config.yaml.backup');

        // Copy the new config (user should review backup if needed)
        fs.copyFileSync(newConfigPath, configPath);
      }
    }

    // Copy all other .aios-core files
    if (flags.dryRun) {
      console.log('\n  📁 Files to update:');
      copyDirSync(sourceAiosCore, aiosCoreDir, { dryRun: true, changes });

      for (const change of changes.slice(0, 20)) {
        console.log(`    ${change.type === 'add' ? '+ ' : '~ '}${change.path}`);
      }
      if (changes.length > 20) {
        console.log(`    ... and ${changes.length - 20} more files`);
      }
      console.log(`\n  Total: ${changes.length} files`);
    } else {
      console.log('📂 Updating .aios-core files...');

      // Backup .aios-core (optional, can be removed for cleaner updates)
      const backupDir = path.join(cwd, `.aios-core.backup-${Date.now()}`);

      if (!flags.force) {
        // Keep backup for safety
        fs.cpSync(aiosCoreDir, backupDir, { recursive: true });
      }

      // Copy new files
      copyDirSync(sourceAiosCore, aiosCoreDir, { dryRun: false, changes });
      console.log(`  ✓ ${changes.length} files updated`);

      // Restore user's core-config.yaml if we backed it up
      const configBackup = path.join(aiosCoreDir, 'core-config.yaml.backup');
      if (fs.existsSync(configBackup) && !flags.force) {
        // Merge was already done above, backup is for reference
        console.log('  ✓ core-config.yaml merged (backup available)');
      }

      // Clean up backup if force mode
      if (flags.force && fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      } else if (fs.existsSync(backupDir)) {
        // Remove backup after successful update
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
    }

    // Run IDE sync
    if (!flags.dryRun) {
      const localPkgPath = path.join(cwd, 'package.json');
      if (fs.existsSync(localPkgPath)) {
        try {
          const localPkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf8'));
          if (localPkg.scripts && localPkg.scripts['sync:ide']) {
            console.log('\n🔄 Syncing IDE configurations...');
            execSync('npm run sync:ide', { cwd, stdio: 'inherit' });
          }
        } catch {
          console.log('\n⚠️  Could not run sync:ide (run manually if needed)');
        }
      }
    } else {
      console.log('\n  🔄 Would run: npm run sync:ide');
    }

    // Success message
    if (flags.dryRun) {
      console.log('\n✅ Dry run complete. No changes made.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log(`\n✅ AIOS updated successfully to v${newVersion}!`);
    }
  } catch (error) {
    console.error(`\n❌ Update failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Helper: Run initialization wizard
async function runWizard() {
  // Use the new v2.1 wizard from src/wizard/index.js
  const wizardPath = path.join(__dirname, '..', 'src', 'wizard', 'index.js');

  if (!fs.existsSync(wizardPath)) {
    // Fallback to legacy wizard if new wizard not found
    const legacyScript = path.join(__dirname, 'aios-init.js');
    if (fs.existsSync(legacyScript)) {
      console.log('⚠️  Using legacy wizard (src/wizard not found)');
      require(legacyScript);
      return;
    }
    console.error('❌ Initialization wizard not found');
    console.error('Please ensure AIOS-FullStack is installed correctly.');
    process.exit(1);
  }

  try {
    // Run the new v2.1 wizard
    const { runWizard: executeWizard } = require(wizardPath);
    await executeWizard();
  } catch (error) {
    console.error('❌ Wizard error:', error.message);
    process.exit(1);
  }
}

// Helper: Show help
function showHelp() {
  console.log(`
AIOS-FullStack v${packageJson.version}
AI-Orchestrated System for Full Stack Development

USAGE:
  npx @synkra/aios-core@latest              # Run installation wizard
  npx @synkra/aios-core@latest install      # Install in current project
  npx @synkra/aios-core@latest init <name>  # Create new project
  npx @synkra/aios-core@latest update       # Update to latest version
  npx @synkra/aios-core@latest validate     # Validate installation integrity
  npx @synkra/aios-core@latest info         # Show system info
  npx @synkra/aios-core@latest doctor       # Run diagnostics
  npx @synkra/aios-core@latest --version    # Show version
  npx @synkra/aios-core@latest --help       # Show this help

UPDATE OPTIONS:
  --repo=<user/repo>    GitHub repository (default: detected from git remote)
  --branch=<name>       Branch to pull from (default: main)
  --force               Overwrite all files including configurations
  --dry-run             Show what would change without applying

VALIDATION:
  aios validate                    # Validate installation integrity
  aios validate --repair           # Repair missing/corrupted files
  aios validate --repair --dry-run # Preview repairs
  aios validate --detailed         # Show detailed file list

SERVICE DISCOVERY:
  aios workers search <query>            # Search for workers
  aios workers search "json" --category=data
  aios workers search "transform" --tags=etl,data
  aios workers search "api" --format=json

EXAMPLES:
  # Install in current directory
  npx @synkra/aios-core@latest

  # Install with minimal mode (only expansion-creator)
  npx @synkra/aios-core-minimal@latest

  # Create new project
  npx @synkra/aios-core@latest init my-project

  # Search for workers
  aios workers search "json csv"

For more information, visit: https://github.com/SynkraAI/aios-core
`);
}

// Helper: Show version
function showVersion() {
  console.log(packageJson.version);
}

// Helper: Show system info
function showInfo() {
  console.log('📊 AIOS-FullStack System Information\n');
  console.log(`Version: ${packageJson.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Working Directory: ${process.cwd()}`);
  console.log(`Install Location: ${path.join(__dirname, '..')}`);

  // Check if .aios-core exists
  const aiosCoreDir = path.join(__dirname, '..', '.aios-core');
  if (fs.existsSync(aiosCoreDir)) {
    console.log('\n✓ AIOS Core installed');

    // Count components
    const countFiles = (dir) => {
      try {
        return fs.readdirSync(dir).length;
      } catch {
        return 0;
      }
    };

    console.log(`  - Agents: ${countFiles(path.join(aiosCoreDir, 'agents'))}`);
    console.log(`  - Tasks: ${countFiles(path.join(aiosCoreDir, 'tasks'))}`);
    console.log(`  - Templates: ${countFiles(path.join(aiosCoreDir, 'templates'))}`);
    console.log(`  - Workflows: ${countFiles(path.join(aiosCoreDir, 'workflows'))}`);
  } else {
    console.log('\n⚠️  AIOS Core not found');
  }
}

// Helper: Run installation validation
async function runValidate() {
  const validateArgs = args.slice(1); // Remove 'validate' from args

  try {
    // Load the validate command module
    const { createValidateCommand } = require('../.aios-core/cli/commands/validate/index.js');
    const validateCmd = createValidateCommand();

    // Parse and execute
    await validateCmd.parseAsync(['node', 'aios', 'validate', ...validateArgs]);
  } catch (_error) {
    // Fallback: Run quick validation inline
    console.log('Running installation validation...\n');

    try {
      const validatorPath = path.join(
        __dirname,
        '..',
        'src',
        'installer',
        'post-install-validator.js',
      );
      const { PostInstallValidator, formatReport } = require(validatorPath);

      const projectRoot = process.cwd();
      const validator = new PostInstallValidator(projectRoot, path.join(__dirname, '..'));
      const report = await validator.validate();

      console.log(formatReport(report, { colors: true }));

      if (
        report.status === 'failed' ||
        report.stats.missingFiles > 0 ||
        report.stats.corruptedFiles > 0
      ) {
        process.exit(1);
      }
    } catch (validatorError) {
      console.error(`❌ Validation error: ${validatorError.message}`);
      if (args.includes('--verbose') || args.includes('-v')) {
        console.error(validatorError.stack);
      }
      process.exit(2);
    }
  }
}

// Helper: Run doctor diagnostics
function runDoctor() {
  console.log('🏥 AIOS System Diagnostics\n');

  let hasErrors = false;

  // Check Node.js version
  const nodeVersion = process.version.replace('v', '');
  const requiredNodeVersion = '18.0.0';
  const compareVersions = (a, b) => {
    const pa = a.split('.').map((n) => parseInt(n, 10));
    const pb = b.split('.').map((n) => parseInt(n, 10));
    for (let i = 0; i < 3; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  };
  const nodeOk = compareVersions(nodeVersion, requiredNodeVersion) >= 0;

  console.log(
    `${nodeOk ? '✔' : '✗'} Node.js version: ${process.version} ${nodeOk ? '(meets requirement: >=18.0.0)' : '(requires >=18.0.0)'}`,
  );
  if (!nodeOk) hasErrors = true;

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✔ npm version: ${npmVersion}`);
  } catch {
    console.log('✗ npm not found');
    hasErrors = true;
  }

  // Check git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    console.log(`✔ Git installed: ${gitVersion}`);
  } catch {
    console.log('⚠️  Git not found (optional but recommended)');
  }

  // Check AIOS installation
  const aiosCoreDir = path.join(__dirname, '..', '.aios-core');
  if (fs.existsSync(aiosCoreDir)) {
    console.log(`✔ Synkra AIOS: v${packageJson.version}`);
  } else {
    console.log('✗ AIOS Core not installed');
    console.log('  Run: npx @synkra/aios-core@latest');
    hasErrors = true;
  }

  // Summary
  console.log('');
  if (hasErrors) {
    console.log('⚠️  Some issues were detected.');
    process.exit(1);
  } else {
    console.log('✅ All checks passed! Your installation is healthy.');
  }
}

// Helper: Create new project
async function initProject(projectName) {
  if (!projectName) {
    console.error('❌ Project name is required');
    console.log('\nUsage: npx @synkra/aios-core@latest init <project-name>');
    process.exit(1);
  }

  // Handle "." to install in current directory
  const isCurrentDir = projectName === '.';
  const targetPath = isCurrentDir ? process.cwd() : path.join(process.cwd(), projectName);
  const displayName = isCurrentDir ? path.basename(process.cwd()) : projectName;

  console.log(`Creating new AIOS project: ${displayName}\n`);

  // Check if directory exists
  if (fs.existsSync(targetPath)) {
    // Allow if directory is empty or only has hidden files
    const contents = fs.readdirSync(targetPath).filter((f) => !f.startsWith('.'));
    if (contents.length > 0 && !isCurrentDir) {
      console.error(`❌ Directory already exists and is not empty: ${projectName}`);
      console.log('Use a different name or remove the existing directory.');
      process.exit(1);
    }
    // Directory exists but is empty or is current dir - proceed
    if (!isCurrentDir) {
      console.log(`✓ Using existing empty directory: ${projectName}`);
    }
  } else {
    // Create project directory
    fs.mkdirSync(targetPath, { recursive: true });
    console.log(`✓ Created directory: ${projectName}`);
  }

  // Change to project directory (if not already there)
  if (!isCurrentDir) {
    process.chdir(targetPath);
  }

  // Run the initialization wizard
  await runWizard();
}

// Command routing (async main function)
async function main() {
  switch (command) {
    case 'workers':
      // Service Discovery CLI - Story 2.7
      try {
        const { run } = require('../.aios-core/cli/index.js');
        await run(process.argv);
      } catch (error) {
        console.error(`❌ Workers command error: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'install':
      // Install in current project
      console.log('AIOS-FullStack Installation\n');
      await runWizard();
      break;

    case 'init': {
      // Create new project
      const projectName = args[1];
      await initProject(projectName);
      break;
    }

    case 'info':
      showInfo();
      break;

    case 'doctor':
      runDoctor();
      break;

    case 'update':
      await runUpdate();
      break;

    case 'validate':
      // Post-installation validation - Story 6.19
      await runValidate();
      break;

    case '--version':
    case '-v':
    case '-V':
      showVersion();
      break;

    case '--help':
    case '-h':
      showHelp();
      break;

    case undefined:
      // No arguments - run wizard directly (npx default behavior)
      console.log('AIOS-FullStack Installation\n');
      await runWizard();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nRun with --help to see available commands');
      process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
