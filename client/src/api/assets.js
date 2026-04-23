import client from './client';

/**
 * Asset API
 */

const UPLOAD_TIMEOUT = 0;

function normalizeUploadUrl(uploadUrl) {
  return uploadUrl?.replace(/^\/api/, '') || uploadUrl;
}

export function initiateUpload({ project_id, folder_id, file_name, file_size, content_type, parent_asset_id, metadata }) {
  return client.post('/assets/upload/initiate', {
    project_id,
    folder_id: folder_id || null,
    file_name,
    file_size,
    content_type,
    parent_asset_id: parent_asset_id || null,
    metadata: metadata || undefined,
  });
}

export function uploadChunk(uploadUrl, chunk, onProgress) {
  const formData = new FormData();
  formData.append('chunk', chunk, 'chunk.bin');

  return client.put(normalizeUploadUrl(uploadUrl), formData, {
    timeout: UPLOAD_TIMEOUT,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
}

export function uploadAsset({ file, project_id, folder_id, metadata, onProgress }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('project_id', project_id);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }
  if (folder_id) {
    formData.append('folder_id', folder_id);
  }

  return client.post('/assets/upload', formData, {
    timeout: UPLOAD_TIMEOUT,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
}

export function finalizeUpload(uploadId, { folder_id, name, description, tags }) {
  return client.post(`/assets/upload/${uploadId}/finalize`, {
    folder_id: folder_id || null,
    name,
    description: description || '',
    tags: tags || [],
  }, {
    timeout: UPLOAD_TIMEOUT,
  });
}

export function getAsset(assetId) {
  return client.get(`/assets/${assetId}`);
}

export function updateAsset(assetId, { name, description, tags, folder_id }) {
  return client.put(`/assets/${assetId}`, { name, description, tags, folder_id });
}

export function deleteAsset(assetId) {
  return client.delete(`/assets/${assetId}`);
}

export function restoreAsset(assetId) {
  return client.post(`/assets/${assetId}/restore`);
}

export function emptyAssetTrash(projectId) {
  return client.delete(`/projects/${projectId}/assets/trash`);
}

export function listAssets(projectId, params = {}) {
  const {
    page = 1,
    per_page = 50,
    sort = 'created_at',
    order = 'desc',
    type,
    folder_id,
    search,
    status,
  } = params;
  return client.get(`/projects/${projectId}/assets`, {
    params: { page, per_page, sort, order, type, folder_id, search, status },
  });
}

export function listDeletedAssets(projectId, params = {}) {
  const {
    page = 1,
    per_page = 50,
    type,
    search,
  } = params;
  return client.get(`/projects/${projectId}/assets/trash`, {
    params: { page, per_page, type, search },
  });
}

export function processAsset(assetId) {
  return client.post(`/assets/${assetId}/process`);
}

export function getAssetThumbnail(assetId, params = {}) {
  return client.get(`/assets/${assetId}/thumbnail`, {
    params: { width: params.width, height: params.height, time: params.time },
    responseType: 'blob',
  });
}

export function getAssetVersions(assetId) {
  return client.get(`/assets/${assetId}/versions`);
}

export function deleteAssetVersion(assetId, versionId) {
  return client.delete(`/assets/${assetId}/versions/${versionId}`);
}

export function moveAsset(assetId, { folder_id }) {
  return client.post(`/assets/${assetId}/move`, { folder_id });
}

export function batchDeleteAssets(assetIds) {
  return client.post('/assets/batch-delete', { asset_ids: assetIds });
}

export function batchMoveAssets({ asset_ids, folder_id }) {
  return client.post('/assets/batch-move', { asset_ids, folder_id });
}
