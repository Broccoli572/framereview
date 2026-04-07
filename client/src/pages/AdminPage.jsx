import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FolderOpen, Film, HardDrive, Clock, Activity, User
} from 'lucide-react';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Table, { Head, Body, Row, HeaderCell, Cell } from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import Avatar from '../components/ui/Avatar';
import { formatBytes, formatRelativeTime } from '../lib/utils';

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colorClasses = {
    brand: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-surface-400">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const [activityPage, setActivityPage] = useState(1);
  const pageSize = 15;

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await client.get('/admin/stats');
      return res.data?.data || res.data || {};
    },
  });

  // Activity logs
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-activity', activityPage],
    queryFn: async () => {
      const res = await client.get('/admin/activity', {
        params: { page: activityPage, per_page: pageSize },
      });
      return res.data?.data || res.data || { data: [], total: 0, last_page: 1 };
    },
  });

  const activities = activityData?.data || activityData || [];
  const totalPages = activityData?.last_page || Math.ceil((activityData?.total || 0) / pageSize) || 1;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">管理后台</h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">系统概览与活动日志</p>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" text="加载统计数据..." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            icon={Users}
            label="用户总数"
            value={stats.users_count ?? stats.total_users ?? '-'}
            sub={stats.active_users ? `${stats.active_users} 活跃` : undefined}
            color="brand"
          />
          <StatCard
            icon={FolderOpen}
            label="项目总数"
            value={stats.projects_count ?? stats.total_projects ?? '-'}
            sub={stats.active_projects ? `${stats.active_projects} 进行中` : undefined}
            color="emerald"
          />
          <StatCard
            icon={Film}
            label="资源总数"
            value={stats.assets_count ?? stats.total_assets ?? '-'}
            sub={stats.processing_assets ? `${stats.processing_assets} 处理中` : undefined}
            color="amber"
          />
          <StatCard
            icon={HardDrive}
            label="存储使用"
            value={stats.storage_used ? formatBytes(stats.storage_used) : '-'}
            sub={stats.storage_limit ? `/ ${formatBytes(stats.storage_limit)}` : undefined}
            color="violet"
          />
        </div>
      )}

      {/* Activity log */}
      <Card>
        <Card.Header className="mb-0">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            活动日志
          </h2>
        </Card.Header>

        {activityLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner text="加载活动日志..." />
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-sm text-surface-400">
            暂无活动记录
          </div>
        ) : (
          <>
            <Table className="mt-4">
              <Head>
                <Row>
                  <HeaderCell>用户</HeaderCell>
                  <HeaderCell>操作</HeaderCell>
                  <HeaderCell>描述</HeaderCell>
                  <HeaderCell>时间</HeaderCell>
                </Row>
              </Head>
              <Body>
                {activities.map((log) => (
                  <Row key={log.id}>
                    <Cell>
                      <div className="flex items-center gap-2">
                        <Avatar src={log.user?.avatar} name={log.user?.name || log.actor?.name} size="sm" />
                        <span className="font-medium text-surface-900 dark:text-surface-100">
                          {log.user?.name || log.actor?.name || '系统'}
                        </span>
                      </div>
                    </Cell>
                    <Cell>
                      <Badge variant={
                        log.type === 'create' ? 'success' :
                        log.type === 'delete' ? 'danger' :
                        log.type === 'update' ? 'warning' :
                        'default'
                      }>
                        {log.action || log.type || '-'}
                      </Badge>
                    </Cell>
                    <Cell>
                      <span className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
                        {log.description || log.subject_type || '-'}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="text-xs text-surface-500">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </Cell>
                  </Row>
                ))}
              </Body>
            </Table>

            <div className="mt-4 flex justify-center">
              <Pagination
                page={activityPage}
                totalPages={totalPages}
                onPageChange={setActivityPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
