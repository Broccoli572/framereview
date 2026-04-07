import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadCloud, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button';
import ProgressBar from './ProgressBar';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

function FileUpload({
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  disabled = false,
  onFilesSelected,
  label = 'Drag and drop files here, or click to browse',
  hint,
  compact = false,
  className,
  wrapperClassName,
}) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    (fileList) => {
      const newFiles = Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending',
        error: null,
      }));

      const combined = [...files, ...newFiles];
      if (maxFiles && combined.length > maxFiles) {
        return;
      }

      const validated = newFiles.filter((f) => {
        if (maxSize && f.size > maxSize) {
          f.status = 'error';
          f.error = `File exceeds maximum size of ${formatFileSize(maxSize)}`;
          return true;
        }
        return true;
      });

      setFiles((prev) => [...prev, ...validated]);
      onFilesSelected?.(newFiles.map((f) => f.file));
      simulateUpload(validated.filter((f) => f.status === 'pending'));
    },
    [files, maxSize, maxFiles, onFilesSelected]
  );

  const simulateUpload = useCallback((pendingFiles) => {
    pendingFiles.forEach((fileItem) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, progress: 100, status: 'complete' } : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, progress: Math.round(progress), status: 'uploading' } : f
            )
          );
        }
      }, 200);
    });
  }, []);

  const removeFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [disabled, addFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e) => {
      if (e.target.files?.length) {
        addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles]
  );

  useEffect(() => {
    const handleWindowDrag = (e) => {
      e.preventDefault();
    };
    if (dragActive) {
      window.addEventListener('dragover', handleWindowDrag);
      window.addEventListener('drop', handleWindowDrag);
    }
    return () => {
      window.removeEventListener('dragover', handleWindowDrag);
      window.removeEventListener('drop', handleWindowDrag);
    };
  }, [dragActive]);

  const acceptedTypes = accept
    ? accept
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className={wrapperClassName}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload area"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={clsx(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed',
          'transition-all duration-200',
          compact ? 'px-4 py-6' : 'px-6 py-10',
          disabled
            ? 'cursor-not-allowed border-surface-200 bg-surface-50 opacity-50 dark:border-surface-700 dark:bg-surface-800/50'
            : dragActive
            ? 'cursor-pointer border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/20'
            : 'cursor-pointer border-surface-300 bg-surface-50 hover:border-brand-300 hover:bg-brand-50/50 dark:border-surface-600 dark:bg-surface-800/50 dark:hover:border-brand-600 dark:hover:bg-brand-950/10',
          className
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30',
            compact ? 'mb-2 h-8 w-8' : 'mb-3 h-12 w-12'
          )}
        >
          <UploadCloud
            size={compact ? 16 : 24}
            className={clsx(
              dragActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-brand-500'
            )}
            aria-hidden="true"
          />
        </div>
        <p
          className={clsx(
            'text-center font-medium',
            compact ? 'text-xs' : 'text-sm',
            dragActive
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-surface-700 dark:text-surface-200'
          )}
        >
          {label}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">{hint}</p>
        )}
        {!compact && (
          <div className="mt-2">
            <Button size="sm" variant="secondary" disabled={disabled} onClick={(e) => e.stopPropagation()}>
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className={clsx(
                'flex items-center gap-3 rounded-lg border px-3 py-2',
                fileItem.status === 'error'
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                  : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800'
              )}
            >
              <File
                size={16}
                className={clsx(
                  'shrink-0',
                  fileItem.status === 'complete'
                    ? 'text-green-500'
                    : fileItem.status === 'error'
                    ? 'text-red-500'
                    : 'text-surface-400'
                )}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-surface-700 dark:text-surface-200">
                  {fileItem.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400 dark:text-surface-500">
                    {formatFileSize(fileItem.size)}
                  </span>
                  {fileItem.status === 'uploading' && (
                    <ProgressBar value={fileItem.progress} size="sm" variant="brand" className="flex-1" />
                  )}
                  {fileItem.status === 'complete' && (
                    <CheckCircle2 size={12} className="text-green-500" aria-label="Upload complete" />
                  )}
                  {fileItem.status === 'error' && (
                    <AlertCircle size={12} className="text-red-500" aria-label={fileItem.error} />
                  )}
                </div>
                {fileItem.error && (
                  <p className="text-xs text-red-500">{fileItem.error}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(fileItem.id)}
                className="shrink-0 rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
                aria-label={`Remove ${fileItem.name}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
