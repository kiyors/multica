import React, { useRef, useEffect, useState, useCallback } from "react";
import { ReviewAsset } from "@multica/core/types";

interface MediaReviewPlayerProps {
  asset: ReviewAsset;
}

export function MediaReviewPlayer({ asset }: MediaReviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Calculate the true rendered dimensions of the video/image to account for letterboxing
  const calculateTrueLayout = useCallback(() => {
    if (!containerRef.current || !mediaRef.current || !canvasRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    let mediaWidth = 0;
    let mediaHeight = 0;

    if (asset.asset_type === "video") {
      const video = mediaRef.current as HTMLVideoElement;
      mediaWidth = video.videoWidth;
      mediaHeight = video.videoHeight;
    } else {
      const img = mediaRef.current as HTMLImageElement;
      mediaWidth = img.naturalWidth;
      mediaHeight = img.naturalHeight;
    }

    if (mediaWidth === 0 || mediaHeight === 0) return;

    const containerAspect = container.width / container.height;
    const mediaAspect = mediaWidth / mediaHeight;

    let renderWidth, renderHeight, offsetX, offsetY;

    if (containerAspect > mediaAspect) {
      // Container is wider than media -> pillarboxed (bars on sides)
      renderHeight = container.height;
      renderWidth = renderHeight * mediaAspect;
      offsetX = (container.width - renderWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller than media -> letterboxed (bars on top/bottom)
      renderWidth = container.width;
      renderHeight = renderWidth / mediaAspect;
      offsetX = 0;
      offsetY = (container.height - renderHeight) / 2;
    }

    setLayout({
      x: offsetX,
      y: offsetY,
      width: renderWidth,
      height: renderHeight,
    });

    // Update canvas resolution to match rendered size for crisp drawing
    canvasRef.current.width = renderWidth;
    canvasRef.current.height = renderHeight;
  }, [asset.asset_type]);

  // Convert a mouse event (clientX/Y) to a normalized 0.0-1.0 coordinate
  const getNormalizedCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / layout.width,
        y: (clientY - rect.top) / layout.height,
      };
    },
    [layout]
  );

  // Convert a normalized 0.0-1.0 coordinate to a render pixel coordinate
  const getRenderCoordinates = useCallback(
    (nx: number, ny: number) => {
      return {
        x: nx * layout.width,
        y: ny * layout.height,
      };
    },
    [layout]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculateTrueLayout);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculateTrueLayout]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      {asset.asset_type === "video" ? (
        <video 
          ref={mediaRef as React.RefObject<HTMLVideoElement>} 
          src={asset.file_url} 
          className="max-w-full max-h-full" 
          controls 
          onLoadedMetadata={calculateTrueLayout}
        />
      ) : (
        <img 
          ref={mediaRef as React.RefObject<HTMLImageElement>} 
          src={asset.file_url} 
          alt={asset.name} 
          className="max-w-full max-h-full object-contain" 
          onLoad={calculateTrueLayout}
        />
      )}
      
      {/* 
        The canvas is absolutely positioned exactly over the rendered pixels of the media. 
        pointer-events-auto ensures it catches mouse events for drawing. 
      */}
      <canvas 
        ref={canvasRef} 
        className="absolute pointer-events-auto cursor-crosshair touch-none"
        style={{
          left: `${layout.x}px`,
          top: `${layout.y}px`,
          width: `${layout.width}px`,
          height: `${layout.height}px`,
        }}
      />
    </div>
  );
}
