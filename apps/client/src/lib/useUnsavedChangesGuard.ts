import { useEffect } from 'react';

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

/**
 * Warns before leaving a page with unsaved changes.
 *
 * The app uses <BrowserRouter>, where react-router's useBlocker isn't
 * available, so this covers the two common exits directly: closing/reloading
 * the tab (beforeunload) and clicking an in-app link (a capture-phase click
 * listener that runs before react-router's <Link> handler). The browser Back
 * button isn't intercepted.
 */
export function useUnsavedChangesGuard(when: boolean, message = DEFAULT_MESSAGE): void {
  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by some browsers to show the prompt.
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [when, message]);
}
