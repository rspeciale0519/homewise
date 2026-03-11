"use client";

import { useRef, useCallback, useEffect, type CSSProperties } from "react";
import { useMotionValue } from "framer-motion";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_DELAY = 300;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useZoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useMotionValue(1);
  const translateX = useMotionValue(0);
  const translateY = useMotionValue(0);

  const isZoomedRef = useRef(false);
  const lastTapRef = useRef(0);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef(0);
  const initialScaleRef = useRef(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef<number>(0);

  const updateTransform = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const s = scale.get();
      const tx = translateX.get();
      const ty = translateY.get();
      el.style.transform = `scale(${s}) translate(${tx}px, ${ty}px)`;
      el.style.transformOrigin = "center center";
      isZoomedRef.current = s > 1.05;
    });
  }, [scale, translateX, translateY]);

  const resetZoom = useCallback(() => {
    scale.set(1);
    translateX.set(0);
    translateY.set(0);
    isZoomedRef.current = false;
    const el = containerRef.current;
    if (el) {
      el.style.transition = "transform 0.25s ease-out";
      el.style.transform = "scale(1) translate(0px, 0px)";
      setTimeout(() => { if (el) el.style.transition = ""; }, 260);
    }
  }, [scale, translateX, translateY]);

  const clampTranslation = useCallback(
    (tx: number, ty: number, s: number) => {
      const el = containerRef.current;
      if (!el || s <= 1) return { tx: 0, ty: 0 };
      const rect = el.getBoundingClientRect();
      const maxTx = ((s - 1) * rect.width) / (2 * s);
      const maxTy = ((s - 1) * rect.height) / (2 * s);
      return {
        tx: clamp(tx, -maxTx, maxTx),
        ty: clamp(ty, -maxTy, maxTy),
      };
    },
    []
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;

      const delta = -e.deltaY * 0.002;
      const newScale = clamp(scale.get() + delta, MIN_SCALE, MAX_SCALE);
      scale.set(newScale);

      if (newScale <= 1.05) {
        translateX.set(0);
        translateY.set(0);
      } else {
        const clamped = clampTranslation(translateX.get(), translateY.get(), newScale);
        translateX.set(clamped.tx);
        translateY.set(clamped.ty);
      }
      updateTransform();
    },
    [scale, translateX, translateY, clampTranslation, updateTransform]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);

      if (pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        initialPinchDistRef.current = Math.hypot(
          pts[1]!.x - pts[0]!.x,
          pts[1]!.y - pts[0]!.y
        );
        initialScaleRef.current = scale.get();
      } else if (pointersRef.current.size === 1 && isZoomedRef.current) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY, tx: translateX.get(), ty: translateY.get() };
      }

      // Double-tap detection
      if (e.pointerType === "touch" && pointersRef.current.size === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
          lastTapRef.current = 0;
          if (isZoomedRef.current) {
            resetZoom();
          } else {
            scale.set(DOUBLE_TAP_SCALE);
            updateTransform();
          }
        } else {
          lastTapRef.current = now;
        }
      }
    },
    [scale, translateX, translateY, resetZoom, updateTransform]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
        if (initialPinchDistRef.current > 0) {
          const ratio = dist / initialPinchDistRef.current;
          const newScale = clamp(initialScaleRef.current * ratio, MIN_SCALE, MAX_SCALE);
          scale.set(newScale);
          if (newScale <= 1.05) {
            translateX.set(0);
            translateY.set(0);
          }
          updateTransform();
        }
      } else if (isPanningRef.current && isZoomedRef.current) {
        const dx = (e.clientX - panStartRef.current.x) / scale.get();
        const dy = (e.clientY - panStartRef.current.y) / scale.get();
        const clamped = clampTranslation(
          panStartRef.current.tx + dx,
          panStartRef.current.ty + dy,
          scale.get()
        );
        translateX.set(clamped.tx);
        translateY.set(clamped.ty);
        updateTransform();
      }
    },
    [scale, translateX, translateY, clampTranslation, updateTransform]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) {
        initialPinchDistRef.current = 0;
      }
      if (pointersRef.current.size === 0) {
        isPanningRef.current = false;
        if (scale.get() <= 1.05) resetZoom();
      }
    },
    [scale, resetZoom]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointercancel", handlePointerUp);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointercancel", handlePointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleWheel, handlePointerDown, handlePointerMove, handlePointerUp]);

  const style: CSSProperties = {
    transformOrigin: "center center",
    willChange: "transform",
  };

  const getIsZoomed = useCallback(() => isZoomedRef.current, []);

  return {
    containerRef,
    style,
    getIsZoomed,
    resetZoom,
  };
}
