'use client';

import { useEffect, useState } from 'react';

/**
 * Responsive helper hook to detect desktop (pointer: fine) environments.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: fine)');

    const updateMatch = () => {
      setIsDesktop(mediaQuery.matches);
    };

    updateMatch();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMatch);
      return () => mediaQuery.removeEventListener('change', updateMatch);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(updateMatch);
      return () => mediaQuery.removeListener(updateMatch);
    }
  }, []);

  return isDesktop;
}

