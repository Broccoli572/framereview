import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, MoreHorizontal, Plus, Settings2, Trash2 } from 'lucide-react';
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

function normalizeProject(project, workspace) {
  return {
    ...project,
    assetCount: Number(project?._count?.assets ?? project?.assets_count ?? 0),
    memberCount: Number(project?._count?.members ?? project?.member_count ?? 0),
    folderCount: Number(project?._count?.folders ?? project?.folder_count ?? 0),
    updatedLabel: formatRelativeTime(project?.updatedAt || project?.updated_at || project?.createdAt || project?.created_at),
    workspaceId: workspace?.id,
  };
}

function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-[24px]" />
        ))}
      </section>
    </div>
  );
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');

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
    mutationFn: () => client.post(`/workspaces/${workspaceId}/projects`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
      setShowCreateProject(false);
      setForm({ name: '', description: '' });
      setFormError('');
    },
    onError: (error) => {
      setFormError(error.response?.data?.message || '创建项目失败，请稍后再试。');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => client.delete(`/workspaces/${workspaceId}/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
    },
  });

  const projects = useMemo(
    () => (projectsQuery.data || []).map((project) => normalizeProject(project, workspaceQuery.data)),
    [projectsQuery.data, workspaceQuery.data]
  );

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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-500 dark:text-surface-400">
              {workspaceQuery.data?.description || '项目、素材、上传和审阅都围绕这个工作区组织。'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" leftIcon={Settings2} onClick={() => navigate(`/w/${workspaceId}/settings`)}>
              工作区设置
            </Button>
            <Button leftIcon={Plus} onClick={() => setShowCreateProject(true)}>
              新建项目
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-50 p-5 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">项目数</p>
            <p className="mt-2 text-3xl font-semibold">{projects.length}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-5 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">成员数</p>
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
          title="这个工作区还没有项目"
          description="先建一个项目，把上传、素材处理和审阅流程真正接起来。"
          actionLabel="新建项目"
          onAction={() => setShowCreateProject(true)}
        />
      ) : (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">项目列表</h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              所有素材、上传和审阅页面都从这里继续进入。
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} hover className="rounded-[24px] p-0">
                <div className="flex items-start justify-between border-b border-surface-200 bg-surface-50 px-6 py-5 dark:border-surface-800 dark:bg-surface-950/70">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">项目</p>
                    <Link to={`/project/${project.id}`} className="mt-2 block text-xl font-semibold hover:text-brand-600 dark:hover:text-brand-400">
                      {project.name}
                    </Link>
                    <p className="mt-2 max-w-xl text-sm text-surface-500 dark:text-surface-400">
                      {project.description || '用于承接同一批素材和审阅任务。'}
                    </p>
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
                  <div className="flex items-center gap-2">
                    <Badge variant={project.status === 'archived' ? 'warning' : 'success'}>
                      {project.status === 'archived' ? '已归档' : '进行中'}
                    </Badge>
                    <span className="text-sm text-surface-500 dark:text-surface-400">
                      进入项目后可继续上传素材或开始审阅。
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${project.id}`)}>
                      查看项目
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/project/${project.id}/upload`)}>
                      上传素材
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
        description="项目是上传、素材整理和审阅协作的直接容器。"
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
            label="项目名称"
            placeholder="例如：品牌宣传片 V2"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={formError}
            autoFocus
          />
          <Textarea
            label="项目说明"
            placeholder="描述这个项目的用途、交付目标或协作范围。"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateProject(false)}>
              取消
            </Button>
            <Button type="submit" loading={createProjectMutation.isPending}>
              创建项目
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
