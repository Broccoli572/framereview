import client from './client';

/**
 * Review API – Comments & Annotations
 */

export function getThreads(assetId, params = {}) {
  const { page = 1, per_page = 50, resolved } = params;
  return client.get(`/assets/${assetId}/threads`, {
    params: { page, per_page, resolved },
  });
}

export function createThread(assetId, { body, timecode, x, y, metadata }) {
  return client.post(`/assets/${assetId}/threads`, {
    body,
    timecode: timecode || null,
    x: x ?? null,
    y: y ?? null,
    metadata: metadata || {},
  });
}

export function getThread(threadId) {
  return client.get(`/threads/${threadId}`);
}

export function updateThread(threadId, { body, resolved }) {
  return client.put(`/threads/${threadId}`, { body, resolved });
}

export function deleteThread(threadId) {
  return client.delete(`/threads/${threadId}`);
}

export function resolveThread(threadId) {
  return client.post(`/threads/${threadId}/resolve`);
}

export function unresolveThread(threadId) {
  return client.post(`/threads/${threadId}/unresolve`);
}

export function getComments(threadId, params = {}) {
  const { page = 1, per_page = 50 } = params;
  return client.get(`/threads/${threadId}/comments`, {
    params: { page, per_page },
  });
}

export function addComment(threadId, { body, attachments, mentions }) {
  return client.post(`/threads/${threadId}/comments`, {
    body,
    attachments: attachments || [],
    mentions: mentions || [],
  });
}

export function updateComment(commentId, { body }) {
  return client.put(`/comments/${commentId}`, { body });
}

export function deleteComment(commentId) {
  return client.delete(`/comments/${commentId}`);
}

export function getReviewStatus(assetId) {
  return client.get(`/assets/${assetId}/review-status`);
}

export function setAssetApproval(assetId, { status, note }) {
  return client.post(`/assets/${assetId}/approval`, {
    status,
    note: note || '',
  });
}
