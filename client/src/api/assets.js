import client from './client';

/**
 * Asset API
 */

export function initiateUpload({ project_id, folder_id, file_name, file_size, content_type, parent_asset_id }) {
  return client.post('/assets/upload/initiate', {
    project_id,
    folder_id: folder_id || null,
    file_name,
    file_size,
    content_type,
    parent_asset_id: parent_asset_id || null,
  });
}

export function uploadChunk(uploadUrl, chunk, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload chunk failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload chunk network error'));
    xhr.send(chunk);
  });
}

export function finalizeUpload(uploadId, { folder_id, name, description, tags }) {
  return client.post(`/assets/upload/${uploadId}/finalize`, {
    folder_id: folder_id || null,
    name,
    description: description || '',
    tags: tags || [],
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
