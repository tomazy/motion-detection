/**
 *
 * @param {HTMLVideoElement} video
 */
export function detectMotion(video) {
  const canvas = document.createElement("canvas");
  canvas.width = 0;
  canvas.height = 0;
  canvas.style.display = "none";

  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 0;
  previewCanvas.height = 0;
  previewCanvas.style.display = "none";

  const scale = 0.2;
  // const scale = 1;

  // const tileSize = 40; //pixels
  const tileSize = 4; //pixels

  const diffThreshold = 0.15;

  let previousBitmap;

  let lastAlertAt = 0;

  function alert(sentence) {
    const now = new Date().getTime();
    const elapsed = now - lastAlertAt;
    const minSilenceTime = 30 /* seconds */ * 1000;
    if (elapsed > minSilenceTime) {
      lastAlertAt = now;
      say(sentence);
    }
  }

  function setupCanvas(videoWidth, videoHeight) {
    if (canvas.width === 0 && videoWidth > 0) {
      canvas.width = previewCanvas.width = videoWidth * scale;
      canvas.height = previewCanvas.height = videoHeight * scale;
      document.body.appendChild(canvas);
      document.body.appendChild(previewCanvas);
    }
  }

  let lastVideoTime;
  function checkMotion() {
    // schedule next run
    requestAnimationFrame(checkMotion);

    // console.log(video.currentTime);
    if (lastVideoTime + 0.5 >= video.currentTime) {
      return;
    }

    setupCanvas(video.videoWidth, video.videoHeight);
    video.currentTime;
    if (canvas.width > 0) {
      withCtx(canvas, (ctx) => captureFrame(ctx, video));
      const bitmap = withCtx(canvas, (ctx) => computeBitmap(ctx, tileSize));

      if (previousBitmap) {
        const diff = [];
        for (let i = 0; i < bitmap.length; i++) {
          diff[i] = Math.abs(previousBitmap[i] - bitmap[i]);
        }
        withCtx(previewCanvas, (ctx) => drawBitmapPreview(ctx, diff, tileSize));
        let moved = motionDetected(diff, diffThreshold);
        // console.log("MOVED: %d", moved);
        if (moved > 0) {
          alert("Motion detected!");
        }
      }

      previousBitmap = bitmap;
    }
    lastVideoTime = video.currentTime;
  }

  console.log("width: %d", video.videoWidth);
  console.log("height: %d", video.videoHeight);
  video.addEventListener("timeupdate", () => {
    checkMotion();
  });
}

/**
 * @callback ctxCallback
 * @param {CanvasRenderingContext2D|null} ctx
 */

/**
 *
 * @param {HTMLCanvasElement} canvas
 * @param {ctxCallback} cb
 */
function withCtx(canvas, cb) {
  const ctx = canvas.getContext("2d");
  return cb(ctx);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} video
 */
function captureFrame(ctx, video) {
  ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} tileSize
 */
function computeBitmap(ctx, tileSize) {
  const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const result = [];

  let y = 0;
  while (y < ctx.canvas.height) {
    let x = 0;
    while (x < ctx.canvas.width) {
      const tile = computeTile(imgData, x, y, tileSize);
      result.push(tile);

      x += tileSize;
    }
    y += tileSize;
  }
  return result;
}

/**
 *
 * @param {Array<Number>} diff
 * @param {Number} diffThreshold
 * @returns
 */
function motionDetected(diff, diffThreshold) {
  return diff.filter((x) => x > diffThreshold).length;
}

function luminanceB(r, g, b) {
  return (0.299 * r) / 255 + (0.587 * g) / 255 + (0.114 * b) / 255;
}

/**
 *
 * @param {ImageData} data
 * @param {Number} x
 * @param {Number} y
 * @param {Number} tileSize
 */
function computeTile(data, x, y, tileSize) {
  let yy = 0;
  let buffer = [];
  while (yy < tileSize) {
    let xx = 0;
    while (xx < tileSize) {
      const pos = (x + xx + (y + yy) * data.width) * 4;
      const r = data.data[pos + 0];
      const g = data.data[pos + 1];
      const b = data.data[pos + 2];

      const lum = luminanceB(r, g, b);

      buffer.push(lum);

      xx += 1;
    }
    yy += 1;
  }

  const sum = buffer.reduce((p, c) => p + c);
  return sum / buffer.length;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Number>} bitmap
 * @param {Number} tileSize
 */
function drawBitmapPreview(ctx, bitmap, tileSize) {
  const bitmapWidth = ctx.canvas.width / tileSize;

  let y = 0;
  while (y < ctx.canvas.height) {
    let x = 0;
    while (x < ctx.canvas.width) {
      const bitmapPos = x / tileSize + (y / tileSize) * bitmapWidth;
      const tile = bitmap[bitmapPos];

      ctx.fillStyle = `rgb(${tile * 255}, ${tile * 255}, ${tile * 255})`;
      ctx.fillRect(x, y, tileSize, tileSize);

      x += tileSize;
    }
    y += tileSize;
  }
}

function say(sentence) {
  const synth = window.speechSynthesis;
  const utterThis = new SpeechSynthesisUtterance(sentence);
  synth.speak(utterThis);
}
