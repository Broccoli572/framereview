import client from './client';

/**
 * Admin API
 */

export function getAdminStats() {
  return client.get('/admin/stats');
}

export function getActivityLogs(params = {}) {
  const { page = 1, per_page = 50, user_id, action, resource_type, date_from, date_to } = params;
  return client.get('/admin/activity-logs', {
    params: { page, per_page, user_id, action, resource_type, date_from, date_to },
  });
}

export function listUsers(params = {}) {
  const { page = 1, per_page = 50, search, role, status } = params;
  return client.get('/admin/users', {
    params: { page, per_page, search, role, status },
  });
}

export function getUser(userId) {
  return client.get(`/admin/users/${userId}`);
}

export function updateUser(userId, { name, email, role, status }) {
  return client.put(`/admin/users/${userId}`, { name, email, role, status });
}

export function deleteUser(userId) {
  return client.delete(`/admin/users/${userId}`);
}

export function listAllWorkspaces(params = {}) {
  const { page = 1, per_page = 50, search } = params;
  return client.get('/admin/workspaces', {
    params: { page, per_page, search },
  });
}

export function listAllProjects(params = {}) {
  const { page = 1, per_page = 50, search, status } = params;
  return client.get('/admin/projects', {
    params: { page, per_page, search, status },
  });
}

export function getSystemHealth() {
  return client.get('/admin/health');
}

export function getSystemSettings() {
  return client.get('/admin/settings');
}

export function updateSystemSettings(settings) {
  return client.put('/admin/settings', settings);
}
