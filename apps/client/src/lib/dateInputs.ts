/**
 * Formats an ISO timestamp into local date (`YYYY-MM-DD`) and time (`HH:MM`)
 * strings suitable for HTML `<input type="date">` and `<input type="time">`.
 */
export function toLocalDateTimeInputs(iso?: string): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return { date: '', time: '' };
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
