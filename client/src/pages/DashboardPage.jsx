import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Film, Clock, FolderOpen } from 'lucide-react';
import { listWorkspaces, createWorkspace } from '../api/workspaces';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Avatar from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await listWorkspaces();
      return res.data?.data || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createWorkspace(form),
    onSuccess: (res) => {
      const ws = res.data?.data || res.data;
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setFormErrors({});
      if (ws?.id) {
        navigate(`/w/${ws.id}`);
      }
    },
    onError: (err) => {
      const errors = err.response?.data?.errors || {};
      setFormErrors(errors.name ? { name: errors.name[0] } : { general: '创建失败' });
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = '请输入工作区名称';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    createMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">工作台</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">选择或创建一个工作区开始工作</p>
        </div>
        <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
          新建工作区
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" text="加载中..." />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          加载失败：{error.message}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && workspaces?.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="还没有工作区"
          description="创建你的第一个工作区，开始视频审阅协作"
          action={
            <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
              新建工作区
            </Button>
          }
        />
      )}

      {/* Workspace grid */}
      {!isLoading && workspaces?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} to={`/w/${ws.id}`}>
              <Card hover className="h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
                    {ws.avatar ? (
                      <img src={ws.avatar} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <Film size={20} className="text-brand-600 dark:text-brand-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {ws.name}
                    </h3>
                    {ws.description && (
                      <p className="text-sm text-surface-500 dark:text-surface-400 line-clamp-2 mt-0.5">
                        {ws.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-surface-500 dark:text-surface-400">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {ws.members_count ?? ws.member_count ?? 0} 成员
                  </span>
                  <span className="flex items-center gap-1">
                    <Film size={12} />
                    {ws.assets_count ?? ws.project_count ?? 0} 资源
                  </span>
                  {ws.updated_at && (
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock size={12} />
                      {formatRelativeTime(ws.updated_at)}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create workspace modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setFormErrors({});
          setForm({ name: '', description: '' });
        }}
        title="新建工作区"
        description="创建一个新的工作区来管理你的项目和团队"
      >
        {formErrors.general && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formErrors.general}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="工作区名称"
            placeholder="例如：营销视频团队"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={formErrors.name}
            autoFocus
          />
          <Textarea
            label="描述（可选）"
            placeholder="简要描述这个工作区的用途"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowCreate(false)}
              disabled={createMutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              创建
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
