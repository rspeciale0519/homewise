"use client";

import { useState, useEffect } from "react";

const DEFAULT_COLOR = "rgba(255, 255, 255, 0.035)";
const SAMPLE_SIZE = 50;

export function useImageColor(src: string): string {
  const [color, setColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    if (!src) return;

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
          count++;
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        setColor(`rgba(${r}, ${g}, ${b}, 0.12)`);
      } catch {
        setColor(DEFAULT_COLOR);
      }
    };

    img.onerror = () => setColor(DEFAULT_COLOR);
    img.src = src;
  }, [src]);

  return color;
}
