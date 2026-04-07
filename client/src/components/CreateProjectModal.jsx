import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/projects';
import { X, FolderKanban } from 'lucide-react';
import { cn } from '../lib/utils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#64748b', '#78716c',
];

export default function CreateProjectModal({ workspaceId, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => createProject(workspaceId, data),
    onSuccess: (response) => {
      const project = response.data?.data || response.data;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      onClose();
      if (project?.id) {
        navigate(`/project/${project.id}`);
      }
    },
    onError: (err) => {
      setError(err.response?.data?.message || '创建项目失败');
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('请输入项目名称');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim(),
      color,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-200 bg-white p-6 shadow-2xl animate-scale-in dark:border-surface-700 dark:bg-surface-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              新建项目
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="project-name" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：品牌宣传片"
              className="input"
              autoFocus
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="project-desc" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              项目描述
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述项目内容…"
              className="input resize-none"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
              项目颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-surface-900' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  创建中…
                </>
              ) : (
                '创建项目'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
