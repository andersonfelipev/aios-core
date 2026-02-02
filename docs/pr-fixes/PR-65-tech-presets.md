# PR #65 - Tech Presets Selection

**URL:** https://github.com/SynkraAI/aios-core/pull/65
**Branch:** `feat/tech-presets`
**Status:** OPEN - CONFLICTING
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

- [ ] Fazer rebase com `upstream/main`
- [ ] Resolver conflitos em `packages/installer/src/wizard/index.js`
- [ ] Resolver conflitos em `packages/installer/src/wizard/questions.js`
- [ ] Verificar se `fse` (fs-extra) está no package.json
- [ ] Testar wizard com `npx aios-core init test-project`
- [ ] Verificar se preset é copiado corretamente
- [ ] Verificar se `technical-preferences.md` é atualizado
- [ ] Rodar lint: `npm run lint`
- [ ] Rodar tests: `npm test`
- [ ] Push force para atualizar PR

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

*Gerado em: 2026-02-02*
*Agente: @devops (Gage)*
