import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Film, Clock, FolderOpen, MoreHorizontal, Trash2, Settings } from 'lucide-react';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Dropdown from '../components/ui/Dropdown';
import { formatRelativeTime } from '../lib/utils';

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: workspace, isLoading: wsLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const res = await client.get(`/workspaces/${workspaceId}`);
      return res.data?.data || res.data;
    },
    enabled: !!workspaceId,
  });

  const { data: projects, isLoading: projLoading } = useQuery({
    queryKey: ['workspace-projects', workspaceId],
    queryFn: async () => {
      const res = await client.get(`/workspaces/${workspaceId}/projects`);
      return res.data?.data || res.data || [];
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => client.post(`/workspaces/${workspaceId}/projects`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setFormErrors({});
    },
    onError: (err) => {
      const errors = err.response?.data?.errors || {};
      setFormErrors(errors.name ? { name: errors.name[0] } : { general: '创建失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId) => client.delete(`/workspaces/${workspaceId}/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = '请输入项目名称';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    createMutation.mutate(form);
  };

  const isLoading = wsLoading || projLoading;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400 mb-1">
            <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">工作台</Link>
            <span>/</span>
            <span className="text-surface-900 dark:text-surface-100">{workspace?.name || '加载中...'}</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            {workspace?.name || '工作区'}
          </h1>
          {workspace?.description && (
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{workspace.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={Settings}
            onClick={() => navigate(`/w/${workspaceId}/settings`)}
          >
            设置
          </Button>
          <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
            新建项目
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" text="加载中..." />
        </div>
      )}

      {/* Empty */}
      {!isLoading && projects?.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="还没有项目"
          description="在这个工作区中创建你的第一个项目"
          action={
            <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>
              新建项目
            </Button>
          }
        />
      )}

      {/* Project grid */}
      {!isLoading && projects?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative">
              <Link to={`/project/${project.id}`}>
                <Card hover className="h-full">
                  {/* Cover image */}
                  {project.cover_url || project.thumbnail ? (
                    <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-800">
                      <img
                        src={project.cover_url || project.thumbnail}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
                      <Film size={24} className="text-surface-400" />
                    </div>
                  )}

                  <h3 className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mt-1 text-sm text-surface-500 dark:text-surface-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
                    <span className="flex items-center gap-1">
                      <Film size={12} />
                      {project.assets_count ?? 0} 资源
                    </span>
                    {project.updated_at && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock size={12} />
                        {formatRelativeTime(project.updated_at)}
                      </span>
                    )}
                  </div>

                  {project.status && (
                    <div className="mt-2">
                      <Badge
                        variant={
                          project.status === 'active' ? 'success' :
                          project.status === 'archived' ? 'warning' : 'default'
                        }
                      >
                        {project.status === 'active' ? '进行中' :
                         project.status === 'archived' ? '已归档' : project.status}
                      </Badge>
                    </div>
                  )}
                </Card>
              </Link>

              {/* Actions dropdown */}
              <div className="absolute right-2 top-2">
                <Dropdown
                  align="right"
                  items={[
                    { label: '删除项目', icon: Trash2, danger: true, onClick: () => {
                      if (window.confirm(`确定要删除项目「${project.name}」吗？此操作不可撤销。`)) {
                        deleteMutation.mutate(project.id);
                      }
                    }},
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create project modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setFormErrors({});
          setForm({ name: '', description: '' });
        }}
        title="新建项目"
        description="在工作区中创建一个新项目"
      >
        {formErrors.general && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formErrors.general}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="项目名称"
            placeholder="例如：品牌宣传片 V2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={formErrors.name}
            autoFocus
          />
          <Textarea
            label="描述（可选）"
            placeholder="简要描述这个项目"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={createMutation.isPending}>
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
