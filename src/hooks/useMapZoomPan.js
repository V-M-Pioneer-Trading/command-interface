import { useRef, useState, useEffect, useCallback } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.1;
const DRAG_THRESHOLD = 4;

function clampPan(tx, ty, scale, viewSize) {
  const min = viewSize * (1 - scale);
  return { tx: Math.min(0, Math.max(min, tx)), ty: Math.min(0, Math.max(min, ty)) };
}

export function useMapZoomPan({ viewSize }) {
  // Callback ref (not useRef) because the <svg> only mounts once data finishes loading —
  // a plain ref's .current wouldn't be set yet when the wheel-listener effect first runs.
  const [node, setNode] = useState(null);
  const containerRef = useCallback((el) => setNode(el), []);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const stateRef = useRef({ scale: 1, tx: 0, ty: 0 });
  stateRef.current = { scale, tx, ty };
  const drag = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });

  useEffect(() => {
    if (!node) return;
    function onWheel(e) {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const factor = viewSize / rect.width;
      const cx = (e.clientX - rect.left) * factor;
      const cy = (e.clientY - rect.top) * factor;
      const { scale: s, tx: curTx, ty: curTy } = stateRef.current;
      const dir = e.deltaY < 0 ? 1 : -1;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * (dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)));
      const newTx = cx - (cx - curTx) * (newScale / s);
      const newTy = cy - (cy - curTy) * (newScale / s);
      const clamped = clampPan(newTx, newTy, newScale, viewSize);
      setScale(newScale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [node, viewSize]);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    e.target.setPointerCapture(e.pointerId);
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
  }

  function onPointerMove(e) {
    if (!drag.current.active || !node) return;
    const rect = node.getBoundingClientRect();
    const factor = viewSize / rect.width;
    const dx = (e.clientX - drag.current.lastX) * factor;
    const dy = (e.clientY - drag.current.lastY) * factor;
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    const moved = Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY);
    if (moved > DRAG_THRESHOLD) setIsDragging(true);
    const { scale: s, tx: curTx, ty: curTy } = stateRef.current;
    const clamped = clampPan(curTx + dx, curTy + dy, s, viewSize);
    setTx(clamped.tx);
    setTy(clamped.ty);
  }

  function onPointerUp(e) {
    if (!drag.current.active) return;
    e.target.releasePointerCapture(e.pointerId);
    drag.current.active = false;
  }

  // Capture can be lost without a pointerup reaching us (alt-tab, OS/browser gesture
  // takeover) — without this, drag.current.active would stay stuck true.
  function onLostPointerCapture() {
    drag.current.active = false;
  }

  function onClickCapture(e) {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
    }
  }

  return {
    scale,
    tx,
    ty,
    isDragging,
    containerRef,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onLostPointerCapture,
      onClickCapture,
    },
  };
}
