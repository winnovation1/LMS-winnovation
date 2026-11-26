import { useState } from 'react';
import { Calendar, ExternalLink, FileCode, Layers, Star, Target, UserCheck } from 'lucide-react';
import {
  useAddSprintFeedback,
  useCompleteSprint,
  useMentorTeams,
  useTeamDetails,
} from '../../features/mentor/hooks';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressDonut } from '../../components/ui/ProgressDonut';
import { PageLoading } from '../../components/ui/PageLoading';

export function TeamsPage() {
  const { data: teams, isLoading: teamsLoading } = useMentorTeams();
  const { data: details, isLoading: detailsLoading } = useTeamDetails();
  const addFeedback = useAddSprintFeedback();
  const completeSprint = useCompleteSprint();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedTeam = teams?.find((t) => t.id === selectedId) ?? teams?.[0];
  const detail = selectedTeam ? details?.[selectedTeam.id] : undefined;

  if (teamsLoading || detailsLoading || !teams) {
    return <PageLoading />;
  }

  async function handleSubmitFeedback() {
    if (!detail?.currentSprintId || !feedbackComment.trim()) return;
    setActionError(null);
    try {
      await addFeedback.mutateAsync({
        sprintId: detail.currentSprintId,
        comment: feedbackComment.trim(),
        rating,
      });
      setFeedbackComment('');
    } catch {
      setActionError('Could not submit feedback. Please try again.');
    }
  }

  async function handleMarkComplete() {
    if (!detail?.currentSprintId) return;
    setActionError(null);
    try {
      await completeSprint.mutateAsync(detail.currentSprintId);
    } catch {
      setActionError('Could not mark this sprint complete.');
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Teams Assigned</h1>
      <p className="mb-6 text-sm text-slate-500">Your Citadel teams and their sprint progress.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <div className="flex flex-col divide-y divide-slate-100 p-4">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedId(team.id)}
                className={`flex items-center gap-4 py-4 text-left first:pt-0 last:pb-0 ${
                  (selectedTeam?.id ?? teams[0]?.id) === team.id ? 'text-blue-700' : ''
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700">
                  {team.letter}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{team.name}</p>
                  <p className="text-xs text-slate-500">{team.memberCount} Students</p>
                </div>
                <span className="w-10 text-right text-xs text-slate-500">
                  {team.progressPercent}%
                </span>
              </button>
            ))}
          </div>
        </Card>

        {detail && selectedTeam && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{detail.name}</h2>
                <p className="text-sm text-slate-500">{detail.currentSprint}</p>
              </div>
              <ProgressDonut percent={selectedTeam.progressPercent} size={64} strokeWidth={7} />
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <Target size={16} className="text-slate-400" /> {detail.problemStatementTitle}
            </div>

            <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
              <UserCheck size={16} className="text-slate-400" /> Trainer: {detail.trainerName}
            </div>

            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-700">Sprint Progress</span>
                <span className="text-slate-500">{selectedTeam.progressPercent}%</span>
              </div>
              <ProgressBar percent={selectedTeam.progressPercent} />
            </div>

            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Layers size={14} /> Team Members
            </h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {detail.members.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-slate-800">{member.name}</span>
                  <span className="text-xs text-slate-400">{member.role}</span>
                </div>
              ))}
            </div>

            {detail.currentSprintId && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {actionError && <p className="mb-2 text-xs text-red-600">{actionError}</p>}
                {detail.currentSprintStatus === 'submitted' && (
                  <>
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                          <FileCode size={14} /> Submitted Milestone Deliverables
                        </span>
                        {detail.latestSubmission?.createdAt && (
                          <span className="text-[11px] text-slate-400">
                            {new Date(detail.latestSubmission.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {detail.latestSubmission?.artifactUrls && detail.latestSubmission.artifactUrls.length > 0 ? (
                        <div className="space-y-2">
                          {detail.latestSubmission.artifactUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-blue-600 transition hover:border-blue-300 hover:bg-blue-50/70"
                            >
                              <span className="truncate pr-2 font-medium">{url}</span>
                              <ExternalLink size={13} className="shrink-0 text-slate-400 transition group-hover:text-blue-600" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No external deliverables attached.</p>
                      )}

                      {detail.latestSubmission?.demoDate && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            Demo Date:{' '}
                            {new Date(detail.latestSubmission.demoDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="mb-2 text-sm font-semibold text-slate-900">
                      Review this sprint's submission
                    </h3>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={3}
                      placeholder="Leave feedback on the submitted deliverables and milestone…"
                      className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Milestone Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-0.5 text-amber-400 transition hover:scale-110"
                          >
                            <Star
                              size={16}
                              className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSubmitFeedback}
                      disabled={addFeedback.isPending || !feedbackComment.trim()}
                    >
                      {addFeedback.isPending ? 'Submitting…' : 'Submit Feedback & Approve Review'}
                    </Button>
                  </>
                )}
                {detail.currentSprintStatus === 'reviewed' && (
                  <>
                    {detail.latestSubmission?.artifactUrls && detail.latestSubmission.artifactUrls.length > 0 && (
                      <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <FileCode size={13} /> Reviewed Artifacts
                        </div>
                        <div className="space-y-1">
                          {detail.latestSubmission.artifactUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-mono text-blue-600 hover:underline"
                            >
                              <ExternalLink size={12} /> {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <Badge tone="amber">Reviewed — ready to complete</Badge>
                    <Button
                      className="mt-2 w-full"
                      onClick={handleMarkComplete}
                      disabled={completeSprint.isPending}
                    >
                      {completeSprint.isPending ? 'Completing…' : 'Mark Sprint Complete'}
                    </Button>
                  </>
                )}
                {detail.currentSprintStatus === 'in_progress' && (
                  <p className="text-xs text-slate-400">
                    Waiting on the team to submit this sprint's milestone.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
