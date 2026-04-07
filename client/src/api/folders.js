import client from './client';

/**
 * Folder API
 */

export function getFolderTree(projectId) {
  return client.get(`/projects/${projectId}/folders/tree`);
}

export function getFolderContents(folderId, params = {}) {
  return client.get(`/folders/${folderId}/contents`, { params });
}

export function getFolder(folderId) {
  return client.get(`/folders/${folderId}`);
}

export function createFolder(projectId, { name, parent_id }) {
  return client.post(`/projects/${projectId}/folders`, {
    name,
    parent_id: parent_id || null,
  });
}

export function updateFolder(folderId, { name, parent_id }) {
  return client.put(`/folders/${folderId}`, { name, parent_id });
}

export function deleteFolder(folderId) {
  return client.delete(`/folders/${folderId}`);
}

export function moveFolder(folderId, { parent_id }) {
  return client.post(`/folders/${folderId}/move`, { parent_id });
}

export function getAssetsInFolder(folderId, params = {}) {
  const { page = 1, per_page = 50, sort = 'created_at', order = 'desc', type } = params;
  return client.get(`/folders/${folderId}/assets`, {
    params: { page, per_page, sort, order, type },
  });
}
