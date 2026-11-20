import * as THREE from "three";
import type { Media } from "@/lib/types";

export type LoadedCover = {
  texture: THREE.Texture;
  width: number;
  height: number;
  video?: HTMLVideoElement;
};

const isPlainVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) || url.includes("cdn.sanity.io/files/");

/** Sanity images are resized on their CDN; 1600px wide is plenty for an open card. */
function sized(url: string) {
  if (!url.includes("cdn.sanity.io/images/")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}w=1600&fm=jpg&q=82`;
}

function finish(texture: THREE.Texture) {
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Placeholder covers are CSS gradients; draw their colours onto a small canvas. */
function swatchTexture(swatch: string): LoadedCover {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext("2d")!;
  const colours = swatch.match(/#[0-9a-f]{3,8}\b/gi) ?? ["#1e1e1e"];
  if (swatch.includes("radial")) {
    const g = ctx.createRadialGradient(560, 300, 0, 560, 300, 560);
    colours.forEach((c, i) => g.addColorStop(colours.length === 1 ? 0 : i / (colours.length - 1), c));
    ctx.fillStyle = g;
  } else if (colours.length > 1) {
    const g = ctx.createLinearGradient(0, 0, 800, 500);
    colours.forEach((c, i) => g.addColorStop(i / (colours.length - 1), c));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = colours[0];
  }
  ctx.fillRect(0, 0, 800, 500);
  return { texture: finish(new THREE.CanvasTexture(canvas)), width: 800, height: 500 };
}

function videoTexture(url: string): Promise<LoadedCover> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    video.addEventListener(
      "loadeddata",
      () => resolve({ texture: finish(new THREE.VideoTexture(video)), width: video.videoWidth || 1600, height: video.videoHeight || 900, video }),
      { once: true },
    );
    video.addEventListener("error", () => reject(new Error(`video failed: ${url}`)), { once: true });
    video.load();
  });
}

async function imageTexture(url: string): Promise<LoadedCover> {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const texture = await loader.loadAsync(sized(url));
  const img = texture.image as HTMLImageElement;
  return { texture: finish(texture), width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

/** Video if the cover has a plain video file, otherwise the image, otherwise the placeholder colours. */
export async function loadCover(media?: Media | null): Promise<LoadedCover> {
  if (media?.videoUrl && isPlainVideo(media.videoUrl)) {
    try {
      return await videoTexture(media.videoUrl);
    } catch {
      /* fall through to the image */
    }
  }
  if (media?.imageUrl) return imageTexture(media.imageUrl);
  return swatchTexture(media?.swatch || "#1e1e1e");
}
