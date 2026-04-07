import client from './client';

/**
 * Search API
 */

export function search(params) {
  const { q, type, workspace_id, project_id, page = 1, per_page = 20 } = params;
  return client.get('/search', {
    params: {
      q,
      type: type || null,
      workspace_id: workspace_id || null,
      project_id: project_id || null,
      page,
      per_page,
    },
  });
}

export function getSearchSuggestions(query) {
  return client.get('/search/suggestions', {
    params: { q: query },
  });
}

export function getRecentSearches() {
  return client.get('/search/recent');
}

export function clearRecentSearches() {
  return client.delete('/search/recent');
}
