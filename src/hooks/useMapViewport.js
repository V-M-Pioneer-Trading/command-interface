import { useCallback, useEffect, useRef, useState } from "react";
import {
  IDENTITY_VIEW,
  ZOOM_STEP,
  centerOn,
  clampPan,
  panBy,
  zoomAt,
  zoomCentered,
} from "../map/viewport";

// Two separate thresholds on purpose. The first only drives the grab/grabbing
// cursor, so it can be twitchy. The second decides whether the click that ends
// a gesture gets swallowed — a click where the mouse shifts a few pixels is
// still a click, and suppressing it makes the map feel broken.
const DRAG_CURSOR_THRESHOLD = 4;
const CLICK_SUPPRESS_THRESHOLD = 10;
const KEY_PAN_STEP = 48;

/**
 * React binding for the pure viewport math: wheel zoom, drag pan, keyboard, and
 * a re-clamp whenever the container resizes. Holds no knowledge of what's being
 * drawn — the map passes container px in and gets a {scale, tx, ty} back.
 */
export function useMapViewport({ width, height }) {
  const [view, setView] = useState(IDENTITY_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [node, setNode] = useState(null);
  const svgRef = useCallback((el) => setNode(el), []);

  // Only the container size is mirrored into a ref. The view itself is always
  // updated functionally — several zoom or pan events can fire between two
  // renders (held key, fast wheel, repeated clicks) and reading a snapshot
  // would make all but the last one a no-op.
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  // `moved` is the gesture's travel distance. It lives in the ref, not in
  // state, because the click that ends a gesture is dispatched before React has
  // necessarily re-rendered — reading a state value there would be stale.
  const drag = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: 0 });

  // Resizing changes how far the content can be panned.
  useEffect(() => {
    setView((v) => ({ ...v, ...clampPan(v.tx, v.ty, v.scale, width, height) }));
  }, [width, height]);

  const toLocal = useCallback(
    (clientX, clientY) => {
      if (!node) return { x: 0, y: 0 };
      const rect = node.getBoundingClientRect();
      const fx = rect.width ? sizeRef.current.width / rect.width : 1;
      const fy = rect.height ? sizeRef.current.height / rect.height : 1;
      return { x: (clientX - rect.left) * fx, y: (clientY - rect.top) * fy };
    },
    [node],
  );

  // Native listener with { passive: false } — React's onWheel can't preventDefault.
  useEffect(() => {
    if (!node) return undefined;
    function onWheel(e) {
      e.preventDefault();
      const { width: w, height: h } = sizeRef.current;
      const { x, y } = toLocal(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setView((v) => zoomAt(v, x, y, factor, w, h));
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [node, toLocal]);

  const zoomBy = useCallback((factor) => {
    const { width: w, height: h } = sizeRef.current;
    setView((v) => zoomCentered(v, factor, w, h));
  }, []);

  const reset = useCallback(() => setView(IDENTITY_VIEW), []);

  const centerOnPoint = useCallback((x, y) => {
    const { width: w, height: h } = sizeRef.current;
    setView((v) => centerOn(v, x, y, w, h));
  }, []);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    // Throws if the pointer is already gone; nothing here depends on capture
    // succeeding, so a failure just means we fall back to plain pointer events.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture available */
    }
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: 0,
    };
    setIsDragging(false);
  }

  function onPointerMove(e) {
    if (!drag.current.active) return;
    const { width: w, height: h } = sizeRef.current;
    const { x: lx, y: ly } = toLocal(e.clientX, e.clientY);
    const { x: px, y: py } = toLocal(drag.current.lastX, drag.current.lastY);
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    drag.current.moved = Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY);
    if (drag.current.moved > DRAG_CURSOR_THRESHOLD) setIsDragging(true);
    setView((v) => panBy(v, lx - px, ly - py, w, h));
  }

  function onPointerUp(e) {
    if (!drag.current.active) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture already released */
    }
    drag.current.active = false;
    // Reset here rather than in the click handler: a drag that ends without a
    // click (released off-target) would otherwise leave the cursor stuck.
    setIsDragging(false);
  }

  // Capture can be lost without a pointerup reaching us (alt-tab, OS gesture
  // takeover) — without this, drag.current.active would stay stuck true.
  function onLostPointerCapture() {
    drag.current.active = false;
    setIsDragging(false);
  }

  // Swallow only the click that ends a real pan, so it doesn't dismiss the
  // popover. `moved` is reset on every pointerdown, so a suppressed drag can
  // never leak into the next click.
  function onClickCapture(e) {
    const dragged = drag.current.moved > CLICK_SUPPRESS_THRESHOLD;
    drag.current.moved = 0;
    if (dragged) e.stopPropagation();
  }

  function onKeyDown(e) {
    const { width: w, height: h } = sizeRef.current;
    const step = KEY_PAN_STEP;
    switch (e.key) {
      case "ArrowLeft":
        setView((v) => panBy(v, step, 0, w, h));
        break;
      case "ArrowRight":
        setView((v) => panBy(v, -step, 0, w, h));
        break;
      case "ArrowUp":
        setView((v) => panBy(v, 0, step, w, h));
        break;
      case "ArrowDown":
        setView((v) => panBy(v, 0, -step, w, h));
        break;
      case "+":
      case "=":
        setView((v) => zoomCentered(v, ZOOM_STEP, w, h));
        break;
      case "-":
      case "_":
        setView((v) => zoomCentered(v, 1 / ZOOM_STEP, w, h));
        break;
      case "0":
        setView(IDENTITY_VIEW);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  return {
    view,
    isDragging,
    svgRef,
    zoomBy,
    reset,
    centerOnPoint,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onLostPointerCapture,
      onClickCapture,
      onKeyDown,
    },
  };
}
