import { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import { slugify } from '../../lib/utils';
import { Eye } from 'lucide-react';

export default function CreateWorkspaceModal({ open, onClose, onSubmit, loading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const slug = slugify(name);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = '请输入工作区名称';
    if (name.trim().length < 2) newErrors.name = '名称至少 2 个字符';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit?.({ name: name.trim(), slug, description: description.trim() });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setErrors({});
    onClose?.();
  };

  return (
    <Modal open={open} onClose={handleClose} title="新建工作区" description="创建一个新的工作区来管理项目和团队">
      {errors.general && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {errors.general}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="工作区名称"
          placeholder="例如：营销视频团队"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
        />
        {name.trim() && (
          <div className="text-xs text-surface-500">
            标识符：<span className="font-mono bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">{slug}</span>
          </div>
        )}
        <Textarea
          label="描述（可选）"
          placeholder="简要描述这个工作区的用途"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button type="submit" loading={loading}>
            创建
          </Button>
        </div>
      </form>
    </Modal>
  );
}
