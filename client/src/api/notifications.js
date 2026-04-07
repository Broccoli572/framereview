import client from './client';

/**
 * Notification API
 */

export function listNotifications(params = {}) {
  const { page = 1, per_page = 20, type, read } = params;
  return client.get('/notifications', {
    params: { page, per_page, type, read },
  });
}

export function getUnreadCount() {
  return client.get('/notifications/unread-count');
}

export function markAsRead(notificationId) {
  return client.post(`/notifications/${notificationId}/read`);
}

export function markAllAsRead() {
  return client.post('/notifications/read-all');
}

export function deleteNotification(notificationId) {
  return client.delete(`/notifications/${notificationId}`);
}

export function getNotificationPreferences() {
  return client.get('/notifications/preferences');
}

export function updateNotificationPreferences(preferences) {
  return client.put('/notifications/preferences', preferences);
}
