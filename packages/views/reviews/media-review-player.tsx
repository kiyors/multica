/* eslint-disable i18next/no-literal-string */
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Play, Pause, Maximize2, SkipBack, SkipForward, Clock, Repeat } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@multica/ui/components/ui/tooltip";
import Hls from "hls.js";
import type { ReviewAsset, ReviewComment } from "@multica/core/types";
import { MediaScrubber, formatTimecode, formatTime, formatFrames } from "./media-scrubber";

export interface MediaReviewPlayerProps {
  asset: ReviewAsset;
  onTimeUpdate?: (currentTime: number) => void;
  comments?: ReviewComment[];
  selectedCommentId?: string;
  onSelectComment?: (id: string) => void;
  onDrawingShapeChange?: (shape: any) => void;
  pageIndex?: number;
}

export interface MediaReviewPlayerRef {
  seek: (time: number) => void;
  pause: () => void;
  getCanvasShapes: () => any;
  clearCanvasShapes: () => void;
  getCurrentTime: () => number;
}

export function isReviewCommentVisible(
  comment: ReviewComment,
  assetType: ReviewAsset["asset_type"],
  currentTime: number,
  selectedCommentId?: string,
): boolean {
  if (comment.id === selectedCommentId) return true;
  if (assetType === "image" || assetType === "pdf") return true;
  if (
    comment.start_time === null ||
    comment.start_time === undefined ||
    comment.end_time === null ||
    comment.end_time === undefined
  ) {
    return false;
  }
  if (comment.start_time === comment.end_time) {
    return Math.abs(currentTime - comment.start_time) <= 0.25;
  }
  return currentTime >= comment.start_time && currentTime <= comment.end_time;
}

export const MediaReviewPlayer = forwardRef<MediaReviewPlayerRef, MediaReviewPlayerProps>(
  ({ asset, onTimeUpdate, comments, selectedCommentId, onSelectComment, onDrawingShapeChange, pageIndex = 0 }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [drawingShape, setDrawingShape] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timeFormat, setTimeFormat] = useState<"standard" | "frames" | "timecode">("standard");
  const [localDuration, setLocalDuration] = useState<number>(asset.duration || 0);
  const isTimedMedia = asset.asset_type === "video" || asset.asset_type === "audio";

  useEffect(() => {
    setLocalDuration(asset.duration || 0);
  }, [asset.duration]);

  const calculateTrueLayout = useCallback(() => {
    if (!containerRef.current || !mediaRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    let mediaWidth = 0;
    let mediaHeight = 0;

    if (asset.asset_type === "video") {
      const video = mediaRef.current as HTMLVideoElement;
      mediaWidth = video.videoWidth;
      mediaHeight = video.videoHeight;
    } else if (asset.asset_type === "audio") {
      setLayout({ x: 0, y: 0, width: 0, height: 0 });
      return;
    } else {
      const img = mediaRef.current as HTMLImageElement;
      mediaWidth = img.naturalWidth;
      mediaHeight = img.naturalHeight;
    }

    if (!mediaWidth || !mediaHeight || !container.width || !container.height) return;

    const containerAspect = container.width / container.height;
    const mediaAspect = mediaWidth / mediaHeight;

    let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;

    if (containerAspect > mediaAspect) {
      renderHeight = container.height;
      renderWidth = renderHeight * mediaAspect;
      offsetX = (container.width - renderWidth) / 2;
      offsetY = 0;
    } else {
      renderWidth = container.width;
      renderHeight = renderWidth / mediaAspect;
      offsetX = 0;
      offsetY = (container.height - renderHeight) / 2;
    }

    setLayout({ x: offsetX, y: offsetY, width: renderWidth, height: renderHeight });
  }, [asset.asset_type]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => requestAnimationFrame(calculateTrueLayout));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculateTrueLayout]);

  useEffect(() => {
    requestAnimationFrame(calculateTrueLayout);
  }, [calculateTrueLayout]);

  useEffect(() => {
    setLayout({ x: 0, y: 0, width: 0, height: 0 });
    setDrawingShape(null);
    onDrawingShapeChange?.(null);
  }, [asset.id, onDrawingShapeChange]);

  useEffect(() => {
    if (asset.asset_type === "video" && asset.src_url.endsWith(".m3u8") && mediaRef.current) {
      const video = mediaRef.current as HTMLVideoElement;
      let hls: Hls | null = null;
      if (Hls.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(asset.src_url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = asset.src_url;
      }
      return () => {
        if (hls) hls.destroy();
      };
    }
    return undefined;
  }, [asset.src_url, asset.asset_type]);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (isTimedMedia && mediaRef.current) {
        (mediaRef.current as HTMLMediaElement).currentTime = time;
      }
    },
    pause: () => {
      if (isTimedMedia && mediaRef.current) {
        (mediaRef.current as HTMLMediaElement).pause();
      }
    },
    getCanvasShapes: () => {
      if (!drawingShape) return [];
      const shape = { ...drawingShape };
      if (shape.width < 0) { shape.x += shape.width; shape.width = Math.abs(shape.width); }
      if (shape.height < 0) { shape.y += shape.height; shape.height = Math.abs(shape.height); }
      if (shape.width < 0.01 && shape.height < 0.01) return [];
      return [shape];
    },
    clearCanvasShapes: () => {
      setDrawingShape(null);
      onDrawingShapeChange?.(null);
    },
    getCurrentTime: () => currentTime,
  }));

  const handleTimeUpdate = () => {
    if (isTimedMedia && mediaRef.current) {
      const time = (mediaRef.current as HTMLMediaElement).currentTime;
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const color = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'][Math.floor(Math.random() * 6)];
    const newShape = { type: 'rectangle', x, y, width: 0, height: 0, color, strokeWidth: 2 };
    setDrawingShape(newShape);
    onDrawingShapeChange?.(newShape);
    
    if ((asset.asset_type === "video") && mediaRef.current) {
      (mediaRef.current as HTMLMediaElement).pause();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !drawingShape || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const newShape = {
      ...drawingShape,
      width: x - drawingShape.x,
      height: y - drawingShape.y,
    };
    setDrawingShape(newShape);
    onDrawingShapeChange?.(newShape);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDrawing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (drawingShape) {
      window.dispatchEvent(new CustomEvent('focus-review-comment'));
    }
  };

  const visibleComments = (comments || []).filter((comment) => (comment.page_index ?? 0) === pageIndex).filter((comment) =>
    isReviewCommentVisible(
      comment,
      asset.asset_type,
      currentTime,
      selectedCommentId,
    ),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isTimedMedia || !mediaRef.current) return;
    const media = mediaRef.current as HTMLMediaElement;
    
    // Ignore keyboard events if we're focused in an input/textarea
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        if (media.paused) media.play(); else media.pause();
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        media.currentTime = Math.max(0, media.currentTime - 10);
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        if (localDuration > 0) {
          media.currentTime = Math.min(localDuration, media.currentTime + 10);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        media.currentTime = Math.max(0, media.currentTime - (asset.asset_type === "audio" ? 5 : 1 / 30));
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (localDuration > 0) {
          media.currentTime = Math.min(localDuration, media.currentTime + (asset.asset_type === "audio" ? 5 : 1 / 30));
        }
        break;
    }
  };

  const handlePlayPause = () => {
    if (!mediaRef.current || !isTimedMedia) return;
    const media = mediaRef.current as HTMLMediaElement;
    if (media.paused) media.play();
    else media.pause();
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const stepFrame = (frames: number) => {
    if (!mediaRef.current || !isTimedMedia) return;
    const media = mediaRef.current as HTMLMediaElement;
    const delta = asset.asset_type === "audio" ? frames * 5 : frames * (1 / 30);
    media.currentTime = Math.max(0, Math.min(localDuration || 0, media.currentTime + delta));
  };

  return (
    <TooltipProvider>
      <div 
        ref={containerRef} 
        className="relative w-full h-full overflow-hidden flex items-center justify-center select-none rounded-md outline-none bg-black group"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {asset.asset_type === "pdf" ? (
          <iframe
            title={asset.name}
            src={`${asset.src_url}#page=${pageIndex + 1}&view=Fit`}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        ) : asset.asset_type === "video" ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={asset.src_url.endsWith('.m3u8') ? undefined : asset.src_url}
            className="absolute inset-0 w-full h-full object-contain shadow-lg rounded-sm"
            onLoadedMetadata={(e) => {
              calculateTrueLayout();
              setLocalDuration((e.target as HTMLVideoElement).duration);
            }}
            onDurationChange={(e) => setLocalDuration((e.target as HTMLVideoElement).duration)}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={handlePlayPause}
            loop={isLooping}
          />
        ) : asset.asset_type === "audio" ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={asset.src_url}
            controls
            className="relative z-10 w-[min(720px,90%)]"
            aria-label={asset.name}
            onLoadedMetadata={(e) => setLocalDuration((e.target as HTMLAudioElement).duration)}
            onDurationChange={(e) => setLocalDuration((e.target as HTMLAudioElement).duration)}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            loop={isLooping}
          />
        ) : (
        <img
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={asset.src_url}
          alt={asset.name}
          className="absolute inset-0 w-full h-full object-contain"
          onLoad={calculateTrueLayout}
          referrerPolicy="no-referrer"
        />
      )}

      {layout.width > 0 && (
        <div
          ref={overlayRef}
          className="absolute pointer-events-auto cursor-crosshair touch-none"
          style={{
            left: layout.x,
            top: layout.y,
            width: layout.width,
            height: layout.height,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {visibleComments.map(c => 
            c.shapes?.map((s: any, i: number) => {
              const isSelected = selectedCommentId === c.id;
              return (
                <div 
                  key={`${c.id}-${i}`} 
                  className="absolute pointer-events-auto transition-all cursor-pointer" 
                  style={{
                    left: `${s.x * 100}%`,
                    top: `${s.y * 100}%`,
                    width: `${s.width * 100}%`,
                    height: `${s.height * 100}%`,
                    border: `2px solid ${s.color}`,
                    boxShadow: isSelected 
                      ? `0 0 0 2px rgba(255,255,255,0.8), 0 0 15px ${s.color}` 
                      : '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.5)',
                    backgroundColor: isSelected ? `${s.color}40` : `${s.color}20`,
                    zIndex: isSelected ? 10 : 1
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (onSelectComment) onSelectComment(c.id);
                  }}
                />
              );
            })
          )}

          {drawingShape && (
            <div className="absolute border-2 pointer-events-none z-20" style={{
              left: `${Math.min(drawingShape.x, drawingShape.x + drawingShape.width) * 100}%`,
              top: `${Math.min(drawingShape.y, drawingShape.y + drawingShape.height) * 100}%`,
              width: `${Math.abs(drawingShape.width) * 100}%`,
              height: `${Math.abs(drawingShape.height) * 100}%`,
              borderColor: drawingShape.color,
              backgroundColor: `${drawingShape.color}30`,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.5)'
            }} />
          )}
        </div>
      )}

      {isTimedMedia && localDuration > 0 && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-4">
          <MediaScrubber 
            currentTime={currentTime} 
            duration={localDuration} 
            comments={comments} 
            streamUrl={asset.src_url}
            selectedCommentId={selectedCommentId}
            onSeek={(t) => {
              if (mediaRef.current) (mediaRef.current as HTMLMediaElement).currentTime = t;
            }}
            onSelectComment={onSelectComment}
          />
        </div>
      )}

      {/* Glassmorphism Custom Controls (only for video/audio) */}
      {isTimedMedia && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-background/80 border border-border/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
          
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-micro font-mono w-16 text-center select-none text-foreground">
              {timeFormat === "standard" && formatTime(currentTime)}
              {timeFormat === "frames" && formatFrames(currentTime)}
              {timeFormat === "timecode" && formatTimecode(currentTime)}
            </span>
            <Tooltip>
              <TooltipTrigger 
                onClick={() => setTimeFormat(prev => prev === "standard" ? "frames" : prev === "frames" ? "timecode" : "standard")}
                className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Toggle Time Format</TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            className="text-micro font-mono hover:bg-muted px-2 py-1 rounded text-foreground transition-colors"
            onClick={() => {
              const speeds = [0.5, 1, 1.25, 1.5, 2];
              const idx = speeds.indexOf(playbackRate);
              const nextSpeed = speeds[(idx + 1) % speeds.length] ?? 1;
              const video = mediaRef.current as HTMLVideoElement;
              if (video) video.playbackRate = nextSpeed;
              setPlaybackRate(nextSpeed);
            }}
          >
            {playbackRate}x
          </button>

          <Tooltip>
            <TooltipTrigger 
              onClick={() => stepFrame(-1)} 
              className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">{asset.asset_type === "audio" ? "Back 5 seconds" : "Frame Back"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger 
              onClick={handlePlayPause} 
              className="p-2 bg-foreground text-background hover:scale-105 rounded-full transition-transform"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </TooltipTrigger>
            <TooltipContent side="top">{isPlaying ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger 
              onClick={() => stepFrame(1)} 
              className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">{asset.asset_type === "audio" ? "Forward 5 seconds" : "Frame Forward"}</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger 
              onClick={() => setIsLooping(!isLooping)} 
              className={`p-1.5 hover:bg-muted rounded-full transition-colors ${isLooping ? 'text-primary' : 'text-foreground'}`}
            >
              <Repeat className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">{isLooping ? "Disable Loop" : "Enable Loop"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger 
              onClick={handleFullscreen} 
              className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">Fullscreen</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
});

MediaReviewPlayer.displayName = "MediaReviewPlayer";
