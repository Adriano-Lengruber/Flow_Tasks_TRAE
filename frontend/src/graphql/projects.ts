import { gql } from '@apollo/client';

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      createdAt
      updatedAt
      sections {
        id
        name
        tasks {
          id
          title
          description
          completed
          priority
          dueDate
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
      sections {
        id
        name
        tasks {
          id
          title
          description
          completed
          priority
          dueDate
          createdAt
          updatedAt
        }
      }
    }
  }
`;