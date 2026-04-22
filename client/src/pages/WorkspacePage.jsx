import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, MoreHorizontal, Plus, Settings2, Trash2, UploadCloud } from 'lucide-react';
import client from '../api/client';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Dropdown from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Textarea from '../components/ui/Textarea';
import { formatRelativeTime } from '../lib/utils';

const DEFAULT_UPLOAD_PROJECT_NAME = '素材收件箱';

function normalizeProject(project, workspace) {
  return {
    ...project,
    assetCount: Number(project?._count?.assets ?? project?.assets_count ?? 0),
    folderCount: Number(project?._count?.folders ?? project?.folder_count ?? 0),
    updatedLabel: formatRelativeTime(project?.updatedAt || project?.updated_at || project?.createdAt || project?.created_at),
    workspaceId: workspace?.id,
    isInbox: project?.name === DEFAULT_UPLOAD_PROJECT_NAME,
  };
}

function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Skeleton className="h-40 w-full rounded-[28px]" />
      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-[24px]" />
        ))}
      </section>
    </div>
  );
}

function resolveUploadTarget(projects) {
  const inboxProject = projects.find((project) => project.name === DEFAULT_UPLOAD_PROJECT_NAME);
  if (inboxProject) return inboxProject;
  if (projects.length === 1) return projects[0];
  return null;
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const response = await client.get(`/workspaces/${workspaceId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(workspaceId),
  });

  const projectsQuery = useQuery({
    queryKey: ['workspace-projects', workspaceId],
    queryFn: async () => {
      const response = await client.get(`/workspaces/${workspaceId}/projects`);
      const payload = response.data?.data || response.data || [];
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    enabled: Boolean(workspaceId),
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await client.post(`/workspaces/${workspaceId}/projects`, form);
      return response.data?.data || response.data || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
      setShowCreateProject(false);
      setForm({ name: '', description: '' });
      setFormError('');
      setPageError('');
    },
    onError: (error) => {
      setFormError(error.response?.data?.message || '创建项目失败，请稍后再试。');
    },
  });

  const openUploadMutation = useMutation({
    mutationFn: async () => {
      const existingProjects = projectsQuery.data || [];
      const target = resolveUploadTarget(existingProjects);

      if (target) {
        return target;
      }

      const response = await client.post(`/workspaces/${workspaceId}/projects`, {
        name: DEFAULT_UPLOAD_PROJECT_NAME,
        description: '工作区默认上传入口',
      });

      return response.data?.data || response.data || null;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
      setPageError('');

      if (project?.id) {
        navigate(`/project/${project.id}/upload`);
      }
    },
    onError: (error) => {
      setPageError(error.response?.data?.message || '暂时无法打开上传入口，请稍后重试。');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => client.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
    },
  });

  const projects = useMemo(
    () => (projectsQuery.data || []).map((project) => normalizeProject(project, workspaceQuery.data)),
    [projectsQuery.data, workspaceQuery.data]
  );

  const handleStartUpload = () => {
    setPageError('');
    openUploadMutation.mutate();
  };

  if (workspaceQuery.isLoading || projectsQuery.isLoading) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">工作区</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {workspaceQuery.data?.name || '工作区'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-500 dark:text-surface-400">
              先上传视频开始工作。系统会优先进入默认素材收件箱，后续如果需要更细的整理，再进入项目里新建文件夹分类。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button leftIcon={UploadCloud} onClick={handleStartUpload} loading={openUploadMutation.isPending}>
              上传视频
            </Button>
            <Button variant="secondary" leftIcon={Settings2} onClick={() => navigate(`/w/${workspaceId}/settings`)}>
              设置
            </Button>
            <Button variant="ghost" leftIcon={Plus} onClick={() => setShowCreateProject(true)}>
              新建项目
            </Button>
          </div>
        </div>

        {pageError ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {pageError}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-50 p-5 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">项目</p>
            <p className="mt-2 text-3xl font-semibold">{projects.length}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-5 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">成员</p>
            <p className="mt-2 text-3xl font-semibold">{workspaceQuery.data?._count?.members ?? workspaceQuery.data?.memberCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-5 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">创建时间</p>
            <p className="mt-2 text-sm font-medium">{formatRelativeTime(workspaceQuery.data?.createdAt)}</p>
          </div>
        </div>
      </section>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="直接上传就能开始工作"
          description="首次上传会自动创建默认素材收件箱。需要独立阶段或分类时，再补建项目或进入项目新建文件夹。"
          actionLabel="上传视频"
          onAction={handleStartUpload}
          secondaryActionLabel="新建项目"
          onSecondaryAction={() => setShowCreateProject(true)}
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">项目</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                上传优先走默认收件箱，项目负责承载工作流，文件夹负责细分整理。
              </p>
            </div>
            <Button variant="secondary" onClick={handleStartUpload} loading={openUploadMutation.isPending}>
              继续上传
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} hover className="rounded-[24px] p-0">
                <div className="flex items-start justify-between border-b border-surface-200 bg-surface-50 px-6 py-5 dark:border-surface-800 dark:bg-surface-950/70">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">项目</p>
                      {project.isInbox ? <Badge size="sm" variant="brand">默认上传入口</Badge> : null}
                    </div>
                    <Link to={`/project/${project.id}`} className="mt-2 block truncate text-xl font-semibold hover:text-brand-600 dark:hover:text-brand-400">
                      {project.name}
                    </Link>
                  </div>
                  <Dropdown
                    align="right"
                    trigger={(
                      <button type="button" className="rounded-xl p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800">
                        <MoreHorizontal size={18} />
                      </button>
                    )}
                    items={[
                      {
                        label: '删除项目',
                        icon: Trash2,
                        danger: true,
                        onClick: () => {
                          if (window.confirm(`确定要删除项目“${project.name}”吗？`)) {
                            deleteProjectMutation.mutate(project.id);
                          }
                        },
                      },
                    ]}
                  />
                </div>

                <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                    <p className="text-sm text-surface-500 dark:text-surface-400">素材</p>
                    <p className="mt-2 text-2xl font-semibold">{project.assetCount}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                    <p className="text-sm text-surface-500 dark:text-surface-400">文件夹</p>
                    <p className="mt-2 text-2xl font-semibold">{project.folderCount}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                    <p className="text-sm text-surface-500 dark:text-surface-400">最近更新</p>
                    <p className="mt-2 text-sm font-medium">{project.updatedLabel}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
                  <Badge variant={project.status === 'archived' ? 'warning' : 'success'}>
                    {project.status === 'archived' ? '已归档' : '进行中'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${project.id}`)}>
                      进入素材
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/project/${project.id}/upload`)}>
                      上传
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={showCreateProject}
        onClose={() => {
          setShowCreateProject(false);
          setForm({ name: '', description: '' });
          setFormError('');
        }}
        title="新建项目"
        description="项目适合承载单独流程；如果只是先把视频放进来，直接上传会更顺手。"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.name.trim()) {
              setFormError('请输入项目名称。');
              return;
            }
            setFormError('');
            createProjectMutation.mutate();
          }}
        >
          <Input
            label="名称"
            placeholder="例如：发布片 V2"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={formError}
            autoFocus
          />
          <Textarea
            label="说明"
            placeholder="可选，用一句话说明项目用途"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateProject(false)}>
              取消
            </Button>
            <Button type="submit" loading={createProjectMutation.isPending}>
              创建
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
