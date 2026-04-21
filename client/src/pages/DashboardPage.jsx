import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Film, FolderKanban, Layers3, Plus, Users } from 'lucide-react';
import { createWorkspace, listWorkspaces } from '../api/workspaces';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Textarea from '../components/ui/Textarea';
import { formatRelativeTime } from '../lib/utils';

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
      <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">{detail}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-6 rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
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

  const workspaces = workspacesQuery.data || [];
  const totalProjects = workspaces.reduce(
    (sum, item) => sum + Number(item.projectCount ?? item.project_count ?? 0),
    0
  );
  const totalMembers = workspaces.reduce(
    (sum, item) => sum + Number(item.memberCount ?? item.member_count ?? 0),
    0
  );

  if (workspacesQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-6 rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
        <div>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">工作台总览</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-surface-950 dark:text-surface-50">
            以工作区为起点，把项目、素材上传和审阅流程收在同一条主链路里。
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-500 dark:text-surface-400">
            这里是全站入口。先进入工作区，再管理项目，最后串联上传、处理和审阅动作，避免页面之间断层。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
              新建工作区
            </Button>
            {workspaces[0]?.id ? (
              <Button variant="secondary" onClick={() => navigate(`/w/${workspaces[0].id}`)}>
                进入最近工作区
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <SummaryCard label="工作区" value={workspaces.length} detail="按团队或业务线组织项目。" />
          <SummaryCard label="项目" value={totalProjects} detail="统一沉淀素材、状态与审阅记录。" />
          <SummaryCard label="成员" value={totalMembers} detail="围绕工作区做协作和权限管理。" />
        </div>
      </section>

      {workspaces.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="还没有工作区"
          description="先创建一个工作区，后续项目、上传和审阅都会围绕它展开。"
          actionLabel="新建工作区"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">工作区列表</h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              选择一个工作区，继续进入项目与素材工作流。
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {workspaces.map((workspace) => (
              <Link key={workspace.id} to={`/w/${workspace.id}`}>
                <Card hover className="h-full rounded-[24px] border-surface-200/90 p-0 dark:border-surface-800">
                  <div className="border-b border-surface-200 bg-surface-50 px-6 py-5 dark:border-surface-800 dark:bg-surface-950/70">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">工作区</p>
                        <h4 className="mt-2 text-xl font-semibold">{workspace.name}</h4>
                        <p className="mt-2 max-w-xl text-sm text-surface-500 dark:text-surface-400">
                          {workspace.description || '用于承接同一团队或业务线下的项目与素材协作。'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-surface-900 p-3 text-white dark:bg-surface-100 dark:text-surface-900">
                        <FolderKanban size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
                    <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                      <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                        <Users size={14} />
                        成员
                      </div>
                      <p className="mt-2 text-2xl font-semibold">{workspace.memberCount ?? workspace.member_count ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                      <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                        <Layers3 size={14} />
                        项目
                      </div>
                      <p className="mt-2 text-2xl font-semibold">{workspace.projectCount ?? workspace.project_count ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900">
                      <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                        <Film size={14} />
                        最近更新
                      </div>
                      <p className="mt-2 text-sm font-medium">{formatRelativeTime(workspace.updatedAt || workspace.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-6 pb-6">
                    <p className="text-sm text-surface-500 dark:text-surface-400">进入后可继续新建项目、管理成员与配置协作。</p>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-surface-900 dark:text-surface-100">
                      进入工作区
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Card>
              </Link>
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
        description="先定义工作区，再在其中继续组织项目和成员。"
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
            label="工作区名称"
            placeholder="例如：品牌营销中心"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={error}
            autoFocus
          />
          <Textarea
            label="工作区说明"
            placeholder="描述这个工作区承载的业务或协作范围。"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button type="submit" loading={createWorkspaceMutation.isPending}>
              创建工作区
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
