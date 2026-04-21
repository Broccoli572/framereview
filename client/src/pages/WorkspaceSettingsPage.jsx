import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelWorkspaceInvite,
  inviteToWorkspace,
  listWorkspaceInvites,
  listWorkspaceMembers,
  removeWorkspaceMember,
  updateMemberRole,
} from '../api/workspaces';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import Table, { Body, Cell, Head, HeaderCell, Row } from '../components/ui/Table';
import { formatRelativeTime } from '../lib/utils';

const roleMeta = {
  owner: { label: '所有者', variant: 'brand' },
  admin: { label: '管理员', variant: 'info' },
  editor: { label: '编辑', variant: 'default' },
  viewer: { label: '查看者', variant: 'default' },
};

function SettingsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-[26px]" />
      <Skeleton className="h-80 w-full rounded-[26px]" />
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteError, setInviteError] = useState('');

  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const response = await listWorkspaceMembers(workspaceId);
      return response.data?.members || response.data?.data || response.data || [];
    },
    enabled: Boolean(workspaceId),
  });

  const invitesQuery = useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: async () => {
      const response = await listWorkspaceInvites(workspaceId);
      return response.data?.invites || response.data?.members || response.data?.data || response.data || [];
    },
    enabled: Boolean(workspaceId) && activeTab === 'invites',
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteToWorkspace(workspaceId, { email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
      setInviteEmail('');
      setInviteRole('viewer');
      setInviteError('');
    },
    onError: (error) => {
      setInviteError(error.response?.data?.message || '邀请发送失败，请稍后再试。');
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

  const members = membersQuery.data || [];
  const invites = invitesQuery.data || [];
  const ownerId = useMemo(() => members.find((member) => member.role === 'owner')?.id, [members]);

  if (membersQuery.isLoading || (activeTab === 'invites' && invitesQuery.isLoading)) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <SettingsTableSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">工作区设置</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">成员、邀请与协作权限</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-500 dark:text-surface-400">
          这里不扩展新的后端协议，只把现有成员和邀请接口收束成稳定、可读、可操作的设置页。
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: 'members', label: '成员', count: members.length },
            { key: 'invites', label: '邀请', count: invites.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? 'rounded-full bg-surface-900 px-4 py-2 text-sm text-white dark:bg-surface-100 dark:text-surface-900'
                  : 'rounded-full bg-surface-100 px-4 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300'
              }
            >
              {tab.label} {tab.count ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'members' ? (
        <>
          <section className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
              <Input
                label="邀请成员"
                type="email"
                placeholder="输入成员邮箱"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                error={inviteError}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">角色</label>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  className="h-[42px] w-full rounded-lg border border-surface-300 bg-white px-3 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
                >
                  <option value="admin">管理员</option>
                  <option value="editor">编辑</option>
                  <option value="viewer">查看者</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  fullWidth
                  onClick={() => {
                    if (!inviteEmail.trim()) {
                      setInviteError('请输入要邀请的邮箱。');
                      return;
                    }
                    setInviteError('');
                    inviteMutation.mutate();
                  }}
                  loading={inviteMutation.isPending}
                >
                  发送邀请
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
            {members.length === 0 ? (
              <EmptyState
                title="还没有成员"
                description="工作区成员会显示在这里，项目和审阅协作都基于这些成员展开。"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <Head>
                    <Row>
                      <HeaderCell>成员</HeaderCell>
                      <HeaderCell>角色</HeaderCell>
                      <HeaderCell>加入时间</HeaderCell>
                      <HeaderCell className="w-[180px]">操作</HeaderCell>
                    </Row>
                  </Head>
                  <Body>
                    {members.map((member) => {
                      const meta = roleMeta[member.role] || roleMeta.viewer;
                      const isOwner = member.id === ownerId;

                      return (
                        <Row key={member.id}>
                          <Cell>
                            <div className="flex items-center gap-3">
                              <Avatar src={member.avatar} name={member.name} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-surface-500 dark:text-surface-400">{member.email}</p>
                              </div>
                            </div>
                          </Cell>
                          <Cell>
                            {isOwner ? (
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                            ) : (
                              <select
                                value={member.role}
                                onChange={(event) => updateRoleMutation.mutate({ userId: member.id, role: event.target.value })}
                                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
                              >
                                <option value="admin">管理员</option>
                                <option value="editor">编辑</option>
                                <option value="viewer">查看者</option>
                              </select>
                            )}
                          </Cell>
                          <Cell>{formatRelativeTime(member.created_at || member.createdAt)}</Cell>
                          <Cell>
                            {isOwner ? (
                              <span className="text-sm text-surface-400">所有者不可移除</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm(`确定移除成员“${member.name}”吗？`)) {
                                    removeMemberMutation.mutate(member.id);
                                  }
                                }}
                              >
                                移除成员
                              </Button>
                            )}
                          </Cell>
                        </Row>
                      );
                    })}
                  </Body>
                </Table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
          {invites.length === 0 ? (
            <EmptyState
              title="没有待处理邀请"
              description="新的邀请发出后，会在这里显示对应的待加入记录。"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Head>
                  <Row>
                    <HeaderCell>邮箱 / 成员</HeaderCell>
                    <HeaderCell>角色</HeaderCell>
                    <HeaderCell>发起时间</HeaderCell>
                    <HeaderCell className="w-[180px]">操作</HeaderCell>
                  </Row>
                </Head>
                <Body>
                  {invites.map((invite) => {
                    const meta = roleMeta[invite.role] || roleMeta.viewer;
                    return (
                      <Row key={invite.id}>
                        <Cell>
                          <div>
                            <p className="text-sm font-medium">{invite.email || invite.name || '待加入成员'}</p>
                            {invite.name ? <p className="text-xs text-surface-500 dark:text-surface-400">{invite.name}</p> : null}
                          </div>
                        </Cell>
                        <Cell><Badge variant={meta.variant}>{meta.label}</Badge></Cell>
                        <Cell>{formatRelativeTime(invite.created_at || invite.createdAt)}</Cell>
                        <Cell>
                          <Button size="sm" variant="ghost" onClick={() => cancelInviteMutation.mutate(invite.id)}>
                            撤销邀请
                          </Button>
                        </Cell>
                      </Row>
                    );
                  })}
                </Body>
              </Table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
