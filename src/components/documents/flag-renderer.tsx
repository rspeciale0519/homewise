"use client";

import { pdfToScreen } from "@/lib/documents/coordinates";
import {
  FLAG_BASE_HEIGHT,
  FLAG_BASE_WIDTH,
  FLAG_BODY_RADIUS,
  FLAG_DEFAULT_ROTATION,
  FLAG_DEFAULT_SCALE,
  FLAG_NOTCH_WIDTH,
  flagColorHex,
  flagColorLabel,
} from "@/lib/documents/flag-colors";
import type {
  Annotation,
  FlagColor,
  PageDimensions,
} from "@/types/document-viewer";

const ROTATE_HANDLE_OFFSET_PX = 24;

export type FlagCorner = "nw" | "ne" | "se" | "sw";

interface FlagRendererProps {
  flag: Annotation;
  dims: PageDimensions;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResizeHandlePointerDown?: (
    corner: FlagCorner,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  onRotateHandlePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function isFlagColor(value: string): value is FlagColor {
  return ["yellow", "blue", "green", "red", "purple", "orange"].includes(value);
}

export function FlagRenderer({
  flag,
  dims,
  selected = false,
  onPointerDown,
  onClick,
  onDoubleClick,
  onResizeHandlePointerDown,
  onRotateHandlePointerDown,
}: FlagRendererProps) {
  if (flag.type !== "flag") return null;

  const color: FlagColor = isFlagColor(flag.color) ? flag.color : "yellow";
  const scale = flag.scale ?? FLAG_DEFAULT_SCALE;
  const rotation = flag.rotation ?? FLAG_DEFAULT_ROTATION;

  const renderScale = scale * dims.scale;
  const bodyW = FLAG_BASE_WIDTH * renderScale;
  const bodyH = FLAG_BASE_HEIGHT * renderScale;
  const notchW = FLAG_NOTCH_WIDTH * renderScale;
  const totalW = bodyW + notchW;

  const { screenX, screenY } = pdfToScreen(flag.pdfX, flag.pdfY, dims);

  // (screenX, screenY) is the body center. The container is bodyW + notchW
  // wide; the body occupies [0, bodyW] and the notch [bodyW, totalW] in the
  // container's local coords. Position the container so the body center
  // lands at (screenX, screenY), and rotate around that body center.
  const left = screenX - bodyW / 2;
  const top = screenY - bodyH / 2;

  const labelFontSize = 11 * renderScale;
  const fillHex = flagColorHex(color);

  // Body path: rounded-rect on the left, flat right edge that meets the notch.
  const r = FLAG_BODY_RADIUS * renderScale;
  const bodyPath =
    `M ${r} 0 ` +
    `L ${bodyW} 0 ` +
    `L ${bodyW + notchW} ${bodyH / 2} ` +
    `L ${bodyW} ${bodyH} ` +
    `L ${r} ${bodyH} ` +
    `Q 0 ${bodyH} 0 ${bodyH - r} ` +
    `L 0 ${r} ` +
    `Q 0 0 ${r} 0 Z`;

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width: totalW,
        height: bodyH,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${bodyW / 2}px ${bodyH / 2}px`,
        cursor: onPointerDown ? "grab" : undefined,
        zIndex: selected ? 50 : undefined,
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="img"
      aria-label={`Sign-here flag, ${flagColorLabel(color)}, label "${flag.value}"`}
    >
      <svg
        width={totalW}
        height={bodyH}
        viewBox={`0 0 ${totalW} ${bodyH}`}
        style={{ display: "block", overflow: "visible", pointerEvents: "none" }}
      >
        <path
          d={bodyPath}
          fill={fillHex}
          stroke={selected ? "#1f3f99" : "transparent"}
          strokeWidth={selected ? 1 : 0}
        />
        <text
          x={bodyW / 2}
          y={bodyH / 2}
          fill="#ffffff"
          fontSize={labelFontSize}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "Helvetica, Arial, sans-serif",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            pointerEvents: "none",
          }}
        >
          {flag.value}
        </text>
      </svg>

      {selected && onResizeHandlePointerDown && onRotateHandlePointerDown && (
        <SelectionHandles
          width={totalW}
          bodyWidth={bodyW}
          height={bodyH}
          rotation={rotation}
          onResizeHandlePointerDown={onResizeHandlePointerDown}
          onRotateHandlePointerDown={onRotateHandlePointerDown}
        />
      )}
    </div>
  );
}

function SelectionHandles({
  width: _width,
  bodyWidth,
  height: _height,
  rotation,
  onResizeHandlePointerDown,
  onRotateHandlePointerDown,
}: {
  width: number;
  bodyWidth: number;
  height: number;
  rotation: number;
  onResizeHandlePointerDown: (
    corner: FlagCorner,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  onRotateHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const HANDLE = 10;
  const ROTATE = 14;
  const half = HANDLE / 2;

  const corners: { key: FlagCorner; style: React.CSSProperties }[] = [
    { key: "nw", style: { top: -half, left: -half, cursor: "nwse-resize" } },
    { key: "ne", style: { top: -half, right: -half, cursor: "nesw-resize" } },
    { key: "se", style: { bottom: -half, right: -half, cursor: "nwse-resize" } },
    { key: "sw", style: { bottom: -half, left: -half, cursor: "nesw-resize" } },
  ];

  return (
    <>
      {corners.map(({ key, style }) => (
        <div
          key={key}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeHandlePointerDown(key, e);
          }}
          style={{
            position: "absolute",
            width: HANDLE,
            height: HANDLE,
            backgroundColor: "white",
            border: "1px solid #1f3f99",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.18)",
            ...style,
          }}
        />
      ))}

      {/* Connector line + rotate handle (above body's top-center) */}
      <div
        style={{
          position: "absolute",
          top: -ROTATE_HANDLE_OFFSET_PX,
          left: bodyWidth / 2 - 0.5,
          width: 1,
          height: ROTATE_HANDLE_OFFSET_PX - ROTATE / 2,
          backgroundColor: "#cbd5e1",
          pointerEvents: "none",
        }}
      />
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onRotateHandlePointerDown(e);
        }}
        style={{
          position: "absolute",
          top: -ROTATE_HANDLE_OFFSET_PX - ROTATE / 2,
          left: bodyWidth / 2 - ROTATE / 2,
          width: ROTATE,
          height: ROTATE,
          borderRadius: "50%",
          backgroundColor: "white",
          border: "1px solid #1f3f99",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
          cursor: "grab",
          // Visual hint that the handle works regardless of current rotation
          transform: `rotate(${-rotation}deg)`,
        }}
      />
    </>
  );
}
