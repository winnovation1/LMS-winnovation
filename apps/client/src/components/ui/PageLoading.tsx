import { Spinner } from './Spinner';
import { DashboardSkeleton } from './Skeleton';

interface PageLoadingProps {
  fullScreen?: boolean;
  label?: string;
}

export function PageLoading({ fullScreen = false, label = 'Loading workspace…' }: PageLoadingProps) {
  if (fullScreen) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Spinner size="lg" label={label} />
        <span className="font-medium text-slate-500">{label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Spinner size="sm" label={label} />
        <span>{label}</span>
      </div>
      <DashboardSkeleton />
    </div>
  );
}
