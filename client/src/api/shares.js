import client from './client';

/**
 * Share API
 */

export function listShares(projectId, params = {}) {
  const { page = 1, per_page = 20 } = params;
  return client.get(`/projects/${projectId}/shares`, {
    params: { page, per_page },
  });
}

export function listAssetShares(assetId, params = {}) {
  const { page = 1, per_page = 20 } = params;
  return client.get(`/assets/${assetId}/shares`, {
    params: { page, per_page },
  });
}

export function getShare(shareId) {
  return client.get(`/shares/${shareId}`);
}

export function verifyShare(token, { password }) {
  return client.post(`/shares/verify/${token}`, {
    password: password || null,
  });
}

export function getSharedContent(token) {
  return client.get(`/shares/${token}`);
}

export function createShare({ asset_id, project_id, name, expires_at, password, allow_download, allow_comment, resolution }) {
  return client.post('/shares', {
    asset_id: asset_id || null,
    project_id: project_id || null,
    name,
    expires_at: expires_at || null,
    password: password || null,
    allow_download: allow_download ?? true,
    allow_comment: allow_comment ?? true,
    resolution: resolution || null,
  });
}

export function updateShare(shareId, { name, expires_at, password, allow_download, allow_comment, resolution }) {
  return client.put(`/shares/${shareId}`, {
    name,
    expires_at,
    password,
    allow_download,
    allow_comment,
    resolution,
  });
}

export function deleteShare(shareId) {
  return client.delete(`/shares/${shareId}`);
}

export function revokeShare(shareId) {
  return client.post(`/shares/${shareId}/revoke`);
}

export function getShareStats(shareId) {
  return client.get(`/shares/${shareId}/stats`);
}

export function getShareVisits(shareId, params = {}) {
  const { page = 1, per_page = 20 } = params;
  return client.get(`/shares/${shareId}/visits`, {
    params: { page, per_page },
  });
}
