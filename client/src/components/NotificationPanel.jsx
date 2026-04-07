import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import { formatDate, cn } from '../lib/utils';
import { X, CheckCheck, Bell, MessageSquare, UserPlus, AlertCircle } from 'lucide-react';

export default function NotificationPanel({ onClose }) {
  const queryClient = useQueryClient();
  const panelRef = useRef(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ per_page: 20 }),
  });

  const notifications = response?.data?.data || response?.data || [];

  const markReadMutation = useMutation({
    mutationFn: (id) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  function getNotificationIcon(type) {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'mention':
        return <MessageSquare className="h-4 w-4 text-brand-500" />;
      case 'invite':
        return <UserPlus className="h-4 w-4 text-emerald-500" />;
      default:
        return <Bell className="h-4 w-4 text-surface-400" />;
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-white">通知</h3>
        <div className="flex items-center gap-1">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
            >
              <CheckCheck className="inline h-3 w-3 mr-1" />
              全部已读
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-300 border-t-brand-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-surface-300 dark:text-surface-600" />
            <p className="text-sm text-surface-500 dark:text-surface-400">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => !notification.read && markReadMutation.mutate(notification.id)}
                className={cn(
                  'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50',
                  !notification.read && 'bg-brand-50/50 dark:bg-brand-900/10'
                )}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm leading-snug',
                    !notification.read
                      ? 'font-medium text-surface-900 dark:text-white'
                      : 'text-surface-600 dark:text-surface-300'
                  )}>
                    {notification.title || notification.data?.title || notification.body}
                  </p>
                  {notification.body && notification.title && (
                    <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400 line-clamp-2">
                      {notification.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                    {formatDate(notification.created_at, 'relative')}
                  </p>
                </div>
                {!notification.read && (
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
