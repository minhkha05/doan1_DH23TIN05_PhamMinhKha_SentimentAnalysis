import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';

interface UseTableVirtualizerOptions {
    containerRef: RefObject<HTMLElement | null>;
    itemCount: number;
    rowHeight: number;
    overscan?: number;
    enabled?: boolean;
}

interface UseTableVirtualizerResult {
    enabled: boolean;
    startIndex: number;
    endIndex: number;
    paddingTop: number;
    paddingBottom: number;
}

const DEFAULT_OVERSCAN = 6;

export function useTableVirtualizer({
    containerRef,
    itemCount,
    rowHeight,
    overscan = DEFAULT_OVERSCAN,
    enabled = true,
}: UseTableVirtualizerOptions): UseTableVirtualizerResult {
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    useEffect(() => {
        if (!enabled) return;

        const container = containerRef.current;
        if (!container) return;

        const updateHeight = () => {
            setViewportHeight(container.clientHeight);
        };

        const handleScroll = () => {
            setScrollTop(container.scrollTop);
        };

        updateHeight();
        handleScroll();

        const resizeObserver = new ResizeObserver(() => {
            updateHeight();
        });

        resizeObserver.observe(container);
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            resizeObserver.disconnect();
            container.removeEventListener('scroll', handleScroll);
        };
    }, [containerRef, enabled]);

    return useMemo(() => {
        const hasEnoughItems = itemCount > 0;
        const isActive = enabled && hasEnoughItems && viewportHeight > 0;

        if (!isActive) {
            return {
                enabled: false,
                startIndex: 0,
                endIndex: itemCount,
                paddingTop: 0,
                paddingBottom: 0,
            };
        }

        const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
        const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
        const endIndex = Math.min(itemCount, startIndex + visibleCount + overscan * 2);

        return {
            enabled: true,
            startIndex,
            endIndex,
            paddingTop: startIndex * rowHeight,
            paddingBottom: Math.max(0, (itemCount - endIndex) * rowHeight),
        };
    }, [enabled, itemCount, overscan, rowHeight, scrollTop, viewportHeight]);
}
