import { gql } from '@apollo/client';

// Query paginada para projetos com campos otimizados
export const GET_PROJECTS_PAGINATED = gql`
  query GetProjectsPaginated($pagination: PaginationInput) {
    projectsPaginated(pagination: $pagination) {
      items {
        id
        name
        description
        createdAt
        updatedAt
        owner {
          id
          name
          email
        }
        # Carregar apenas contadores para performance
        sections {
          id
          name
          tasks {
            id
            completed
          }
        }
      }
      total
      hasMore
      offset
      limit
    }
  }
`;

// Query paginada para tarefas com campos otimizados
export const GET_TASKS_PAGINATED = gql`
  query GetTasksPaginated($projectId: ID!, $pagination: PaginationInput) {
    tasksPaginated(projectId: $projectId, pagination: $pagination) {
      items {
        id
        title
        description
        completed
        priority
        dueDate
        createdAt
        updatedAt
        assignee {
          id
          name
          email
        }
        section {
          id
          name
        }
        # Carregar apenas contadores de comentários
        comments {
          id
        }
      }
      total
      hasMore
      offset
      limit
    }
  }
`;

// Query otimizada para detalhes do projeto (sem over-fetching)
export const GET_PROJECT_OPTIMIZED = gql`
  query GetProjectOptimized($id: ID!) {
    project(id: $id) {
      id
      name
      description
      startDate
      endDate
      createdAt
      updatedAt
      owner {
        id
        name
        email
      }
      sections {
        id
        name
        createdAt
        # Carregar apenas estatísticas das tarefas
        tasks {
          id
          completed
          priority
        }
      }
    }
  }
`;

// Query para estatísticas rápidas (dashboard)
export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    projects {
      id
      name
      sections {
        id
        tasks {
          id
          completed
          priority
          dueDate
        }
      }
    }
  }
`;

// Query otimizada para seção específica com tarefas
export const GET_SECTION_WITH_TASKS = gql`
  query GetSectionWithTasks($id: ID!) {
    section(id: $id) {
      id
      name
      createdAt
      tasks {
        id
        title
        description
        completed
        priority
        dueDate
        assignee {
          id
          name
          email
        }
        # Carregar apenas contadores
        comments {
          id
        }
      }
    }
  }
`;

// Query para busca rápida de projetos (typeahead)
export const SEARCH_PROJECTS = gql`
  query SearchProjects($pagination: PaginationInput) {
    projectsPaginated(pagination: $pagination) {
      items {
        id
        name
        description
      }
      total
      hasMore
    }
  }
`;

// Fragment para dados básicos do usuário (reutilização)
export const USER_BASIC_FRAGMENT = gql`
  fragment UserBasic on User {
    id
    name
    email
  }
`;

// Fragment para estatísticas de tarefa (reutilização)
export const TASK_STATS_FRAGMENT = gql`
  fragment TaskStats on Task {
    id
    completed
    priority
    dueDate
  }
`;