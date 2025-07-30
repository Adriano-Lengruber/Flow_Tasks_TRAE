# Plano de Correção de Erros - Frontend React

## Resumo dos Erros Identificados

Análise completa dos erros encontrados no arquivo `ERROS_TERMINAL_30_07_25.md` com categorização e priorização para correção sistemática.

## 🔴 ERROS CRÍTICOS (Impedem Compilação)

### 1. Importação Inexistente - LessThan
**Arquivo:** `src/components/reports/FilterConfiguration.tsx` (linha 41)
**Erro:** `'LessThan' is not exported from 'lucide-react'`
**Prioridade:** ALTA
**Solução:** Substituir por ícone existente (ex: `ChevronLeft` ou `ArrowLeft`)

### 2. Módulo recharts não encontrado
**Arquivo:** `src/components/reports/ReportVisualization.tsx` (linha 16)
**Erro:** `Cannot find module 'recharts' or its corresponding type declarations`
**Prioridade:** ALTA
**Solução:** Instalar recharts: `npm install recharts @types/recharts`

### 3. Propriedade 'description' inexistente
**Arquivo:** `src/components/reports/FilterConfiguration.tsx` (linha 737)
**Erro:** `'description' does not exist in type 'Partial<TemplateFilter>'`
**Prioridade:** ALTA
**Solução:** Adicionar propriedade `description` à interface `TemplateFilter`

### 4. Propriedade 'onFiltersChange' inexistente
**Arquivo:** `src/components/reports/FilterConfiguration.tsx` (linha 756)
**Erro:** `Property 'onFiltersChange' does not exist on type 'FilterConfigurationProps'`
**Prioridade:** ALTA
**Solução:** Adicionar propriedade à interface `FilterConfigurationProps`

## 🟡 AVISOS ESLINT (Não impedem compilação)

### Variáveis/Imports Não Utilizados

#### Components/Layout
- `MainLayout.tsx` (linha 50): `isTablet` não utilizado

#### Components/Notifications
- `NotificationPreferences.tsx` (linha 15): `Button` não utilizado
- `NotificationsProvider.tsx` (linhas 104, 111): `joinProjectRoom`, `leaveProjectRoom` não utilizados

#### Components/Common
- `LoadingSkeleton.tsx` (linha 20): `theme` não utilizado
- `MobileOptimizedModal.tsx` (linhas 12-13): `Paper`, `Box` não utilizados
- `OfflineIndicator.tsx` (linha 26): `getStats` não utilizado
- `ResponsiveModal.tsx` (linhas 3-17, 34, 55): Múltiplos imports e variáveis não utilizados

#### Components/Reports
- `CollaborationPanel.tsx` (linhas 12-203): Múltiplos imports e variáveis não utilizados
- `FieldConfiguration.tsx` (linhas 34-94): Múltiplos imports não utilizados

#### Components/UI
- `alert.tsx` (linha 39): Problema de acessibilidade - heading sem conteúdo

#### Contexts
- `ThemeContext.tsx` (linha 209): `systemPrefersDark` não utilizado

#### Hooks
- `useOfflineSync.ts` (linhas 79-226): Múltiplas dependências faltando em useEffect/useCallback
- `useReportBuilder.ts` (linhas 131-510): Múltiplas variáveis não utilizadas

#### Pages
- `AdminDashboard.tsx` (linhas 23-242): Múltiplos imports e variáveis não utilizados
- `Automations.tsx` (linhas 14-58): Múltiplos imports e variáveis não utilizados
- `Dashboard.tsx` (linhas 1-5): Múltiplos imports não utilizados
- `Login.tsx`, `NotFound.tsx`, `Register.tsx`: Imports não utilizados
- `ProjectDetail.tsx` (linhas 1-556): Múltiplos imports e variáveis não utilizados
- `Projects.tsx` (linha 91): `deleteLoading` não utilizado
- `ReportBuilderPage.tsx` (linhas 23-284): Múltiplos imports e variáveis não utilizados
- `Tasks.tsx` (linha 123): `user` não utilizado

#### Services
- `adminApi.ts` (linhas 78-79): `testTypes`, `statuses` não utilizados

### Problemas de React Hooks
- Dependências faltando em arrays de dependência de useEffect/useCallback
- Expressões que podem causar re-renders desnecessários

### Redeclarações
- `CollaborationPanel.tsx` (linhas 93, 120): `User` e `Activity` redefinidos

## 📋 PLANO DE EXECUÇÃO

### Fase 1: Correção de Erros Críticos (Prioridade ALTA)
1. ✅ Corrigir importação `LessThan` → substituir por ícone válido
2. ✅ Instalar dependência `recharts`
3. ✅ Adicionar propriedade `description` à interface `TemplateFilter`
4. ✅ Adicionar propriedade `onFiltersChange` à interface `FilterConfigurationProps`

### Fase 2: Limpeza de Imports e Variáveis Não Utilizados (Prioridade MÉDIA)
1. Remover imports não utilizados de todos os arquivos
2. Remover variáveis declaradas mas não utilizadas
3. Corrigir redeclarações de variáveis

### Fase 3: Correção de Hooks e Dependências (Prioridade MÉDIA)
1. Adicionar dependências faltantes em arrays de useEffect/useCallback
2. Otimizar expressões que causam re-renders
3. Implementar useMemo onde necessário

### Fase 4: Melhorias de Acessibilidade (Prioridade BAIXA)
1. Corrigir problema de heading sem conteúdo em `alert.tsx`
2. Revisar outros problemas de acessibilidade

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

1. **IMEDIATO:** Corrigir erros críticos (Fase 1)
2. **CURTO PRAZO:** Limpeza de código (Fase 2)
3. **MÉDIO PRAZO:** Otimização de hooks (Fase 3)
4. **LONGO PRAZO:** Melhorias de acessibilidade (Fase 4)

## 📊 ESTATÍSTICAS

- **Erros Críticos:** 4
- **Avisos ESLint:** ~150+
- **Arquivos Afetados:** ~25
- **Tempo Estimado:** 4-6 horas

## ✅ STATUS DE CORREÇÃO

- [ ] Fase 1: Erros Críticos
- [ ] Fase 2: Limpeza de Código
- [ ] Fase 3: Otimização de Hooks
- [ ] Fase 4: Acessibilidade

---

**Última Atualização:** 30/07/2025
**Responsável:** Assistente AI
**Próxima Revisão:** Após correção da Fase 1