The golden rule for responsive annotations is this: **Never save absolute pixel values to your database.** If you save an annotation at `X: 400px, Y: 300px`, it will float in the wrong place as soon as the video player scales down on a laptop screen.

Instead, you must save **normalized coordinates (percentages between 0.0 and 1.0)** and recalculate the pixels on the fly when rendering.

However, with video, there is a major trap: **Letterboxing**. Because videos maintain their aspect ratio, a 16:9 video inside a responsive container will often have black bars on the top/bottom or sides. If you map your coordinates to the DOM element instead of the actual video frame, your annotations will drift.

Here is the exact math to handle this in TypeScript.

## 1. Calculate the True Video Frame

First, you need a utility function that compares the video's intrinsic resolution (e.g., 1920x1080) against the current DOM element size to figure out exactly where the video pixels are sitting, ignoring the black bars.

```ts
interface VideoLayout {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number; // The width of the left/right black bars
  offsetY: number; // The height of the top/bottom black bars
}

function getTrueVideoLayout(videoRef: HTMLVideoElement): VideoLayout {
  const { videoWidth, videoHeight, clientWidth, clientHeight } = videoRef;
  
  // Find out how much the video was scaled down to fit the container
  const scale = Math.min(clientWidth / videoWidth, clientHeight / videoHeight);
  
  // Calculate the actual size of the video frame on screen
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  
  // Calculate the size of the black bars (centering the video)
  const offsetX = (clientWidth - renderedWidth) / 2;
  const offsetY = (clientHeight - renderedHeight) / 2;
  
  return { renderedWidth, renderedHeight, offsetX, offsetY };
}
```

## 2. Saving the Annotation (Mouse to Database)

When the user clicks the canvas to draw a box, you take the raw mouse coordinates, subtract the black bars, and divide by the true video width/height. This gives you a clean `0.0` to `1.0` ratio to save to your database.

```ts
function getNormalizedCoordinates(
  mouseX: number, 
  mouseY: number, 
  layout: VideoLayout
) {
  // 1. Remove the black bar offset
  const xInsideVideo = mouseX - layout.offsetX;
  const yInsideVideo = mouseY - layout.offsetY;

  // 2. Convert to a percentage (0.0 to 1.0)
  // Clamp to 0-1 so annotations can't be drawn in the black bars
  const normalizedX = Math.max(0, Math.min(1, xInsideVideo / layout.renderedWidth));
  const normalizedY = Math.max(0, Math.min(1, yInsideVideo / layout.renderedHeight));

  return { x: normalizedX, y: normalizedY };
}
```

## 3. Rendering the Annotation (Database to Canvas)

When you pull the annotations back out of the database to draw them using `fabric.js` or the native Canvas API, you reverse the math. Multiply the normalized value by the true video dimensions, then add the black bars back in so it aligns with the DOM.

```ts
function getRenderCoordinates(
  normalizedX: number, 
  normalizedY: number, 
  layout: VideoLayout
) {
  const pixelX = (normalizedX * layout.renderedWidth) + layout.offsetX;
  const pixelY = (normalizedY * layout.renderedHeight) + layout.offsetY;

  return { x: pixelX, y: pixelY };
}
```

## 4. Triggering the Redraw on Resize

To make this fluid when the user drags the edge of their browser window, you need to tell your `<canvas>` to clear itself and redraw every time the container size changes.

In Next.js/React, you achieve this using a `ResizeObserver`. Attach the observer to the video wrapper `<div>`. When the observer fires, update your state with the new container dimensions, recalculate `getTrueVideoLayout()`, and trigger your canvas drawing function with the updated layout.