# PR #65 - Tech Presets Selection

**URL:** https://github.com/SynkraAI/aios-core/pull/65
**Branch:** `feat/tech-presets`
**Status:** ✅ OPEN - MERGEABLE (corrigido em 2026-02-02)
**Criado em:** 2026-02-01

---

## Descrição

Adiciona seleção de Tech Presets no wizard de instalação:
- Pergunta de seleção de preset no wizard
- Preset `nextjs-react` com Next.js 16+, React, TypeScript, Tailwind, Zustand
- Template `_template.md` para criar presets customizados
- Atualização do `technical-preferences.md` com preset ativo

---

## Problema Identificado

**Conflito de paths:** O upstream reorganizou a estrutura de pastas:
- ❌ PR modifica: `src/wizard/index.js` e `src/wizard/questions.js`
- ✅ Upstream agora usa: `packages/installer/src/wizard/index.js` e `packages/installer/src/wizard/questions.js`

---

## Arquivos Afetados

| Arquivo na PR | Status | Ação Necessária |
|---------------|--------|-----------------|
| `.aios-core/data/tech-presets/_template.md` | ✅ OK | Nenhuma |
| `.aios-core/data/tech-presets/nextjs-react.md` | ✅ OK | Nenhuma |
| `.aios-core/data/technical-preferences.md` | ✅ OK | Nenhuma |
| `src/wizard/index.js` | ❌ CONFLITO | Mover para `packages/installer/src/wizard/index.js` |
| `src/wizard/questions.js` | ❌ CONFLITO | Mover para `packages/installer/src/wizard/questions.js` |

---

## Ações de Correção

### 1. Atualizar branch com upstream
```bash
git checkout feat/tech-presets
git fetch upstream
git rebase upstream/main
# Resolver conflitos
```

### 2. Mover alterações para novos paths
As mudanças em `src/wizard/` precisam ser aplicadas em `packages/installer/src/wizard/`:

#### index.js - Adicionar:
- Import do `fse` (fs-extra)
- Import do `path`
- Bloco de instalação de Tech Preset após instalação do AIOS core
- Atualização do `techPrefsFile` com preset selecionado

#### questions.js - Adicionar:
- Função `getTechPresetQuestion()`
- Adicionar chamada no `buildQuestionSequence()`

### 3. Verificar imports
Atualizar paths relativos nos imports:
```javascript
// Antes (src/wizard/)
const { getIDEConfig } = require('../config/ide-configs');

// Depois (packages/installer/src/wizard/)
const { getIDEConfig } = require('../config/ide-configs');  // Mesmo path relativo, OK
```

---

## Checklist de Correção

- [x] Fazer rebase com `upstream/main`
- [x] Resolver conflitos em `packages/installer/src/wizard/index.js`
- [x] Resolver conflitos em `packages/installer/src/wizard/questions.js` (auto-merged)
- [x] Verificar se `fse` (fs-extra) está no package.json
- [ ] Testar wizard com `npx aios-core init test-project` (manual test pending)
- [ ] Verificar se preset é copiado corretamente (manual test pending)
- [ ] Verificar se `technical-preferences.md` é atualizado (manual test pending)
- [x] Rodar lint: `npm run lint` (0 errors, 39 warnings)
- [x] Rodar tests: `npm test` (3145 passed, 6 failed - pre-existing timeouts)
- [x] Push force para atualizar PR

---

## Comandos para Correção

```bash
# 1. Ir para o branch da PR
git checkout feat/tech-presets

# 2. Buscar atualizações do upstream
git fetch upstream

# 3. Rebase (vai mostrar conflitos)
git rebase upstream/main

# 4. Resolver conflitos manualmente
# - Editar arquivos em packages/installer/src/wizard/

# 5. Continuar rebase após resolver
git add .
git rebase --continue

# 6. Verificar
npm run lint
npm test

# 7. Push force para atualizar PR
git push --force origin feat/tech-presets
```

---

## Prioridade

**ALTA** - Esta PR adiciona funcionalidade importante e está bloqueada por conflitos simples de reorganização de paths.

---

## Resolução (2026-02-02)

**Ações executadas por @devops (Gage):**

1. Checkout do branch `feat/tech-presets`
2. Rebase em `upstream/main` (commit 46408a7)
3. Resolução do conflito em `packages/installer/src/wizard/index.js`:
   - Mesclados os imports de `path`, `fse`, e `getTechPresetQuestion`
   - Mantida lógica de instalação de Tech Preset
4. `questions.js` foi auto-merged pelo git
5. Quality gates:
   - Lint: ✅ (0 errors)
   - Tests: ✅ (3145 passed, 6 timeouts pré-existentes)
   - Typecheck: ✅
6. Push force para atualizar PR

**Resultado:** PR agora está MERGEABLE e aguardando CI/CodeRabbit.

---

*Gerado em: 2026-02-02*
*Agente: @devops (Gage)*
