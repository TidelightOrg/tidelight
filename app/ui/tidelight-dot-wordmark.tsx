"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; phase: number; weight: number };

export default function TidelightDotWordmark({ className, lines, decorative = false }: { className?: string; lines?: string[]; decorative?: boolean }) {
  const linesKey = lines?.length ? lines.join("\n") : "TIDELIGHT";
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const displayLines = linesKey.split("\n");
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const mask = document.createElement("canvas");
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    if (!maskContext) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let spacing = 9;
    let points: Point[] = [];
    let dotColor = "#d2ded7";
    let accentColor = "#9ce7c1";
    let blueColor = "#4a86ff";
    let running = true;

    const buildField = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      width = box.width;
      height = box.height;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      spacing = Math.max(5.5, Math.min(8.5, width / 112));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      mask.width = canvas.width;
      mask.height = canvas.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      maskContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      maskContext.clearRect(0, 0, width, height);
      maskContext.textAlign = "center";
      maskContext.textBaseline = "alphabetic";
      const rowHeight = height / displayLines.length;
      displayLines.forEach((line, index) => {
        const fontSize = displayLines.length === 1 ? height * 0.8 : rowHeight * 0.9;
        maskContext.font = `800 ${fontSize}px "Arial Black", Arial, Helvetica, sans-serif`;
        const measuredWidth = maskContext.measureText(line).width;
        const scaleX = Math.min(1.48, (width - spacing * 2) / measuredWidth);
        const baseline = displayLines.length === 1 ? height * 0.82 : (index + 0.82) * rowHeight;
        maskContext.save();
        maskContext.translate(width / 2, baseline);
        maskContext.scale(scaleX, 1);
        maskContext.fillStyle = "#fff";
        maskContext.fillText(line, 0, 0);
        maskContext.restore();
      });

      const image = maskContext.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      const next: Point[] = [];
      for (let y = spacing * 0.55; y < height - spacing * 0.2; y += spacing) {
        for (let x = spacing * 0.5; x < width - spacing * 0.2; x += spacing) {
          const pixel = (Math.floor(y * ratio) * canvas.width + Math.floor(x * ratio)) * 4 + 3;
          if (data[pixel] > 90) {
            const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            const noise = seed - Math.floor(seed);
            next.push({ x, y, phase: noise * Math.PI * 2, weight: 0.54 + noise * 0.46 });
          }
        }
      }
      points = next;
      const styles = getComputedStyle(canvas);
      dotColor = styles.getPropertyValue("--wordmark-dot").trim() || "#d2ded7";
      accentColor = styles.getPropertyValue("--wordmark-accent").trim() || "#9ce7c1";
      blueColor = styles.getPropertyValue("--wordmark-pointer").trim() || "#4a86ff";
      paint(performance.now(), true);
    };

    const paint = (time: number, force = false) => {
      if (!force && reducedMotion.matches && frame) return;
      context.clearRect(0, 0, width, height);
      const elapsed = reducedMotion.matches ? 0 : time * 0.001;
      const radius = Math.max(1.55, spacing * 0.32);
      for (const point of points) {
        const wave = (Math.sin(point.x * 0.018 - elapsed * 1.25 + Math.sin(point.y * 0.027) * 0.65) + 1) / 2;
        const glint = Math.max(0, Math.sin(elapsed * 2.1 + point.phase)) ** 8;
        const alpha = Math.min(1, 0.76 + wave * 0.16 + point.weight * 0.06 + glint * 0.12);
        const isAccent = wave > 0.79 || glint > 0.7;
        context.globalAlpha = alpha;
        context.fillStyle = isAccent ? accentColor : dotColor;
        context.strokeStyle = isAccent ? accentColor : dotColor;
        context.lineWidth = Math.max(1, radius * 0.58);
        context.beginPath();
        context.arc(point.x, point.y, radius * (0.88 + glint * 0.18), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;

      // A small Tidelight blue signal cursor drifts over the final letters.
      const cursorX = width * (0.815 + (reducedMotion.matches ? 0 : Math.sin(elapsed * 0.35) * 0.007));
      const cursorY = displayLines.length === 1
        ? height * (0.36 + (reducedMotion.matches ? 0 : Math.sin(elapsed * 0.48 + 1.2) * 0.018))
        : height * (0.5 + (reducedMotion.matches ? 0 : Math.sin(elapsed * 0.48 + 1.2) * 0.07));
      context.save();
      context.translate(cursorX, cursorY);
      context.shadowColor = blueColor;
      context.shadowBlur = 10;
      context.fillStyle = "#07120f";
      context.strokeStyle = blueColor;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(19, 13);
      context.lineTo(12, 15);
      context.lineTo(16, 23);
      context.lineTo(12.5, 25);
      context.lineTo(8.5, 17);
      context.lineTo(3, 23);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    };

    const animate = (time: number) => {
      if (!running) return;
      if (!reducedMotion.matches && time - lastFrame >= 32) {
        paint(time);
        lastFrame = time;
      }
      frame = window.requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(buildField);
    const themeObserver = new MutationObserver(buildField);
    observer.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    buildField();
    if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate);
    const onMotionChange = () => {
      paint(performance.now(), true);
      if (reducedMotion.matches) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      else frame = window.requestAnimationFrame(animate);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [linesKey]);

  return <span className={className}>
    <canvas ref={canvasRef} role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Tidelight written as a living field of signal dots"} />
    {!decorative ? <span className="sr-only">Tidelight</span> : null}
  </span>;
}
