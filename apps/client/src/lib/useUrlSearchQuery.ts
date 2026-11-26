import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Local search-box state seeded from the URL's `?q=` (set by the global
 * search bar in the top bar). The page's own search box stays freely editable;
 * a new `?q=` (searching again from the top bar) replaces what's typed.
 */
export function useUrlSearchQuery(): [string, (value: string) => void] {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);

  // Adjusting state while rendering (React's documented alternative to an
  // effect) so the new query applies in the same render.
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  return [query, setQuery];
}
