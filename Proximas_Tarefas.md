# Próximas Tarefas - Fusion Flow

Este documento serve como um guia prático e conciso para as próximas etapas de desenvolvimento do projeto Fusion Flow.

## Prioridades Imediatas

### 1. Refinamento do MVP

- [ ] **Testes Automatizados**
  - [ ] Implementar testes unitários para os resolvers do backend
  - [ ] Implementar testes de integração para fluxos críticos
  - [ ] Configurar CI/CD para execução automática de testes

- [ ] **Melhorias de UX**
  - [ ] Adicionar feedback visual para operações de arrastar e soltar no Kanban
  - [ ] Melhorar a responsividade para dispositivos móveis
  - [ ] Implementar temas claro/escuro

- [ ] **Otimizações de Performance**
  - [ ] Implementar paginação para listas de projetos e tarefas
  - [ ] Otimizar queries GraphQL com seleção de campos
  - [ ] Configurar cache no Apollo Client

### 2. Módulo de Automações (Fase 2)

- [ ] **Backend**
  - [ ] Criar modelo de dados para regras de automação
  - [ ] Implementar resolvers GraphQL para CRUD de automações
  - [ ] Desenvolver motor de execução de regras

- [ ] **Frontend**
  - [ ] Criar interface para configuração de gatilhos (triggers)
  - [ ] Desenvolver seletor de condições
  - [ ] Implementar seletor de ações

### 3. Visualização Gantt (Fase 2)

- [ ] **Frontend**
  - [ ] Pesquisar e selecionar biblioteca para gráfico de Gantt
  - [ ] Implementar componente básico de visualização
  - [ ] Integrar com dados de tarefas existentes

- [ ] **Backend**
  - [ ] Adicionar campos necessários para timeline
  - [ ] Criar endpoints otimizados para dados de Gantt

### 4. Preparação para Mobile

- [ ] **Setup Inicial**
  - [ ] Configurar projeto React Native
  - [ ] Configurar navegação e estrutura básica
  - [ ] Implementar autenticação

- [ ] **Componentes Core**
  - [ ] Adaptar visualização de projetos
  - [ ] Implementar versão simplificada do Kanban
  - [ ] Criar componente de notificações

## Recursos e Referências

- [Documentação do NestJS](https://docs.nestjs.com/)
- [Documentação do Apollo GraphQL](https://www.apollographql.com/docs/)
- [Documentação do React](https://reactjs.org/docs/getting-started.html)
- [Documentação do TypeORM](https://typeorm.io/)
- [Documentação do DND Kit](https://docs.dndkit.com/)

## Comandos Úteis

```bash
# Iniciar todos os serviços de desenvolvimento
npm run dev

# Iniciar apenas o backend
cd backend && npm run start:dev

# Iniciar apenas o frontend
cd frontend && npm run start

# Iniciar serviços de banco de dados
docker-compose up -d
```

## Notas

- Priorizar a implementação do módulo de automações, pois é um diferencial importante do produto
- Considerar a experiência mobile desde o início ao desenvolver novos componentes
- Manter a arquitetura modular para facilitar a adição de novos recursos
- Documentar APIs e componentes à medida que são desenvolvidos