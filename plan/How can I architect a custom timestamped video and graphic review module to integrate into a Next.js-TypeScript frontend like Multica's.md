Architecting a media review module inside a Next.js/TypeScript application requires synchronizing three distinct layers: a media player (or image viewer), a transparent drawing canvas for visual annotations, and a real-time data state for comments.

Here is a blueprint for building this module to seamlessly integrate with Multica's task routing.

## 1. The Core Data Architecture

You need a data structure that can handle both static images (which only need X/Y coordinates) and video (which needs X/Y coordinates _plus_ a timestamp).

```ts
// Define the base geometry for visual markup
interface AnnotationShape {
  type: 'rectangle' | 'arrow' | 'dot';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
}

// The core comment payload
interface ReviewComment {
  id: string;
  authorId: string;
  assetId: string; // Ties back to the Multica task/issue
  content: string; // The text feedback
  timestamp?: number; // In seconds. Null if it's a static graphic
  shapes: AnnotationShape[]; // The visual markup on the frame
  resolved: boolean;
}
```

## 2. Frontend Component Stack

To build the Next.js interfaces without creating a clunky, bloated DOM, you will layer these components:

- **The Media Layer:** Use a standard HTML5 `<video>` tag or a lightweight wrapper like `video.js`. For static graphics, use a standard Next.js `<Image>` component.
    
- **The Canvas Overlay:** Position an HTML5 `<canvas>` absolutely over the media player. A lightweight library like `fabric.js` is excellent for handling the drawing of boxes and arrows. It serializes the drawing into JSON, which maps perfectly to the `AnnotationShape` interface.
    
- **The UI & Layout:** When wrapping the video player, scrubber, and comment sidebar, `animate-ui` will provide the fluid, interactive layouts needed to make this feel like a premium marketing tool rather than a rigid developer dashboard.
    

## 3. Handling Assets and Storage

Before you can review an asset, it needs to be securely stored and served.

- **Static Graphics:** Route all static asset uploads directly to your `uploadImage` endpoint. Return the CDN URL and attach it to the Multica issue payload.
    
- **Video Files:** Videos require a bit more care. If the marketing team is uploading heavy 4K raw cuts, you should upload them directly to an S3-compatible storage bucket using pre-signed URLs, rather than piping massive video buffers through your Next.js API routes.
    

## 4. Synchronizing State (The Tricky Part)

The magic of a video review tool is that clicking a comment in the sidebar instantly jumps the video to that exact frame and draws the annotation.

You will need a unified state manager (Zustand is highly recommended for Next.js over Redux due to less boilerplate) to track the `currentTime` of the video.

1. **Time Update Listener:** As the video plays, it fires an `onTimeUpdate` event. Your state manager rounds this to the nearest tenth of a second.
    
2. **Comment Filtering:** The sidebar component subscribes to this time state. It highlights any `ReviewComment` where the `timestamp` matches the current video time (± 1 second).
    
3. **Scrubbing:** When a user clicks a comment in the sidebar, the `onClick` handler updates the video ref: `videoRef.current.currentTime = comment.timestamp`, and the canvas overlay renders the `shapes` array for that specific comment.
    

## 5. Development Workflow Recommendations

Because this UI is highly visual and requires precise spacing, you can accelerate the build by using a Figma MCP server to pipe the design specs directly into your development workflow.

Since you will be doing heavy test-driven iteration to get the canvas-to-video synchronization perfect, keep the Next.js workspace strictly managed with `pnpm` and enforce your linting and formatting rules with Biome and Oxfmt from day one. This ensures the frontend code remains as rigorous as your backend services.