import client from '../api/client';

export const DEFAULT_UPLOAD_PROJECT_NAME = '素材收件箱';
const LEGACY_UPLOAD_PROJECT_NAMES = [
  DEFAULT_UPLOAD_PROJECT_NAME,
  '绱犳潗鏀朵欢绠?',
  '缁辩姵娼楅弨鏈垫缁?',
];

function normalizeProjectName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function findWorkspaceUploadTarget(projects = []) {
  const normalizedLegacyNames = new Set(LEGACY_UPLOAD_PROJECT_NAMES.map(normalizeProjectName));

  const inboxProject = projects.find((project) => (
    normalizedLegacyNames.has(normalizeProjectName(project.name))
  ));
  if (inboxProject) return inboxProject;

  const fuzzyProject = projects.find((project) => {
    const normalizedName = normalizeProjectName(project.name);
    return normalizedName.includes('收件箱') || normalizedName.includes('uploadinbox');
  });
  if (fuzzyProject) return fuzzyProject;

  if (projects.length === 1) return projects[0];
  return null;
}

export async function ensureWorkspaceUploadTarget(workspaceId, projects = []) {
  let projectList = Array.isArray(projects) ? projects : [];

  // Dashboard often calls this helper without a project list.
  // Query once to avoid creating duplicate upload-inbox projects.
  if (!projectList.length && workspaceId) {
    const listResponse = await client.get(`/workspaces/${workspaceId}/projects`, {
      params: { per_page: 100 },
    });
    const payload = listResponse.data?.data || listResponse.data || [];
    projectList = Array.isArray(payload) ? payload : payload.data || [];
  }

  const target = findWorkspaceUploadTarget(projectList);
  if (target) {
    return target;
  }

  const response = await client.post(`/workspaces/${workspaceId}/projects`, {
    name: DEFAULT_UPLOAD_PROJECT_NAME,
    description: '工作区默认上传入口',
  });

  return response.data?.data || response.data || null;
}
