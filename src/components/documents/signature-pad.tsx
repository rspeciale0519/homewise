"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

export function SignaturePad({
  onSave,
  onCancel,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e && e.touches[0]) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      const mouseEvent = e as React.MouseEvent;
      return {
        x: (mouseEvent.clientX - rect.left) * scaleX,
        y: (mouseEvent.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getCtx, getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasStrokes(true);
    },
    [isDrawing, getCtx, getPos]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }, [hasStrokes, onSave]);

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{ width, height }}
          className="cursor-crosshair touch-none w-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-slate-300 select-none">
              Draw your signature here
            </p>
          </div>
        )}
        <div className="absolute bottom-4 left-8 right-8 border-b border-slate-200" />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={!hasStrokes}>
          Clear
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasStrokes}>
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
