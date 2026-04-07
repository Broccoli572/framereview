import client from './client';

/**
 * Workspace API
 */

export function listWorkspaces() {
  return client.get('/workspaces');
}

export function getWorkspace(workspaceId) {
  return client.get(`/workspaces/${workspaceId}`);
}

export function createWorkspace({ name, description }) {
  return client.post('/workspaces', { name, description });
}

export function updateWorkspace(workspaceId, { name, description, avatar }) {
  return client.put(`/workspaces/${workspaceId}`, { name, description, avatar });
}

export function deleteWorkspace(workspaceId) {
  return client.delete(`/workspaces/${workspaceId}`);
}

export function inviteToWorkspace(workspaceId, { email, role }) {
  return client.post(`/workspaces/${workspaceId}/invites`, { email, role });
}

export function listWorkspaceInvites(workspaceId) {
  return client.get(`/workspaces/${workspaceId}/invites`);
}

export function cancelWorkspaceInvite(workspaceId, inviteId) {
  return client.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
}

export function removeWorkspaceMember(workspaceId, userId) {
  return client.delete(`/workspaces/${workspaceId}/members/${userId}`);
}

export function listWorkspaceMembers(workspaceId) {
  return client.get(`/workspaces/${workspaceId}/members`);
}

export function updateMemberRole(workspaceId, userId, { role }) {
  return client.put(`/workspaces/${workspaceId}/members/${userId}`, { role });
}
