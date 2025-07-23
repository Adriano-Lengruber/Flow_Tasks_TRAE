# Fusion Flow

Plataforma de gestão de projetos unificada que combina a simplicidade do Trello, as automações do Asana, a customização do monday.com, os workflows do Jira, as análises do Wrike e a documentação do ClickUp.

## Arquitetura e Stack Tecnológica

| Componente      | Tecnologia Principal        | Detalhes                               |
|-----------------|-----------------------------|----------------------------------------|
| **Frontend**    | React 18 & React Native 0.72| TypeScript, Redux Toolkit              |
| **Backend**     | Node.js 20 & NestJS         | GraphQL (Apollo Server)                |
| **Banco de Dados**| PostgreSQL & MongoDB        | PostgreSQL para dados relacionais, MongoDB para conteúdo dinâmico |
| **Infraestrutura**| Docker & Kubernetes         | Deploy na AWS (ECS), Redis para cache  |

## Estrutura do Projeto

Este projeto utiliza uma arquitetura de monorepo gerenciada pelo Turborepo:

```
/
├── backend/         # API NestJS com GraphQL
├── frontend/        # Aplicação React
├── docker-compose.yml  # Configuração dos serviços
└── turbo.json       # Configuração do Turborepo
```

## Requisitos

- Node.js 20+
- Docker e Docker Compose
- npm ou yarn

## Instalação

1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd fusion-flow
```

2. Instale as dependências

```bash
npm install
```

3. Inicie os serviços de banco de dados

```bash
docker-compose up -d
```

4. Inicie o projeto em modo de desenvolvimento

```bash
npm run dev
```

Isso iniciará tanto o backend quanto o frontend em modo de desenvolvimento.

- Backend: http://localhost:3000
- Frontend: http://localhost:3001

## Funcionalidades Implementadas

### MVP + Fase 2 - ✅ CONCLUÍDO
- ✅ **Autenticação completa** com JWT e refresh tokens
- ✅ **Gerenciamento de projetos** com CRUD completo via GraphQL
- ✅ **Quadro Kanban avançado** com:
  - Drag & drop com feedback visual em tempo real
  - DragOverlay com preview da tarefa
  - Animações suaves e transições CSS
  - Estados de loading elegantes
  - Notificações visuais durante operações
- ✅ **Notificações em tempo real** com WebSockets
- ✅ **Módulo de Automações** completo (IFTTT-style)
- ✅ **Visualização Gantt** interativa
- ✅ **Temas claro/escuro** com persistência
- ✅ **101 testes automatizados** com cobertura robusta

### Próximas Funcionalidades
- 🔄 **Responsividade mobile** (em desenvolvimento)
- 📊 **Módulo de métricas** e dashboard
- 📱 **Aplicativo mobile** (React Native)
- 🤖 **Assistente de IA** para sugestões
- 🔗 **Integrações externas** (Slack, Teams)

## Documentação

- [Prompt_Base.md](./Prompt_Base.md) - Plano original e arquitetura
- [Status_Projeto.md](./Status_Projeto.md) - Status atual detalhado
- [Proximas_Tarefas.md](./Proximas_Tarefas.md) - Próximas prioridades
- [backend/TESTING.md](./backend/TESTING.md) - Guia de testes

## Scripts Úteis

```bash
# Executar todos os testes
npm run test

# Executar testes do backend
cd backend && npm run test

# Executar testes de integração
cd backend && npm run test:integration

# Executar testes de performance
cd backend && npm run test:performance

# Seed do banco de dados
cd backend && npm run seed
```