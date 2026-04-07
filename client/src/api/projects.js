import client from './client';

/**
 * Project API
 */

export function listProjects(workspaceId, params = {}) {
  return client.get(`/workspaces/${workspaceId}/projects`, { params });
}

export function getProject(projectId) {
  return client.get(`/projects/${projectId}`);
}

export function createProject(workspaceId, { name, description, color }) {
  return client.post(`/workspaces/${workspaceId}/projects`, {
    name,
    description,
    color,
  });
}

export function updateProject(projectId, { name, description, color, status }) {
  return client.put(`/projects/${projectId}`, {
    name,
    description,
    color,
    status,
  });
}

export function deleteProject(projectId) {
  return client.delete(`/projects/${projectId}`);
}

export function archiveProject(projectId) {
  return client.post(`/projects/${projectId}/archive`);
}

export function unarchiveProject(projectId) {
  return client.post(`/projects/${projectId}/unarchive`);
}

export function getProjectActivity(projectId, params = {}) {
  return client.get(`/projects/${projectId}/activity`, { params });
}

export function getProjectStats(projectId) {
  return client.get(`/projects/${projectId}/stats`);
}

export function duplicateProject(projectId, { name }) {
  return client.post(`/projects/${projectId}/duplicate`, { name });
}
