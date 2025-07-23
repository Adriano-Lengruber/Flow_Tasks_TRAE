import { gql } from '@apollo/client';

export const GET_AUTOMATIONS = gql`
  query GetAutomations($projectId: String) {
    automations(projectId: $projectId) {
      id
      name
      description
      triggerType
      triggerConditions
      actionType
      actionParameters
      isActive
      createdAt
      updatedAt
      executionCount
      lastExecutedAt
      project {
        id
        name
      }
      createdBy {
        id
        name
      }
    }
  }
`;

export const GET_AUTOMATION = gql`
  query GetAutomation($id: String!) {
    automation(id: $id) {
      id
      name
      description
      triggerType
      triggerConditions
      actionType
      actionParameters
      isActive
      createdAt
      updatedAt
      executionCount
      lastExecutedAt
      project {
        id
        name
      }
      createdBy {
        id
        name
      }
    }
  }
`;

export const GET_AUTOMATION_LOGS = gql`
  query GetAutomationLogs($automationId: String!) {
    automationLogs(automationId: $automationId) {
      id
      status
      errorMessage
      triggerData
      actionResult
      relatedTaskId
      executedAt
      executionTimeMs
      triggeredBy {
        id
        name
      }
    }
  }
`;

export const CREATE_AUTOMATION = gql`
  mutation CreateAutomation($input: CreateAutomationInput!) {
    createAutomation(createAutomationInput: $input) {
      id
      name
      description
      triggerType
      triggerConditions
      actionType
      actionParameters
      isActive
    }
  }
`;

export const UPDATE_AUTOMATION = gql`
  mutation UpdateAutomation($id: String!, $input: UpdateAutomationDto!) {
    updateAutomation(id: $id, updateAutomationInput: $input) {
      id
      name
      description
      triggerType
      triggerConditions
      actionType
      actionParameters
      isActive
    }
  }
`;

export const TOGGLE_AUTOMATION_ACTIVE = gql`
  mutation ToggleAutomationActive($id: String!) {
    toggleAutomationActive(id: $id) {
      id
      isActive
    }
  }
`;

export const REMOVE_AUTOMATION = gql`
  mutation RemoveAutomation($id: String!) {
    removeAutomation(id: $id)
  }
`;