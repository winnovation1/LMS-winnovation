const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// host (optional scheme/subdomain) followed by the path+query we inspect.
const YOUTUBE_URL =
  /^(?:https?:\/\/)?(?:(?:www|m|music)\.)?(youtu\.be|youtube\.com|youtube-nocookie\.com)(\/[^#]*)?/i;

/**
 * Extracts the 11-character YouTube video id from a bare id or any common
 * YouTube URL (watch?v=, youtu.be/, /embed/, /shorts/, /live/, /v/).
 * Returns null when the input isn't recognisable as a YouTube video.
 * Shared by the course editor (live preview) and the server (validation).
 * Regex-only on purpose: this package compiles without DOM or Node types.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) {
    return value;
  }

  const match = YOUTUBE_URL.exec(value);
  if (!match) {
    return null;
  }
  const host = (match[1] ?? '').toLowerCase();
  const rest = match[2] ?? '';
  const [path = '', query = ''] = rest.split('?');
  const segments = path.split('/').filter(Boolean);

  let candidate: string | undefined;
  if (host === 'youtu.be') {
    candidate = segments[0];
  } else if (segments[0] === 'watch') {
    candidate = /(?:^|&)v=([^&]+)/.exec(query)?.[1];
  } else if (segments[0] && ['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    candidate = segments[1];
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
