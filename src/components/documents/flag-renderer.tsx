"use client";

import { pdfToScreen } from "@/lib/documents/coordinates";
import {
  FLAG_BASE_HEIGHT,
  FLAG_BASE_WIDTH,
  FLAG_DEFAULT_ROTATION,
  FLAG_DEFAULT_SCALE,
  flagColorHex,
  flagColorLabel,
} from "@/lib/documents/flag-colors";
import type {
  Annotation,
  FlagColor,
  PageDimensions,
} from "@/types/document-viewer";

const NOTCH_WIDTH = 8;
const BODY_RADIUS = 3;

interface FlagRendererProps {
  flag: Annotation;
  dims: PageDimensions;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
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
}: FlagRendererProps) {
  if (flag.type !== "flag") return null;

  const color: FlagColor = isFlagColor(flag.color) ? flag.color : "yellow";
  const scale = flag.scale ?? FLAG_DEFAULT_SCALE;
  const rotation = flag.rotation ?? FLAG_DEFAULT_ROTATION;

  const renderScale = scale * dims.scale;
  const bodyW = FLAG_BASE_WIDTH * renderScale;
  const bodyH = FLAG_BASE_HEIGHT * renderScale;
  const notchW = NOTCH_WIDTH * renderScale;
  const totalW = bodyW + notchW;

  const { screenX, screenY } = pdfToScreen(flag.pdfX, flag.pdfY, dims);

  // Notch tip is at the right-middle of the SVG. Position the SVG so the
  // notch tip lands at (screenX, screenY); rotate around that tip.
  const left = screenX - totalW;
  const top = screenY - bodyH / 2;

  const labelFontSize = 11 * renderScale;
  const fillHex = flagColorHex(color);

  // Body path: rounded-rect on the left, flat right edge that meets the notch.
  const r = BODY_RADIUS * renderScale;
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
        transformOrigin: "100% 50%",
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
        style={{ display: "block", overflow: "visible" }}
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
    </div>
  );
}
