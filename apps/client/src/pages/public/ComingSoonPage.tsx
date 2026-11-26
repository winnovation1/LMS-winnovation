import { Clock, LogOut, Sparkles, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../auth/roleHome';
import { Button } from '../../components/ui/Button';

interface ComingSoonPageProps {
  title?: string;
  description?: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const { user, logout } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role] : 'Ecosystem';

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4">
      <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-lg backdrop-blur-md">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Sparkles size={26} />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Clock size={12} /> Coming Soon · Phase 2
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          {title ?? `${roleLabel} Portal`}
        </h1>

        <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
          {description ??
            `We are currently polishing our core LMS, Mentor, Trainer, and HR portals for launch. The ${roleLabel} experience is scheduled for Phase 2 and will be unlocked soon.`}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/account">
            <Button variant="primary">
              <UserCircle2 size={16} /> View My Account
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => void logout()}>
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
