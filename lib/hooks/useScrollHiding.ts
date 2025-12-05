import { useState, useEffect, useRef, RefObject } from 'react';

interface UseScrollHidingOptions {
  scrollThreshold?: number;
  hideScrollDistance?: number;
  showScrollDistance?: number;
  activeTab?: string;
}

interface UseScrollHidingReturn {
  isHidden: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  setIsHidden: (hidden: boolean) => void;
}

/**
 * Hook for hiding elements on scroll down and showing on scroll up
 */
export function useScrollHiding(options: UseScrollHidingOptions = {}): UseScrollHidingReturn {
  const {
    scrollThreshold = 20,
    hideScrollDistance = 40,
    showScrollDistance = 80,
    activeTab,
  } = options;

  const [isHidden, setIsHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      const current = container.scrollTop;
      const delta = current - lastScrollTopRef.current;

      if (Math.abs(delta) > scrollThreshold) {
        if (delta > 0 && current > hideScrollDistance) {
          setIsHidden(true);
        } else if (delta < 0 || current < showScrollDistance) {
          setIsHidden(false);
        }
        lastScrollTopRef.current = current;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
    };
  }, [scrollThreshold, hideScrollDistance, showScrollDistance, activeTab]);

  return {
    isHidden,
    scrollRef,
    setIsHidden,
  };
}

