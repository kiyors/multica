To handle window resizing smoothly without causing lag or UI stuttering (especially when dealing with a `<canvas>` layered over a `<video>`), you need to optimize how you listen to size updates.

Running heavy recalculations on every single pixel change during a drag operation will choke the browser's main thread. To prevent this, you should combine a **`ResizeObserver`** with **`requestAnimationFrame`** (or a clean debounce/throttle utility).

Here is an efficient, production-ready React component structure using TypeScript to keep your canvas perfectly aligned with your video container.

```ts
import React, { useEffect, useRef, useState } from 'react';

interface VideoLayout {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
}

export const MediaReviewPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [layout, setLayout] = useState<VideoLayout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Core layout math (from previous step)
  const updateLayoutMath = () => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const { videoWidth, videoHeight, clientWidth, clientHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return;

    // 1. Calculate true video dimensions inside letterboxing
    const scale = Math.min(clientWidth / videoWidth, clientHeight / videoHeight);
    const renderedWidth = videoWidth * scale;
    const renderedHeight = videoHeight * scale;
    const offsetX = (clientWidth - renderedWidth) / 2;
    const offsetY = (clientHeight - renderedHeight) / 2;

    // 2. Resize the canvas display size to perfectly match the video container container
    canvas.width = clientWidth;
    canvas.height = clientHeight;

    const currentLayout = { renderedWidth, renderedHeight, offsetX, offsetY };
    setLayout(currentLayout);

    // 3. Immediately trigger your custom canvas drawing logic
    drawAnnotations(canvas, currentLayout);
  };

  // Mock drawing function
  const drawAnnotations = (canvas: HTMLCanvasElement, currentLayout: VideoLayout) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Loop through your stored normalized coordinates and paint them using currentLayout
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Set up the ResizeObserver to listen to the wrapper div
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;

      // Cancel any previous scheduled frame to prevent overlapping updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // requestAnimationFrame schedules execution right before the next repaint.
      // This enforces a natural performance throttle matching the screen's refresh rate.
      animationFrameRef.current = requestAnimationFrame(() => {
        updateLayoutMath();
      });
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full max-w-4xl bg-black overflow-hidden flex items-center justify-center rounded-xl"
    >
      {/* Video Layer */}
      <video
        ref={videoRef}
        src="/your-marketing-video.mp4"
        className="w-full h-full max-h-[80vh] object-contain"
        onLoadedMetadata={updateLayoutMath} // Crucial: trigger math once video dimensions are known
      />

      {/* Transparent Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-auto"
      />
    </div>
  );
};
```

### Why this pattern is highly efficient:

1. **`requestAnimationFrame` Throttling:** Instead of triggering updates dozens of times per second while a user drags their browser edge, `requestAnimationFrame` ensures your math code executes _exactly once per screen repaint cycle_.
    
2. **Dynamic Canvas Resizing:** Setting `canvas.width = clientWidth` on resize drops the canvas buffer cache and clears the screen automatically, eliminating manual artifact cleaning steps before you redraw.
    
3. **`pointer-events-auto` on Canvas:** By capturing the pointer events directly on the transparent canvas overlay, your code can trap the drag-and-drop coordinates easily before normalizing them down to the underlying video coordinate frame.
    

This keeps rendering fluid, lightweight, and ensures your visual feedback matches the 60fps tracking demands of your creative marketing teams.