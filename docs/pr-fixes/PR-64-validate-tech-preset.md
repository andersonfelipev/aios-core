# PR #64 - Validate Tech Preset Command

**URL:** https://github.com/SynkraAI/aios-core/pull/64
**Branch:** `feat/validate-tech-preset`
**Status:** OPEN - UNKNOWN (precisa verificar)
**Criado em:** 2026-02-01

---

## Descrição

Adiciona comando `*validate-tech-preset` ao agente @architect:
- Comando para validar estrutura de presets individuais
- Flag `--all` para validar todos os presets
- Flag `--fix` para criar story quando há problemas
- Task `validate-tech-preset.md` com workflow completo

---

## Arquivos Afetados

| Arquivo | Status | Ação Necessária |
|---------|--------|-----------------|
| `.aios-core/development/agents/architect.md` | ⚠️ VERIFICAR | Pode ter conflito com mudanças do upstream |
| `.aios-core/development/tasks/validate-tech-preset.md` | ✅ OK | Arquivo novo, sem conflito |

---

## Verificações Necessárias

### 1. architect.md
O upstream fez mudanças significativas no `architect.md` (Agent Foundation Refactor). Verificar se:
- [ ] Seção `commands` está no formato correto (novo formato com `name` e `visibility`)
- [ ] Seção `dependencies.tasks` inclui as novas tasks do upstream
- [ ] Não há conflito com outras mudanças

### 2. Formato de Comandos
O upstream mudou o formato dos comandos de:
```yaml
# Formato antigo
commands:
  - validate-tech-preset {name}: Descrição
```

Para:
```yaml
# Formato novo
commands:
  - name: validate-tech-preset
    visibility: [full]
    args: '{name}'
    description: 'Validate tech preset structure'
```

---

## Ações de Correção

### 1. Atualizar branch com upstream
```bash
git checkout feat/validate-tech-preset
git fetch upstream
git rebase upstream/main
```

### 2. Atualizar formato do comando no architect.md

**Adicionar na seção commands:**
```yaml
  # Validation
  - name: validate-tech-preset
    visibility: [full]
    args: '{name}'
    description: 'Validate tech preset structure (--fix to create story)'
  - name: validate-tech-preset-all
    visibility: [full]
    description: 'Validate all tech presets'
```

**Adicionar na seção dependencies.tasks:**
```yaml
  tasks:
    # ... outras tasks ...
    - validate-tech-preset.md
```

### 3. Verificar task file
Confirmar que `validate-tech-preset.md` segue o formato padrão de tasks do AIOS.

---

## Checklist de Correção

- [ ] Fazer rebase com `upstream/main`
- [ ] Atualizar formato do comando para novo padrão (name/visibility/args/description)
- [ ] Verificar seção `dependencies.tasks` inclui `validate-tech-preset.md`
- [ ] Verificar se task file está no formato correto
- [ ] Rodar lint: `npm run lint`
- [ ] Testar comando: ativar @architect e executar `*validate-tech-preset nextjs-react`
- [ ] Push force para atualizar PR

---

## Comandos para Correção

```bash
# 1. Ir para o branch da PR
git checkout feat/validate-tech-preset

# 2. Buscar atualizações do upstream
git fetch upstream

# 3. Rebase
git rebase upstream/main

# 4. Resolver conflitos se houver
# - Editar .aios-core/development/agents/architect.md

# 5. Verificar
npm run lint

# 6. Push force
git push --force origin feat/validate-tech-preset
```

---

## Dependência

Esta PR depende da PR #65 (tech-presets) para funcionar completamente, pois valida presets que são instalados por aquela PR.

**Ordem de merge sugerida:**
1. PR #65 (tech-presets) - primeiro
2. PR #64 (validate-tech-preset) - depois

---

## Prioridade

**MÉDIA** - Funcionalidade complementar à PR #65. Pode ser mergeada independentemente, mas faz mais sentido junto com tech-presets.

---

*Gerado em: 2026-02-02*
*Agente: @devops (Gage)*
