import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, FolderKanban, HardDrive, Users } from 'lucide-react';
import client from '../api/client';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Skeleton from '../components/ui/Skeleton';
import Table, { Body, Cell, Head, HeaderCell, Row } from '../components/ui/Table';
import { formatBytes, formatRelativeTime } from '../lib/utils';

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <Card className="rounded-[24px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">{detail}</p>
        </div>
        <div className="rounded-2xl bg-surface-900 p-3 text-white dark:bg-surface-100 dark:text-surface-900">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-36 w-full rounded-[28px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-[420px] w-full rounded-[26px]" />
    </div>
  );
}

export default function AdminPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await client.get('/admin/stats');
      return response.data?.data || response.data || {};
    },
  });

  const activityQuery = useQuery({
    queryKey: ['admin-activity-logs', page],
    queryFn: async () => {
      const response = await client.get('/admin/activity-logs', {
        params: { page, per_page: pageSize },
      });
      return response.data?.data || response.data || { data: [], total: 0, page: 1, per_page: pageSize };
    },
  });

  const logs = activityQuery.data?.data || [];
  const total = activityQuery.data?.total || 0;
  const stats = statsQuery.data || {};

  if (statsQuery.isLoading || activityQuery.isLoading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">管理后台</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">系统规模、健康状态与关键活动</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-500 dark:text-surface-400">
          后台页不做复杂流程改写，但会与主链路页面保持一致的设计语言和信息层级。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="用户总数" value={stats.users ?? 0} detail={`近 30 天新增 ${stats.recentUsers ?? 0} 人`} />
        <StatCard icon={FolderKanban} label="工作区 / 项目" value={`${stats.workspaces ?? 0} / ${stats.projects ?? 0}`} detail="系统中的协作空间与项目规模。" />
        <StatCard icon={Database} label="素材总数" value={stats.assets ?? 0} detail="当前所有未删除素材总量。" />
        <StatCard icon={HardDrive} label="存储使用" value={formatBytes(stats.storageBytes ?? 0)} detail="按素材累计体积估算。" />
      </section>

      <section className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">系统活动日志</h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              这里展示最近的关键行为记录，方便快速排查当前系统动态。
            </p>
          </div>
          <Badge variant="info">{total} 条记录</Badge>
        </div>

        <div className="mt-5">
          {logs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="暂无活动日志"
              description="系统开始产生关键操作后，这里会显示对应记录。"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <Head>
                    <Row>
                      <HeaderCell>用户</HeaderCell>
                      <HeaderCell>动作</HeaderCell>
                      <HeaderCell>资源类型</HeaderCell>
                      <HeaderCell>时间</HeaderCell>
                    </Row>
                  </Head>
                  <Body>
                    {logs.map((log) => (
                      <Row key={log.id}>
                        <Cell>{log.user?.name || '系统'}</Cell>
                        <Cell>
                          <div className="flex items-center gap-2">
                            <Activity size={14} className="text-surface-400" />
                            <span>{log.action || '-'}</span>
                          </div>
                        </Cell>
                        <Cell>{log.subjectType || log.resource_type || '-'}</Cell>
                        <Cell>{formatRelativeTime(log.createdAt || log.created_at)}</Cell>
                      </Row>
                    ))}
                  </Body>
                </Table>
              </div>

              <div className="mt-5">
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} showPageSize={false} />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
