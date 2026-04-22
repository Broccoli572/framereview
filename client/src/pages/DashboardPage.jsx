import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FolderKanban, Plus, UploadCloud, Users } from 'lucide-react';
import { createWorkspace, listWorkspaces } from '../api/workspaces';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Textarea from '../components/ui/Textarea';
import { ensureWorkspaceUploadTarget } from '../lib/workspace-upload';
import { formatRelativeTime } from '../lib/utils';

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
        {Icon ? <Icon size={16} className="text-surface-400" /> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Skeleton className="h-40 w-full rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-[24px]" />
        ))}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await listWorkspaces();
      return response.data?.data || response.data || [];
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: () => createWorkspace(form),
    onSuccess: (response) => {
      const created = response.data?.data || response.data;
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setError('');
      if (created?.id) {
        navigate(`/w/${created.id}`);
      }
    },
    onError: (mutationError) => {
      setError(mutationError.response?.data?.message || '创建工作区失败，请稍后再试。');
    },
  });

  const openUploadMutation = useMutation({
    mutationFn: async (workspace) => {
      const response = await listWorkspaces();
      const currentWorkspaces = response.data?.data || response.data || [];
      const currentWorkspace = currentWorkspaces.find((item) => item.id === workspace.id) || workspace;
      const targetProject = await ensureWorkspaceUploadTarget(workspace.id);
      return { workspace: currentWorkspace, targetProject };
    },
    onSuccess: ({ targetProject }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      if (targetProject?.id) {
        navigate(`/project/${targetProject.id}/upload`);
      }
    },
  });

  const workspaces = workspacesQuery.data || [];
  const totalProjects = workspaces.reduce(
    (sum, item) => sum + Number(item.projectCount ?? item.project_count ?? 0),
    0
  );
  const totalMembers = workspaces.reduce(
    (sum, item) => sum + Number(item.memberCount ?? item.member_count ?? 0),
    0
  );
  const latestWorkspace = workspaces[0] || null;

  if (workspacesQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">工作台</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-surface-950 dark:text-surface-50">
              先进入工作区，再直接上传
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500 dark:text-surface-400">
              选择工作区后即可上传，素材会先进入默认收件箱。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {latestWorkspace ? (
              <Button
                leftIcon={UploadCloud}
                onClick={() => openUploadMutation.mutate(latestWorkspace)}
                loading={openUploadMutation.isPending}
              >
                继续上传
              </Button>
            ) : null}
            <Button variant="secondary" leftIcon={Plus} onClick={() => setShowCreate(true)}>
              新建工作区
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="工作区" value={workspaces.length} icon={FolderKanban} />
        <SummaryCard label="项目" value={totalProjects} icon={UploadCloud} />
        <SummaryCard label="成员" value={totalMembers} icon={Users} />
      </div>

      {workspaces.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="还没有工作区"
          description="先建一个工作区，后面上传视频和整理素材都会从这里继续。"
          actionLabel="新建工作区"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">工作区</h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              上传入口会自动落到默认收件箱。
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {workspaces.map((workspace) => (
              <Card key={workspace.id} hover className="h-full rounded-[24px] border-surface-200/90 p-0 dark:border-surface-800">
                <div className="border-b border-surface-200 bg-surface-50 px-6 py-5 dark:border-surface-800 dark:bg-surface-950/70">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">工作区</p>
                      <h4 className="mt-2 truncate text-xl font-semibold">{workspace.name}</h4>
                    </div>
                    <div className="rounded-2xl bg-surface-900 p-3 text-white dark:bg-surface-100 dark:text-surface-900">
                      <FolderKanban size={18} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                    <p className="text-sm text-surface-500 dark:text-surface-400">成员</p>
                    <p className="mt-2 text-2xl font-semibold">{workspace.memberCount ?? workspace.member_count ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                    <p className="text-sm text-surface-500 dark:text-surface-400">项目</p>
                    <p className="mt-2 text-2xl font-semibold">{workspace.projectCount ?? workspace.project_count ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                    <p className="text-sm text-surface-500 dark:text-surface-400">最近更新</p>
                    <p className="mt-2 text-sm font-medium">{formatRelativeTime(workspace.updatedAt || workspace.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openUploadMutation.mutate(workspace)}
                    loading={openUploadMutation.isPending}
                  >
                    上传视频
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/w/${workspace.id}`)}>
                    进入工作区
                    <ArrowRight size={16} className="ml-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setForm({ name: '', description: '' });
          setError('');
        }}
        title="新建工作区"
        description="建好后即可直接上传。"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.name.trim()) {
              setError('请输入工作区名称。');
              return;
            }
            setError('');
            createWorkspaceMutation.mutate();
          }}
        >
          <Input
            label="名称"
            placeholder="例如：品牌组"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={error}
            autoFocus
          />
          <Textarea
            label="说明"
            placeholder="可选，用一句话描述工作区的用途"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button type="submit" loading={createWorkspaceMutation.isPending}>
              创建
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
