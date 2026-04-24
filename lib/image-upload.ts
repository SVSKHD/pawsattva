"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/firebase";

interface UploadOptions {
  folder?: string;
  targetKB?: number;
  maxDimension?: number;
}

const RASTER_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const readAsDataURL = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image data."));
    reader.readAsDataURL(file);
  });

const imageFromDataURL = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode image."));
    image.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to compress image."))),
      type,
      quality
    );
  });

const compressToTarget = async (
  file: File,
  targetBytes: number,
  maxDimension: number
) => {
  if (!RASTER_TYPES.has(file.type) || file.size <= targetBytes) return file;

  const src = await readAsDataURL(file);
  const image = await imageFromDataURL(src);

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const maxSide = Math.max(width, height);
  if (maxSide > maxDimension) {
    const ratio = maxDimension / maxSide;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  let scale = 1;
  let quality = 0.88;
  let best = file;

  for (let attempt = 0; attempt < 9; attempt += 1) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const webpBlob = await canvasToBlob(canvas, "image/webp", quality);
    const candidate = new File([webpBlob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    if (candidate.size < best.size) best = candidate;
    if (candidate.size <= targetBytes) return candidate;

    quality = Math.max(0.45, quality - 0.09);
    if (attempt % 2 === 1) scale = Math.max(0.55, scale - 0.1);
  }

  return best;
};

export const uploadBlogImage = async (file: File, options: UploadOptions = {}) => {
  const folder = options.folder || "blog-images";
  const targetKB = options.targetKB ?? 220;
  const maxDimension = options.maxDimension ?? 1920;
  const targetBytes = targetKB * 1024;
  const originalBytes = file.size;
  const uploadFile = await compressToTarget(file, targetBytes, maxDimension);

  const extension = (uploadFile.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, uploadFile, { contentType: uploadFile.type || file.type });
  const url = await getDownloadURL(storageRef);

  return {
    url,
    originalKB: Math.round(originalBytes / 1024),
    compressedKB: Math.round(uploadFile.size / 1024),
    wasCompressed: uploadFile.size < originalBytes,
  };
};
