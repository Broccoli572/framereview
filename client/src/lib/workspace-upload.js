import client from '../api/client';

export const DEFAULT_UPLOAD_PROJECT_NAME = '素材收件箱';
const LEGACY_UPLOAD_PROJECT_NAMES = ['绱犳潗鏀朵欢绠?'];

export function findWorkspaceUploadTarget(projects = []) {
  const inboxProject = projects.find((project) => (
    project.name === DEFAULT_UPLOAD_PROJECT_NAME || LEGACY_UPLOAD_PROJECT_NAMES.includes(project.name)
  ));
  if (inboxProject) return inboxProject;
  if (projects.length === 1) return projects[0];
  return null;
}

export async function ensureWorkspaceUploadTarget(workspaceId, projects = []) {
  const target = findWorkspaceUploadTarget(projects);
  if (target) {
    return target;
  }

  const response = await client.post(`/workspaces/${workspaceId}/projects`, {
    name: DEFAULT_UPLOAD_PROJECT_NAME,
    description: '工作区默认上传入口',
  });

  return response.data?.data || response.data || null;
}
