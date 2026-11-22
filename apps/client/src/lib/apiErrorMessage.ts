import { ApiClientError } from './apiClient';

interface FlattenedZodError {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

function isFlattenedZodError(value: unknown): value is FlattenedZodError {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('fieldErrors' in value || 'formErrors' in value)
  );
}

/**
 * Turns an error thrown by apiRequest into text a user can act on: the
 * server's own message, plus per-field validation messages when the request
 * failed schema validation. `fieldLabels` maps API field names to UI labels.
 */
export function apiErrorMessage(
  error: unknown,
  fallback: string,
  fieldLabels: Record<string, string> = {}
): string {
  if (!(error instanceof ApiClientError)) {
    return "Can't reach the server. Please check your connection and try again.";
  }

  if (isFlattenedZodError(error.details)) {
    const lines = [
      ...(error.details.formErrors ?? []),
      ...Object.entries(error.details.fieldErrors ?? {}).flatMap(([field, messages]) =>
        (messages ?? []).map((message) => `${fieldLabels[field] ?? field}: ${message}`)
      ),
    ];
    if (lines.length > 0) return lines.join(' · ');
  }

  if (error.status >= 500 || !error.message || error.message === 'Request failed') {
    return fallback;
  }
  return error.message;
}
