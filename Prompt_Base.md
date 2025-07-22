# Prompt Base: Guia de Desenvolvimento para "Fusion_Flow"

## 1. Visão do Produto

**Objetivo Principal**: Construir uma plataforma de gestão de projetos unificada (web e mobile) que combine a simplicidade do Trello, as automações do Asana, a customização do monday.com, os workflows do Jira, as análises do Wrike e a documentação do ClickUp.

**Princípios Orientadores**:
- **UX Intuitiva**: Ações críticas devem ser concluídas em menos de 3 cliques.
- **Arquitetura Modular**: O sistema deve ser escalável e permitir a adição de novas funcionalidades de forma independente.
- **Customização Controlada**: Oferecer flexibilidade sem sobrecarregar o usuário com complexidade.

---

## 2. Arquitetura e Stack Tecnológica

| Componente      | Tecnologia Principal        | Detalhes                               |
|-----------------|-----------------------------|----------------------------------------|
| **Frontend**    | React 18 & React Native 0.72| TypeScript, Redux Toolkit              |
| **Backend**     | Node.js 20 & NestJS         | GraphQL (Apollo Server)                |
| **Banco de Dados**| PostgreSQL & MongoDB        | PostgreSQL para dados relacionais, MongoDB para conteúdo dinâmico (automações, documentos) |
| **Infraestrutura**| Docker & Kubernetes         | Deploy na AWS (ECS), Redis para cache  |

---

## 3. Plano de Desenvolvimento (Roadmap)

O desenvolvimento será dividido em fases, começando com o Mínimo Produto Viável (MVP) e evoluindo com funcionalidades avançadas.

### **Fase 1: MVP - O Núcleo Funcional (Nosso Foco Inicial)**

**Meta**: Lançar a funcionalidade essencial que permite aos usuários criar projetos, gerenciar tarefas em um quadro Kanban e receber notificações.

**Módulos a serem desenvolvidos:**

1.  **Setup Inicial do Projeto:**
    -   [ ] Configurar monorepo (ex: Turborepo ou Lerna).
    -   [ ] Estruturar diretórios para `backend` e `frontend` (web/mobile).
    -   [ ] Configurar Docker (`docker-compose.yml`) para ambiente de desenvolvimento local (Node.js, Postgres, Redis, Mongo).

2.  **Módulo de Autenticação (Backend & Frontend):**
    -   [ ] **Backend**: Implementar endpoints para registro, login e validação de usuário usando JWT (com refresh tokens).
    -   [ ] **Backend**: Criar `User` model no PostgreSQL.
    -   [ ] **Frontend**: Criar telas de Login/Registro.
    -   [ ] **Frontend**: Implementar lógica de armazenamento de token e rotas protegidas.

3.  **Módulo de Projetos e Tarefas (CRUD Básico):**
    -   [ ] **Backend**: Definir schemas GraphQL para `Project`, `Section`, e `Task`.
    -   [ ] **Backend**: Implementar resolvers para criar, ler, atualizar e deletar projetos e tarefas.
    -   [ ] **Backend**: Modelar entidades no PostgreSQL.

4.  **Módulo de Visualização - Kanban:**
    -   [ ] **Frontend**: Criar o componente de quadro Kanban.
    -   [ ] **Frontend**: Integrar com o backend para buscar e exibir projetos/tarefas.
    -   [ ] **Frontend**: Implementar a funcionalidade de arrastar e soltar (drag-and-drop) com `react-beautiful-dnd` para mover tarefas entre seções.
    -   [ ] **Backend**: Criar mutação GraphQL para atualizar o status/seção da tarefa ao ser movida.

5.  **Módulo de Notificações em Tempo Real:**
    -   [ ] **Backend**: Integrar `Socket.io` ou `GraphQL Subscriptions` para notificar usuários sobre alterações (ex: nova tarefa, mudança de status).
    -   [ ] **Frontend**: Implementar a escuta desses eventos para atualizar a UI em tempo real sem a necessidade de recarregar a página.

### **Fase 2: Fluxos Avançados**

-   [ ] **Módulo de Automações**: Editor visual para criar regras IFTTT.
-   [ ] **Módulo de Visualização - Gantt**: Gráfico de Gantt interativo.
-   [ ] **Módulo de Métricas**: Dashboard com KPIs (Burndown, carga de trabalho, etc.).
-   [ ] **Mobile**: Foco em experiência offline-first.

### **Fase 3: Otimizações e Inteligência**

-   [ ] **Assistente de IA**: Sugestões para priorização de tarefas.
-   [ ] **Templates**: Modelos de projetos pré-configurados.
-   [ ] **Integrações**: Bots para Slack e Microsoft Teams.

---

## 4. Próximos Passos Imediatos

Nossa primeira ação será focar na **Fase 1, Tarefa 1: Setup Inicial do Projeto**.

1.  **Criar a estrutura de diretórios do projeto.**
2.  **Inicializar o `package.json` na raiz.**
3.  **Configurar o `docker-compose.yml` para os serviços de banco de dados e backend.**

Este documento servirá como nossa fonte da verdade. Vamos atualizá-lo à medida que progredimos.