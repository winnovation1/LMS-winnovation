/** Splits newline-separated agenda text into unique non-empty bullet items. */
export function parseAgendaItems(raw: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      items.push(trimmed);
    }
  }
  return items;
}
