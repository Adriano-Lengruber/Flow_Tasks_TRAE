import { gql } from '@apollo/client';

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Float = 50, $offset: Float = 0) {
    notifications(limit: $limit, offset: $offset) {
      id
      type
      message
      read
      entityId
      entityType
      createdAt
      updatedAt
    }
  }
`;

export const GET_UNREAD_NOTIFICATIONS_COUNT = gql`
  query GetUnreadNotificationsCount {
    unreadNotificationsCount
  }
`;

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($notificationId: String!) {
    markNotificationAsRead(notificationId: $notificationId)
  }
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;

export const CLEAR_ALL_NOTIFICATIONS = gql`
  mutation ClearAllNotifications {
    clearAllNotifications
  }
`;

export const GET_NOTIFICATION_PREFERENCES = gql`
  query GetNotificationPreferences {
    notificationPreferences {
      id
      taskAssigned
      taskCompleted
      taskMoved
      taskComment
      projectCreated
      projectUpdated
      deadlineApproaching
      emailNotifications
      pushNotifications
    }
  }
`;

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: UpdateNotificationPreferencesInput!) {
    updateNotificationPreferences(updateNotificationPreferencesInput: $input) {
      id
      taskAssigned
      taskCompleted
      taskMoved
      taskComment
      projectCreated
      projectUpdated
      deadlineApproaching
      emailNotifications
      pushNotifications
    }
  }
`;