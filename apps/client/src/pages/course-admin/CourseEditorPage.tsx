import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  parseYouTubeVideoId,
  youTubeThumbnailUrl,
  type CourseDeliveryMode,
  type SyllabusDayDto,
} from '@forge-loom/shared-types';
import {
  useAssignableTrainers,
  useCourse,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useUpdateCourseStatus,
} from '../../features/course-admin/hooks';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoading } from '../../components/ui/PageLoading';
import { ApiClientError } from '../../lib/apiClient';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { useUnsavedChangesGuard } from '../../lib/useUnsavedChangesGuard';

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  deliveryMode: 'Delivery mode',
  durationHours: 'Duration (hours)',
  durationDays: 'Duration (days)',
  price: 'Price',
  currency: 'Currency',
  syllabus: 'Syllabus',
  trainerEmail: 'Trainer',
};

function renumber(days: SyllabusDayDto[]): SyllabusDayDto[] {
  return days.map((day, index) => ({ ...day, dayNumber: index + 1 }));
}

// Sentinel for "the current trainer isn't in the active list (e.g. suspended)
// — leave the assignment as it is".
const KEEP_CURRENT_TRAINER = '__keep__';

function hasInvalidVideo(day: SyllabusDayDto): boolean {
  const value = day.youtubeVideoId?.trim();
  return Boolean(value) && parseYouTubeVideoId(value!) === null;
}

interface FormSnapshot {
  title: string;
  description: string;
  deliveryMode: CourseDeliveryMode;
  durationHours: string;
  durationDays: string;
  price: string;
  currency: string;
  syllabus: SyllabusDayDto[];
  trainerEmail: string;
}

// Comparable form of the editor state, used to detect unsaved changes. Blank
// optional fields are normalized so "never typed" and "typed then cleared"
// compare equal.
function snapshotKey(form: FormSnapshot): string {
  return JSON.stringify({
    ...form,
    syllabus: form.syllabus.map((day) => [
      day.id ?? null,
      day.title,
      day.description ?? '',
      day.youtubeVideoId ?? '',
    ]),
  });
}

export function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const { data: existing, isLoading, error: loadError } = useCourse(id);
  const { data: trainers, isLoading: trainersLoading } = useAssignableTrainers();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(id ?? '');
  const updateStatus = useUpdateCourseStatus(id ?? '');
  const deleteCourse = useDeleteCourse(id ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<CourseDeliveryMode>('online');
  const [durationHours, setDurationHours] = useState('0');
  const [durationDays, setDurationDays] = useState('0');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [syllabus, setSyllabus] = useState<SyllabusDayDto[]>([]);
  // '' = no trainer; otherwise a trainer email or KEEP_CURRENT_TRAINER.
  const [trainerEmail, setTrainerEmail] = useState('');
  const [initialTrainerEmail, setInitialTrainerEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setDeliveryMode(existing.deliveryMode);
    setDurationHours(String(existing.durationHours));
    setDurationDays(String(existing.durationDays));
    setPrice(String(existing.price));
    setCurrency(existing.currency);
    setSyllabus(existing.syllabus);
  }, [existing]);

  // Pre-select the currently assigned trainer once both the course and the
  // trainer list are available.
  useEffect(() => {
    if (!existing || !trainers) return;
    const current = existing.trainerId
      ? (trainers.find((t) => t.id === existing.trainerId)?.email ?? KEEP_CURRENT_TRAINER)
      : '';
    setTrainerEmail(current);
    setInitialTrainerEmail(current);
  }, [existing, trainers]);

  const savedKey = useMemo(
    () =>
      snapshotKey(
        existing
          ? {
              title: existing.title,
              description: existing.description ?? '',
              deliveryMode: existing.deliveryMode,
              durationHours: String(existing.durationHours),
              durationDays: String(existing.durationDays),
              price: String(existing.price),
              currency: existing.currency,
              syllabus: existing.syllabus,
              trainerEmail: initialTrainerEmail,
            }
          : {
              title: '',
              description: '',
              deliveryMode: 'online',
              durationHours: '0',
              durationDays: '0',
              price: '0',
              currency: 'INR',
              syllabus: [],
              trainerEmail: '',
            }
      ),
    [existing, initialTrainerEmail]
  );
  const currentKey = snapshotKey({
    title,
    description,
    deliveryMode,
    durationHours,
    durationDays,
    price,
    currency,
    syllabus,
    trainerEmail,
  });
  const isArchived = existing?.status === 'archived';
  const isDirty = !isArchived && currentKey !== savedKey;

  useUnsavedChangesGuard(isDirty);

  if (isEditing && isLoading) {
    return <PageLoading />;
  }

  if (isEditing && loadError) {
    const forbidden = loadError instanceof ApiClientError && loadError.status === 403;
    const notFound = loadError instanceof ApiClientError && loadError.status === 404;
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="py-10 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            {forbidden
              ? "You can't edit this course"
              : notFound
                ? 'Course not found'
                : "Couldn't load this course"}
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {forbidden
              ? 'It belongs to another course admin. Only the admin who created a course can edit it.'
              : notFound
                ? 'It may have been deleted, or the link is wrong.'
                : apiErrorMessage(loadError, 'Something went wrong. Please try again.')}
          </p>
          <Link
            to="/course-admin"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to My Courses
          </Link>
        </Card>
      </div>
    );
  }

  function addDay() {
    setSyllabus((prev) =>
      renumber([...prev, { dayNumber: prev.length + 1, title: '', description: '' }])
    );
  }

  function removeDay(index: number) {
    setSyllabus((prev) => renumber(prev.filter((_, i) => i !== index)));
  }

  function moveDay(index: number, direction: -1 | 1) {
    setSyllabus((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const day = next[index];
      const swapWith = next[target];
      if (!day || !swapWith) return prev;
      next[index] = swapWith;
      next[target] = day;
      return renumber(next);
    });
  }

  function updateDay(index: number, patch: Partial<SyllabusDayDto>) {
    setSyllabus((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  /** Returns true if the course was saved. */
  async function saveCourse(): Promise<boolean> {
    setError(null);
    setSaved(false);

    if (syllabus.some(hasInvalidVideo)) {
      setError('Fix the highlighted YouTube links before saving.');
      return false;
    }

    const fields = {
      title,
      description: description || undefined,
      deliveryMode,
      durationHours: Number(durationHours),
      durationDays: Number(durationDays),
      price: Number(price),
      currency,
      // Store just the video id even if a full URL was pasted.
      syllabus: syllabus.map((day) => ({
        ...day,
        youtubeVideoId: day.youtubeVideoId?.trim()
          ? (parseYouTubeVideoId(day.youtubeVideoId) ?? undefined)
          : undefined,
      })),
    };

    try {
      if (isEditing) {
        const trainerChanged =
          trainerEmail !== initialTrainerEmail && trainerEmail !== KEEP_CURRENT_TRAINER;
        await updateCourse.mutateAsync({
          ...fields,
          ...(trainerChanged && { trainerEmail: trainerEmail || null }),
        });
        setSaved(true);
      } else {
        const course = await createCourse.mutateAsync({
          ...fields,
          trainerEmail: trainerEmail || undefined,
        });
        navigate(`/course-admin/courses/${course.id}/edit`, { replace: true });
      }
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the course. Please try again.', FIELD_LABELS));
      return false;
    }
  }

  function handleSave() {
    void saveCourse();
  }

  // Publishing what's on screen: unsaved edits are saved first, and nothing is
  // published if that save fails.
  async function handlePublish() {
    if (isDirty && !(await saveCourse())) return;
    setError(null);
    setSaved(false);
    try {
      await updateStatus.mutateAsync('published');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not publish this course.'));
    }
  }

  // Archiving freezes the course, so unsaved edits would be lost for good.
  async function handleArchive() {
    if (isDirty && !(await saveCourse())) return;
    setError(null);
    setSaved(false);
    try {
      await updateStatus.mutateAsync('archived');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not archive this course.'));
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteCourse.mutateAsync();
      navigate('/course-admin', { replace: true });
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete this course.'));
    }
  }

  const isSaving = createCourse.isPending || updateCourse.isPending;
  const canDelete = existing?.status === 'draft' || existing?.status === 'archived';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isEditing ? 'Edit Course' : 'New Course'}
          </h1>
          <p className="text-sm text-slate-500">
            Set the course details and build its day-by-day syllabus.
          </p>
        </div>
        {existing && (
          <Badge
            tone={
              existing.status === 'published'
                ? 'green'
                : existing.status === 'archived'
                  ? 'blue'
                  : 'slate'
            }
          >
            {existing.status}
          </Badge>
        )}
      </div>

      {isArchived && (
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This course is archived, so it&apos;s read-only. Enrolled students and the trainer can
          still open it, but it&apos;s no longer in the catalog.
        </div>
      )}

      <fieldset disabled={isArchived} className="contents">
        <Card className="mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full Stack Web Development"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will students learn?"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Mode</label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as CourseDeliveryMode)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Duration (hours)
              </label>
              <Input
                type="number"
                min={0}
                max={10000}
                step={1}
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Duration (days)
              </label>
              <Input
                type="number"
                min={0}
                max={3650}
                step={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
              <Input
                type="number"
                min={0}
                max={99999999.99}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="trainer">
                Assigned Trainer
              </label>
              <select
                id="trainer"
                value={trainerEmail}
                onChange={(e) => setTrainerEmail(e.target.value)}
                disabled={trainersLoading}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
              >
                <option value="">
                  {trainersLoading ? 'Loading trainers…' : 'No trainer assigned'}
                </option>
                {trainerEmail === KEEP_CURRENT_TRAINER && (
                  <option value={KEEP_CURRENT_TRAINER}>Current trainer (no longer active)</option>
                )}
                {trainers?.map((trainer) => (
                  <option key={trainer.id} value={trainer.email}>
                    {trainer.email}
                    {trainer.collegeName ? ` — ${trainer.collegeName}` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Only offline courses generate a session calendar for the assigned trainer to take
                attendance on.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Syllabus</h2>
            {!isArchived && (
              <Button variant="secondary" onClick={addDay}>
                <Plus size={14} /> Add Day
              </Button>
            )}
          </div>

          {syllabus.length === 0 && (
            <p className="text-sm text-slate-400">No syllabus days yet — add the first one.</p>
          )}

          <div className="flex flex-col gap-3">
            {syllabus.map((day, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Day {day.dayNumber}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveDay(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDay(index, 1)}
                      disabled={index === syllabus.length - 1}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDay(index)}
                      className="rounded p-1 text-red-400 hover:bg-red-50"
                      aria-label="Remove day"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Input
                  className="mb-2"
                  placeholder="Day title"
                  value={day.title}
                  onChange={(e) => updateDay(index, { title: e.target.value })}
                />
                <Input
                  className={deliveryMode === 'online' ? 'mb-2' : ''}
                  placeholder="Day description (optional)"
                  value={day.description ?? ''}
                  onChange={(e) => updateDay(index, { description: e.target.value })}
                />
                {deliveryMode === 'online' && (
                  <VideoField
                    value={day.youtubeVideoId ?? ''}
                    onChange={(value) => updateDay(index, { youtubeVideoId: value })}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      </fieldset>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {saved && !isDirty && <p className="mb-4 text-sm text-green-600">Saved.</p>}
      {isDirty && isEditing && !error && (
        <p className="mb-4 text-sm text-amber-600">You have unsaved changes.</p>
      )}

      {!isArchived && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          {isEditing && existing?.status === 'draft' && (
            <Button
              variant="secondary"
              onClick={handlePublish}
              disabled={isSaving || updateStatus.isPending || syllabus.length === 0}
              title={syllabus.length === 0 ? 'Add at least one syllabus day first' : undefined}
            >
              {isDirty ? 'Save & Publish' : 'Publish'}
            </Button>
          )}
          {isEditing && existing?.status === 'published' && (
            <Button
              variant="secondary"
              onClick={handleArchive}
              disabled={isSaving || updateStatus.isPending}
            >
              {isDirty ? 'Save & Archive' : 'Archive'}
            </Button>
          )}
        </div>
      )}

      {isEditing && canDelete && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Delete this course</p>
            <p className="text-xs text-slate-500">
              Only possible if no student has ever enrolled. This can&apos;t be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setConfirmingDelete(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete course
          </button>
        </div>
      )}

      <Modal
        open={confirmingDelete}
        onClose={() => !deleteCourse.isPending && setConfirmingDelete(false)}
      >
        <h2 className="text-lg font-semibold text-slate-900">Delete “{existing?.title}”?</h2>
        <p className="mt-1 text-sm text-slate-500">
          The course and its syllabus will be permanently removed. This can&apos;t be undone.
        </p>
        {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirmingDelete(false)}
            disabled={deleteCourse.isPending}
          >
            {deleteError ? 'Close' : 'Cancel'}
          </Button>
          {!deleteError && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteCourse.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-300"
            >
              {deleteCourse.isPending ? 'Deleting…' : 'Delete permanently'}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}

/**
 * Accepts a YouTube link or bare video ID. Shows a thumbnail when it parses,
 * an inline error when it doesn't, and collapses a pasted URL to just the ID
 * on blur so what's saved is obvious.
 */
function VideoField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const trimmed = value.trim();
  const videoId = trimmed ? parseYouTubeVideoId(trimmed) : null;
  const invalid = Boolean(trimmed) && !videoId;

  return (
    <div>
      <Input
        placeholder="YouTube link or video ID (unlisted, not private)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (videoId && videoId !== value) onChange(videoId);
        }}
        aria-invalid={invalid}
        className={invalid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      />
      {invalid && (
        <p className="mt-1 text-xs text-red-600">
          That doesn&apos;t look like a YouTube link or video ID.
        </p>
      )}
      {videoId && (
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2 hover:bg-slate-100"
        >
          <img
            src={youTubeThumbnailUrl(videoId)}
            alt=""
            loading="lazy"
            className="h-[54px] w-24 shrink-0 rounded object-cover bg-slate-200"
          />
          <span className="text-xs text-slate-500">
            Video ID <span className="font-mono text-slate-700">{videoId}</span>
            <span className="block text-blue-600">Open on YouTube to check it plays</span>
          </span>
        </a>
      )}
    </div>
  );
}
