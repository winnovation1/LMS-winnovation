import { useMemo, useState, type FormEvent } from 'react';
import { Bookmark, Search, Send } from 'lucide-react';
import {
  useSendTalentMessage,
  useTalentPool,
  useToggleShortlist,
} from '../../features/hr/data';
import { ApiClientError } from '../../lib/apiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/PageLoading';

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : 'Something went wrong. Please try again.';
}

export function TalentPoolPage() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [shortlistedOnly, setShortlistedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [justSentTo, setJustSentTo] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      query: query.trim() || undefined,
      domain: domain.trim() || undefined,
      minScore,
      shortlistedOnly,
    }),
    [query, domain, minScore, shortlistedOnly]
  );

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTalentPool(filters);
  const toggleShortlist = useToggleShortlist();
  const sendMessage = useSendTalentMessage();

  const results = data?.pages.flatMap((page) => page.results) ?? [];
  const selected = results.find((r) => r.studentId === selectedId) ?? results[0];

  if (isLoading) {
    return <PageLoading />;
  }

  function openMessage() {
    setMessageBody('');
    sendMessage.reset();
    setMessageOpen(true);
  }

  function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !messageBody.trim()) return;
    const studentId = selected.studentId;
    sendMessage.mutate(
      { studentId, body: messageBody.trim() },
      {
        onSuccess: () => {
          setMessageOpen(false);
          setJustSentTo(studentId);
        },
      }
    );
  }

  const shortlistPending =
    toggleShortlist.isPending && toggleShortlist.variables === selected?.studentId;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Talent Pool</h1>
      <p className="mb-6 text-sm text-slate-500">
        Search and filter Builder Profiles across all colleges.
      </p>

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or skill..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Input
            className="sm:w-40"
            placeholder="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            Min Score
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24"
            />
            <span className="w-8 text-slate-500">{minScore}</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={shortlistedOnly}
              onChange={(e) => setShortlistedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Shortlisted only
          </label>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm text-slate-500">
            {results.length} results{isFetching && !isFetchingNextPage ? ' · updating…' : ''}
          </p>
          <Card className="p-0">
            <div className="flex flex-col divide-y divide-slate-100 p-4">
              {results.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  {shortlistedOnly ? 'No shortlisted candidates yet.' : 'No matches yet.'}
                </p>
              )}
              {results.map((profile) => (
                <button
                  key={profile.studentId}
                  type="button"
                  onClick={() => setSelectedId(profile.studentId)}
                  className={`flex items-center justify-between gap-3 py-4 text-left first:pt-0 last:pb-0 ${
                    selected?.studentId === profile.studentId ? 'text-blue-700' : ''
                  }`}
                >
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      {profile.name}
                      {profile.shortlisted && (
                        <Bookmark size={13} className="text-blue-600" fill="currentColor" />
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{profile.domain ?? 'No domain set'}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} tone="blue">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{profile.score}</span>
                </button>
              ))}
            </div>
          </Card>
          {hasNextPage && (
            <Button
              variant="secondary"
              className="mt-4 w-full"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          )}
        </div>

        {selected && (
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
            <p className="text-sm text-slate-500">
              {selected.domain ?? 'No domain set'}
              {selected.collegeName ? ` · ${selected.collegeName}` : ''}
            </p>
            {selected.course && <p className="mt-2 text-sm text-slate-600">{selected.course}</p>}

            <div className="my-4 flex flex-wrap gap-2">
              {selected.skills.length === 0 && (
                <span className="text-xs text-slate-400">No skills listed yet.</span>
              )}
              {selected.skills.map((skill) => (
                <Badge key={skill} tone="blue">
                  {skill}
                </Badge>
              ))}
            </div>

            <div className="mb-6 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Builder Score: <span className="font-semibold">{selected.score}</span>
            </div>

            {selected.linkedIn && (
              <a
                href={selected.linkedIn}
                target="_blank"
                rel="noreferrer"
                className="mb-6 block text-sm text-blue-600 hover:underline"
              >
                View LinkedIn profile
              </a>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={shortlistPending}
                onClick={() => toggleShortlist.mutate(selected.studentId)}
              >
                <Bookmark size={16} fill={selected.shortlisted ? 'currentColor' : 'none'} />
                {selected.shortlisted ? 'Shortlisted' : 'Shortlist'}
              </Button>
              <Button className="flex-1" onClick={openMessage}>
                <Send size={16} /> {selected.messaged ? 'Message Again' : 'Send Message'}
              </Button>
            </div>
            {toggleShortlist.isError && (
              <p className="mt-3 text-xs text-red-600">{errorMessage(toggleShortlist.error)}</p>
            )}
            {justSentTo === selected.studentId && (
              <p className="mt-3 text-xs text-green-600">
                Message sent. {selected.name} will see it in their notifications.
              </p>
            )}
          </Card>
        )}
      </div>

      <Modal open={messageOpen && !!selected} onClose={() => setMessageOpen(false)}>
        <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Message {selected?.name}</h2>
            <p className="text-xs text-slate-500">
              Delivered as an in-app notification to the student.
            </p>
          </div>
          <textarea
            autoFocus
            required
            rows={5}
            maxLength={2000}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Introduce your company and the role you'd like to discuss..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {sendMessage.isError && (
            <p className="text-xs text-red-600">{errorMessage(sendMessage.error)}</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setMessageOpen(false)}
              disabled={sendMessage.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={sendMessage.isPending || !messageBody.trim()}
            >
              <Send size={16} /> {sendMessage.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
