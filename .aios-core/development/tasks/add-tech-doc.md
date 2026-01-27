---
tools:
  - file-reader
utils:
  - template-engine
---

# Add Tech Doc - Create Tech Preset from Documentation

## Purpose

Transform an existing documentation file (.md) into an AIOS tech-preset, automatically extracting patterns, standards, and structures.

## Command Pattern

```
*add-tech-doc <file-path> [preset-name]
```

## Parameters

- `file-path`: Path to the source .md file (required)
- `preset-name`: Name for the new preset (optional, derived from file if not provided)

## Examples

```bash
# Create preset from local documentation
*add-tech-doc docs/laravel-guide.md laravel

# Create preset from project file (auto-detect name)
*add-tech-doc DEVELOPMENT_GUIDE.md

# Create preset with custom name
*add-tech-doc architecture-standards.md custom-stack
```

---

## Execution Modes

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)

- Extracts all sections automatically
- Generates preset without confirmation
- **Best for:** Well-structured source documents

### 2. Interactive Mode - Balanced (3-5 prompts) **[DEFAULT]**

- Confirms extracted sections
- Asks for missing information
- **Best for:** Documents that need interpretation

### 3. Pre-Flight Planning

- Full analysis before generation
- **Best for:** Complex or ambiguous documents

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: addTechDoc()
responsável: Orion (Orchestrator)
responsavel_type: Agente
atomic_layer: Template

**Entrada:**
- campo: file_path
  tipo: string
  origem: User Input
  obrigatório: true
  validação: Must be valid .md file path

- campo: preset_name
  tipo: string
  origem: User Input
  obrigatório: false
  validação: lowercase, kebab-case

- campo: mode
  tipo: string
  origem: User Input
  obrigatório: false
  validação: yolo|interactive|pre-flight

**Saída:**
- campo: preset_file
  tipo: string
  destino: .aios-core/data/tech-presets/{preset_name}.md
  persistido: true

- campo: preferences_updated
  tipo: boolean
  destino: .aios-core/data/technical-preferences.md
  persistido: true
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Source file exists and is readable
    tipo: pre-condition
    blocker: true
    error_message: "Source file not found or not readable"

  - [ ] Preset name does not already exist (or --force flag)
    tipo: pre-condition
    blocker: true
    error_message: "Preset already exists. Use --force to overwrite"

  - [ ] Template file exists at .aios-core/data/tech-presets/_template.md
    tipo: pre-condition
    blocker: true
    error_message: "Template file not found"
```

---

## Execution Steps

### Step 1: Read and Analyze Source Document

```yaml
action: read_source
instruction: |
  1. Read the source .md file completely
  2. Identify the main sections and their content
  3. Look for these key elements:
     - Technology stack mentions (frameworks, libraries, versions)
     - Design patterns (with code examples)
     - Project structure (folder trees)
     - Coding standards (naming conventions, rules)
     - Testing strategy (what to test, coverage)
     - File templates (code snippets)

  4. Create a mapping of found elements to preset sections
```

### Step 2: Extract Metadata

```yaml
action: extract_metadata
instruction: |
  From the source document, derive:

  1. **preset.id**: kebab-case name (from preset_name param or filename)
  2. **preset.name**: Human-readable title
  3. **preset.technologies**: List of technologies mentioned
  4. **preset.suitable_for**: Project types this applies to
  5. **preset.not_suitable_for**: Project types to avoid

  If information is missing, use Interactive Mode to ask user.
```

### Step 3: Map Content to Preset Sections

```yaml
action: map_sections
instruction: |
  Map source content to preset template sections:

  | Source Content | Preset Section |
  |----------------|----------------|
  | Framework/library mentions | Tech Stack table |
  | Pattern explanations + code | Design Patterns section |
  | Folder structure diagrams | Project Structure section |
  | Naming rules, conventions | Coding Standards section |
  | Test instructions | Testing Strategy section |
  | Code snippets, templates | File Templates section |
  | Error handling patterns | Error Handling section |
  | Performance tips | Performance Guidelines section |

  For each mapping:
  1. Extract relevant content from source
  2. Reformat to match preset template structure
  3. Add missing sections with placeholder content marked [TODO]
```

### Step 4: Generate Preset File

```yaml
action: generate_preset
instruction: |
  1. Load the template from .aios-core/data/tech-presets/_template.md
  2. Fill in each section with extracted/mapped content
  3. Format code blocks with correct language tags
  4. Ensure all required sections are present
  5. Add changelog entry with current date

  Output format:
  - Maintain markdown structure from template
  - Use proper heading hierarchy
  - Include all code examples with syntax highlighting
```

### Step 5: Save Preset File

```yaml
action: save_preset
instruction: |
  1. Save to: .aios-core/data/tech-presets/{preset_name}.md
  2. Verify file was created successfully
  3. Display confirmation with file path
```

### Step 6: Update Technical Preferences

```yaml
action: update_preferences
instruction: |
  1. Read .aios-core/data/technical-preferences.md
  2. Add new entry to "Available Presets" table:
     | `{preset_name}` | {technologies} | {suitable_for} |
  3. Save updated file
  4. Display confirmation
```

### Step 7: Summary Report

```yaml
action: report
instruction: |
  Display summary:

  ## Tech Preset Created Successfully

  **Preset:** {preset_name}
  **Location:** .aios-core/data/tech-presets/{preset_name}.md

  ### Extracted Sections:
  - [ ] Metadata: {status}
  - [ ] Design Patterns: {count} patterns
  - [ ] Project Structure: {status}
  - [ ] Tech Stack: {count} technologies
  - [ ] Coding Standards: {status}
  - [ ] Testing Strategy: {status}
  - [ ] File Templates: {count} templates

  ### TODO Items:
  {list of [TODO] sections that need manual completion}

  ### Next Steps:
  1. Review the generated preset
  2. Complete any [TODO] sections
  3. Test with `@architect *create-doc architecture`
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Preset file exists at expected location
    tipo: post-condition
    blocker: true
    error_message: "Preset file was not created"

  - [ ] technical-preferences.md contains new preset entry
    tipo: post-condition
    blocker: false
    error_message: "Warning: preferences not updated, update manually"
```

---

## Error Handling

### Common Errors

| Error            | Cause              | Resolution                           |
| ---------------- | ------------------ | ------------------------------------ |
| File not found   | Invalid path       | Verify file path and try again       |
| Preset exists    | Name conflict      | Use --force or choose different name |
| Parse error      | Malformed markdown | Check source file structure          |
| Missing sections | Incomplete source  | Fill [TODO] sections manually        |

---

## Integration Points

### With Architect Agent

```bash
# After creating preset, architect can use it
@architect *create-doc architecture
# Template will show new preset in selection
```

### With Dev Agent

```bash
# Dev can reference preset patterns
@dev "Follow the {preset_name} preset patterns"
```

---

## Metadata

```yaml
version: 1.0.0
created: 2025-01-27
author: aios-master
tags:
  - tech-preset
  - documentation
  - automation
dependencies:
  - .aios-core/data/tech-presets/_template.md
  - .aios-core/data/technical-preferences.md
```
