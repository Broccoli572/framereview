import { formatBytes, formatDuration, formatRelativeTime, getMediaType, repairMojibakeText } from './utils';

const ASSET_STATUS_META = {
  queued: {
    key: 'queued',
    label: '排队中',
    variant: 'default',
    description: '等待处理',
  },
  uploading: {
    key: 'uploading',
    label: '上传中',
    variant: 'warning',
    description: '文件已接收',
  },
  processing: {
    key: 'processing',
    label: '处理中',
    variant: 'warning',
    description: '正在生成预览',
  },
  ready: {
    key: 'ready',
    label: '可审阅',
    variant: 'success',
    description: '可进入审阅',
  },
  failed: {
    key: 'failed',
    label: '失败',
    variant: 'danger',
    description: '处理失败，可重试',
  },
  archived: {
    key: 'archived',
    label: '已归档',
    variant: 'info',
    description: '已归档',
  },
  deleted: {
    key: 'deleted',
    label: '已删除',
    variant: 'default',
    description: '已移除',
  },
};

const REVIEW_APPROVAL_META = {
  pending: {
    key: 'pending',
    label: '待开始',
    variant: 'default',
  },
  needs_review: {
    key: 'needs_review',
    label: '待处理',
    variant: 'warning',
  },
  approved: {
    key: 'approved',
    label: '已通过',
    variant: 'success',
  },
  rejected: {
    key: 'rejected',
    label: '未通过',
    variant: 'danger',
  },
  no_version: {
    key: 'no_version',
    label: '无版本',
    variant: 'default',
  },
};

const EMPTY_CONTEXT = {
  title: '',
  subtitle: '',
  breadcrumb: [],
  primaryAction: null,
};

function getProjectStatusMeta(status) {
  return status === 'archived'
    ? { label: '已归档', variant: 'warning' }
    : { label: '进行中', variant: 'success' };
}

export function normalizeAssetStatus(status) {
  const raw = String(status || '').trim().toLowerCase();

  if (!raw) return 'queued';
  if (['queued', 'pending'].includes(raw)) return 'queued';
  if (raw === 'uploading') return 'uploading';
  if (['processing', 'transcoding', 'analyzing'].includes(raw)) return 'processing';
  if (['ready', 'completed', 'complete', 'done', 'active'].includes(raw)) return 'ready';
  if (['failed', 'error'].includes(raw)) return 'failed';
  if (raw === 'archived') return 'archived';
  if (['deleted', 'removed'].includes(raw)) return 'deleted';

  return raw;
}

export function getAssetStatusMeta(status) {
  const key = normalizeAssetStatus(status);
  return ASSET_STATUS_META[key] || ASSET_STATUS_META.queued;
}

export function getReviewApprovalMeta(status) {
  const key = String(status || 'pending').trim().toLowerCase();
  return REVIEW_APPROVAL_META[key] || REVIEW_APPROVAL_META.pending;
}

export function canRetryAsset(asset) {
  return normalizeAssetStatus(asset?.status) === 'failed' && Boolean(asset?.id);
}

export function isProcessingAsset(asset) {
  return normalizeAssetStatus(asset?.status) === 'processing';
}

export function getAssetPreviewUrl(asset) {
  return (
    asset?.thumbnailUrl ||
    asset?.thumbnail_url ||
    asset?.preview?.posterUrl ||
    asset?.preview?.poster_url ||
    asset?.posterUrl ||
    null
  );
}

export function normalizeAsset(asset) {
  const statusMeta = getAssetStatusMeta(asset?.status);
  const duration = Number(asset?.durationSeconds ?? asset?.duration ?? 0) || 0;
  const sizeBytes = Number(asset?.sizeBytes ?? asset?.size_bytes ?? asset?.size ?? 0) || 0;
  const updatedAt = asset?.updatedAt || asset?.updated_at || asset?.createdAt || asset?.created_at || null;
  const rawName = asset?.name || asset?.originalName || asset?.original_name || '未命名素材';
  const displayName = repairMojibakeText(rawName);
  const rawOriginalName = asset?.originalName || asset?.original_name || null;
  const previewMetadata = asset?.previewMetadata || asset?.preview_metadata || asset?.preview?.metadata || null;
  const metadata = asset?.metadata || previewMetadata || {};
  const width = Number(metadata?.width || metadata?.video?.width || metadata?.streams?.video?.width || 0) || 0;
  const height = Number(metadata?.height || metadata?.video?.height || metadata?.streams?.video?.height || 0) || 0;
  const displayDuration = duration || Number(metadata?.duration || 0) || 0;
  const mediaType = getMediaType(asset?.mimeType || asset?.mime_type || asset?.type, displayName);

  return {
    raw: asset,
    id: asset?.id || '',
    name: asset?.name || asset?.originalName || asset?.original_name || '未命名素材',
    originalName: asset?.originalName || asset?.original_name || null,
    mediaType,
    status: statusMeta.key,
    statusLabel: statusMeta.label,
    statusVariant: statusMeta.variant,
    statusDescription: statusMeta.description,
    duration,
    durationLabel: duration ? formatDuration(duration) : '--',
    sizeBytes,
    sizeLabel: sizeBytes ? formatBytes(sizeBytes) : '--',
    updatedAt,
    updatedLabel: updatedAt ? formatRelativeTime(updatedAt) : '刚刚',
    createdAt: asset?.createdAt || asset?.created_at || null,
    thumbnailUrl: getAssetPreviewUrl(asset),
    previewUrl: asset?.previewUrl || asset?.preview_url || asset?.fileUrl || asset?.file_url || asset?.preview?.proxyUrl || asset?.preview?.hlsUrl || null,
    reviewPath: asset?.id ? `/review/${asset.id}` : null,
    folderId: asset?.folderId || asset?.folder_id || asset?.folder?.id || null,
    folderName: asset?.folder?.name || null,
    creatorName: asset?.creator?.name || asset?.uploader?.name || null,
    projectId: asset?.projectId || asset?.project_id || asset?.project?.id || null,
    projectName: asset?.project?.name || null,
    workspaceId: asset?.workspaceId || asset?.workspace_id || asset?.workspace?.id || null,
    workspaceName: asset?.workspace?.name || null,
    name: displayName,
    originalName: rawOriginalName ? repairMojibakeText(rawOriginalName) : null,
    updatedLabel: updatedAt ? formatRelativeTime(updatedAt) : '刚刚',
    width,
    height,
    duration: displayDuration,
    durationLabel: displayDuration ? formatDuration(displayDuration) : '--',
    aspectRatio: width > 0 && height > 0 ? `${width} / ${height}` : '16 / 9',
    canRetry: canRetryAsset(asset),
    isProcessing: isProcessingAsset(asset),
  };
}

export function normalizeReviewThread(thread) {
  const comments = (thread?.comments || []).map((comment) => ({
    ...comment,
    id: comment?.id,
    body: comment?.content || comment?.body || '',
    createdAt: comment?.createdAt || comment?.created_at || null,
    user: comment?.user || null,
  }));

  const firstComment = comments[0] || null;
  const timecode = Number(thread?.timecodeSeconds ?? thread?.timecode ?? 0) || 0;
  const status = thread?.status === 'resolved' ? 'resolved' : 'open';

  return {
    raw: thread,
    id: thread?.id || '',
    timecode,
    timecodeLabel: formatDuration(timecode),
    status,
    resolved: status === 'resolved',
    commentCount: comments.length,
    firstComment,
    previewText: firstComment?.body || '暂无内容',
    createdAt: firstComment?.createdAt || thread?.createdAt || thread?.created_at || null,
    author: firstComment?.user || null,
    resolver: thread?.resolver || null,
    comments,
  };
}

export function normalizeSearchResults(payload = {}) {
  const assets = (payload.assets || []).map((item) => {
    const asset = normalizeAsset(item);
    const mediaLabel = {
      video: '视频',
      audio: '音频',
      image: '图片',
      document: '文档',
      other: '素材',
    }[asset.mediaType] || '素材';

    return {
      id: item.id,
      type: 'asset',
      title: asset.name,
      subtitle: `${mediaLabel} · ${asset.statusLabel}`,
      meta: [asset.duration ? asset.durationLabel : null, asset.sizeBytes ? asset.sizeLabel : null, asset.updatedLabel]
        .filter(Boolean)
        .join(' · '),
      href: `/review/${item.id}`,
      contextLabel: '素材',
      statusLabel: asset.statusLabel,
      statusVariant: asset.statusVariant,
      thumbnailUrl: asset.thumbnailUrl,
      raw: item,
    };
  });

  const projects = (payload.projects || []).map((item) => {
    const projectStatus = getProjectStatusMeta(item.status);

    return {
      id: item.id,
      type: 'project',
      title: item.name || '未命名项目',
      subtitle: '项目',
      meta: [projectStatus.label, item.createdAt ? formatRelativeTime(item.createdAt) : null]
        .filter(Boolean)
        .join(' · '),
      href: `/project/${item.id}`,
      contextLabel: '项目',
      statusLabel: projectStatus.label,
      statusVariant: projectStatus.variant,
      thumbnailUrl: null,
      raw: item,
    };
  });

  const folders = (payload.folders || []).map((item) => ({
    id: item.id,
    type: 'folder',
    title: item.name || '未命名文件夹',
    subtitle: '文件夹',
    meta: item.createdAt ? `创建于 ${formatRelativeTime(item.createdAt)}` : '文件夹',
    href: item.project_id ? `/project/${item.project_id}` : null,
    contextLabel: '文件夹',
    statusLabel: null,
    statusVariant: 'default',
    thumbnailUrl: null,
    raw: item,
  }));

  return {
    assets,
    projects,
    folders,
    all: [...assets, ...projects, ...folders],
  };
}

export function getPageContext({ pathname, workspace, project, asset }) {
  if (!pathname) return EMPTY_CONTEXT;

  if (pathname === '/') {
    return {
      title: '工作台',
      subtitle: '工作区与项目',
      breadcrumb: [{ label: '工作台', href: '/' }],
      primaryAction: { label: '进入工作区', href: '/' },
    };
  }

  if (pathname.startsWith('/search')) {
    return {
      title: '搜索',
      subtitle: '素材、项目、文件夹',
      breadcrumb: [{ label: '工作台', href: '/' }, { label: '搜索', href: '/search' }],
      primaryAction: null,
    };
  }

  if (pathname.startsWith('/w/') && pathname.endsWith('/settings')) {
    return {
      title: '设置',
      subtitle: '成员与权限',
      breadcrumb: [
        { label: '工作台', href: '/' },
        workspace?.id ? { label: workspace.name || '工作区', href: `/w/${workspace.id}` } : null,
        { label: '设置', href: pathname },
      ].filter(Boolean),
      primaryAction: null,
    };
  }

  if (pathname.startsWith('/w/')) {
    return {
      title: workspace?.name || '工作区',
      subtitle: '项目列表',
      breadcrumb: [{ label: '工作台', href: '/' }, { label: workspace?.name || '工作区', href: pathname }],
      primaryAction: workspace?.id ? { label: '新建项目', href: `/w/${workspace.id}` } : null,
    };
  }

  if (pathname.startsWith('/project/') && pathname.endsWith('/upload')) {
    return {
      title: '上传',
      subtitle: '文件进入后台处理',
      breadcrumb: [
        { label: '工作台', href: '/' },
        project?.workspaceId ? { label: project.workspaceName || '工作区', href: `/w/${project.workspaceId}` } : null,
        project?.id ? { label: project.name || '项目', href: `/project/${project.id}` } : null,
        { label: '上传', href: pathname },
      ].filter(Boolean),
      primaryAction: project?.id ? { label: '返回项目', href: `/project/${project.id}` } : null,
    };
  }

  if (pathname.startsWith('/project/')) {
    return {
      title: project?.name || '项目',
      subtitle: '素材与状态',
      breadcrumb: [
        { label: '工作台', href: '/' },
        project?.workspaceId ? { label: project.workspaceName || '工作区', href: `/w/${project.workspaceId}` } : null,
        { label: project?.name || '项目', href: pathname },
      ].filter(Boolean),
      primaryAction: project?.id ? { label: '上传素材', href: `/project/${project.id}/upload` } : null,
    };
  }

  if (pathname.startsWith('/review/')) {
    return {
      title: asset?.name || '审阅',
      subtitle: '预览与批注',
      breadcrumb: [
        { label: '工作台', href: '/' },
        asset?.workspaceId ? { label: asset.workspaceName || '工作区', href: `/w/${asset.workspaceId}` } : null,
        asset?.projectId ? { label: asset.projectName || '项目', href: `/project/${asset.projectId}` } : null,
        { label: asset?.name || '审阅', href: pathname },
      ].filter(Boolean),
      primaryAction: asset?.projectId ? { label: '返回项目', href: `/project/${asset.projectId}` } : null,
    };
  }

  if (pathname.startsWith('/admin')) {
    return {
      title: '后台',
      subtitle: '系统与活动',
      breadcrumb: [{ label: '工作台', href: '/' }, { label: '后台', href: pathname }],
      primaryAction: null,
    };
  }

  return EMPTY_CONTEXT;
}
