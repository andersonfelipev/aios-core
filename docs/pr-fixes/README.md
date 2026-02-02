# PR Fixes - Correções Pendentes

Documentação das correções necessárias para PRs abertas no upstream `SynkraAI/aios-core`.

---

## Status das PRs

| PR | Título | Status | Prioridade | Correção |
|----|--------|--------|------------|----------|
| [#65](https://github.com/SynkraAI/aios-core/pull/65) | Tech Presets Selection | ❌ CONFLICTING | ALTA | [PR-65-tech-presets.md](./PR-65-tech-presets.md) |
| [#64](https://github.com/SynkraAI/aios-core/pull/64) | Validate Tech Preset | ⚠️ VERIFICAR | MÉDIA | [PR-64-validate-tech-preset.md](./PR-64-validate-tech-preset.md) |

---

## Causa Raiz dos Conflitos

O upstream (`SynkraAI/aios-core`) fez uma **reorganização de estrutura** após as PRs serem criadas:

```
# Antes (quando PRs foram criadas)
src/wizard/index.js
src/wizard/questions.js

# Depois (estrutura atual do upstream)
packages/installer/src/wizard/index.js
packages/installer/src/wizard/questions.js
```

---

## Ordem de Correção Sugerida

1. **PR #65 (tech-presets)** - Corrigir primeiro
   - Tem conflitos de path que precisam ser resolvidos
   - É a base para a PR #64 funcionar

2. **PR #64 (validate-tech-preset)** - Corrigir depois
   - Depende dos presets da PR #65
   - Pode ter conflitos menores no architect.md

---

## Workflow de Correção

```bash
# Para cada PR:
git checkout <branch-da-pr>
git fetch upstream
git rebase upstream/main
# Resolver conflitos
git add .
git rebase --continue
npm run lint
npm test
git push --force origin <branch-da-pr>
```

---

*Última atualização: 2026-02-02*
