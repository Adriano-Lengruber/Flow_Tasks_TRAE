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

## Funcionalidades (MVP)

- Autenticação de usuários
- Gerenciamento de projetos
- Quadro Kanban com arrastar e soltar
- Notificações em tempo real

## Roadmap

Consulte o arquivo [Prompt_Base.md](./Prompt_Base.md) para detalhes sobre o roadmap de desenvolvimento.