import { useCallback, useEffect, useState } from "react";

/**
 * Live content-box size of an element. The map fits the system to the real
 * container aspect ratio instead of a fixed square viewBox, so this has to
 * track resizes (panel toggles, window resize) rather than measure once.
 *
 * Callback ref rather than useRef: the measured node only mounts after the
 * waypoint query resolves, so a plain ref would still be null on first effect.
 */
export function useElementSize() {
  const [node, setNode] = useState(null);
  const ref = useCallback((el) => setNode(el), []);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!node) return undefined;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref, node, size };
}
