import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listWorkspaceMembers, listWorkspaceInvites, inviteToWorkspace,
  removeWorkspaceMember, updateMemberRole, cancelWorkspaceInvite,
} from '../api/workspaces';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table, { Head, Body, Row, HeaderCell, Cell } from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelativeTime, getInitials } from '../lib/utils';
import { UserPlus, Shield, Users as UsersIcon, Mail, X, Crown } from 'lucide-react';
import clsx from 'clsx';

const roleLabels = {
  owner: { label: '所有者', variant: 'primary' },
  admin: { label: '管理员', variant: 'info' },
  editor: { label: '编辑者', variant: 'default' },
  viewer: { label: '查看者', variant: 'default' },
};

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteError, setInviteError] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const queryClient = useQueryClient();

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const res = await listWorkspaceMembers(workspaceId);
      return res.data?.data || res.data || [];
    },
    enabled: !!workspaceId,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: async () => {
      const res = await listWorkspaceInvites(workspaceId);
      return res.data?.data || res.data || [];
    },
    enabled: !!workspaceId && activeTab === 'invites',
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      setInviteError('');
      if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
        setInviteError('请输入有效的邮箱地址');
        throw new Error('invalid');
      }
      return inviteToWorkspace(workspaceId, { email: inviteEmail, role: inviteRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      setInviteEmail('');
    },
    onError: (err) => {
      if (err.message !== 'invalid') {
        setInviteError(err.response?.data?.message || '邀请失败');
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateMemberRole(workspaceId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId) => cancelWorkspaceInvite(workspaceId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
    },
  });

  const currentUserId = members?.find((m) => m.role === 'owner')?.id;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-surface-500 dark:text-surface-400">
        <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">工作台</Link>
        <span className="mx-1.5">/</span>
        <Link to={`/w/${workspaceId}`} className="hover:text-brand-600 dark:hover:text-brand-400">
          工作区
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-surface-900 dark:text-surface-100">设置</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-surface-900 dark:text-surface-100">工作区设置</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-surface-200 dark:border-surface-800">
        {[
          { key: 'members', label: '成员', count: members?.length },
          { key: 'invites', label: '邀请', count: invites?.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-surface-500 hover:text-surface-700 dark:text-surface-400'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={clsx(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                activeTab === tab.key
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {activeTab === 'members' && (
        <div>
          {/* Invite form */}
          <div className="mb-6 flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="邀请成员"
                type="email"
                placeholder="输入邮箱地址"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                leftIcon={Mail}
                error={inviteError}
              />
            </div>
            <div className="w-32">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-9 w-full rounded-lg border border-surface-300 bg-white px-3 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
              >
                <option value="admin">管理员</option>
                <option value="editor">编辑者</option>
                <option value="viewer">查看者</option>
              </select>
            </div>
            <Button
              leftIcon={UserPlus}
              onClick={() => inviteMutation.mutate()}
              loading={inviteMutation.isPending}
            >
              邀请
            </Button>
          </div>

          {/* Members list */}
          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner text="加载成员..." />
            </div>
          ) : members?.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="还没有成员"
              description="邀请成员加入工作区"
            />
          ) : (
            <Table>
              <Head>
                <Row>
                  <HeaderCell>成员</HeaderCell>
                  <HeaderCell>角色</HeaderCell>
                  <HeaderCell>加入时间</HeaderCell>
                  <HeaderCell className="w-20">操作</HeaderCell>
                </Row>
              </Head>
              <Body>
                {members.map((member) => {
                  const roleInfo = roleLabels[member.role] || roleLabels.viewer;
                  const isOwner = member.role === 'owner';
                  return (
                    <Row key={member.id}>
                      <Cell>
                        <div className="flex items-center gap-3">
                          <Avatar src={member.avatar} name={member.name} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-surface-900 dark:text-surface-100">
                                {member.name}
                              </span>
                              {isOwner && <Crown size={12} className="text-amber-500" />}
                            </div>
                            <span className="text-xs text-surface-500 dark:text-surface-400">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </Cell>
                      <Cell>
                        {isOwner ? (
                          <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => updateRoleMutation.mutate({ userId: member.id, role: e.target.value })}
                            className="rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                          >
                            <option value="admin">管理员</option>
                            <option value="editor">编辑者</option>
                            <option value="viewer">查看者</option>
                          </select>
                        )}
                      </Cell>
                      <Cell>
                        <span className="text-xs text-surface-500">
                          {member.created_at ? formatRelativeTime(member.created_at) : '-'}
                        </span>
                      </Cell>
                      <Cell>
                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`确定要移除「${member.name}」吗？`)) {
                                removeMemberMutation.mutate(member.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            移除
                          </Button>
                        )}
                      </Cell>
                    </Row>
                  );
                })}
              </Body>
            </Table>
          )}
        </div>
      )}

      {/* Invites tab */}
      {activeTab === 'invites' && (
        <div>
          {invitesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner text="加载邀请..." />
            </div>
          ) : invites?.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="没有待处理的邀请"
              description="邀请成员将显示在这里"
            />
          ) : (
            <Table>
              <Head>
                <Row>
                  <HeaderCell>邮箱</HeaderCell>
                  <HeaderCell>角色</HeaderCell>
                  <HeaderCell>邀请时间</HeaderCell>
                  <HeaderCell className="w-20">操作</HeaderCell>
                </Row>
              </Head>
              <Body>
                {invites.map((invite) => {
                  const roleInfo = roleLabels[invite.role] || roleLabels.viewer;
                  return (
                    <Row key={invite.id}>
                      <Cell>
                        <span className="text-sm">{invite.email}</span>
                      </Cell>
                      <Cell>
                        <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
                      </Cell>
                      <Cell>
                        <span className="text-xs text-surface-500">
                          {invite.created_at ? formatRelativeTime(invite.created_at) : '-'}
                        </span>
                      </Cell>
                      <Cell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInviteMutation.mutate(invite.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          撤销
                        </Button>
                      </Cell>
                    </Row>
                  );
                })}
              </Body>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
