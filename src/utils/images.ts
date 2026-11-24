export async function sanitizePhoto(file: File): Promise<Blob> {
  if (!file || file.size > 15 * 1024 * 1024)
    throw new Error("Choose an image smaller than 15 MB.");
  if (file.type && !file.type.startsWith("image/"))
    throw new Error("The selected file is not an image.");
  let image: CanvasImageSource;
  let width = 0;
  let height = 0;
  let close: (() => void) | undefined;
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      image = bitmap; width = bitmap.width; height = bitmap.height; close = () => bitmap.close();
    } catch {
      image = await decodeWithImageElement(file);
      width = (image as HTMLImageElement).naturalWidth; height = (image as HTMLImageElement).naturalHeight;
    }
  } else {
    image = await decodeWithImageElement(file);
    width = (image as HTMLImageElement).naturalWidth; height = (image as HTMLImageElement).naturalHeight;
  }
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 800 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Unable to process this photo. Try a JPG or PNG image.")), "image/jpeg", 0.88));
  } finally { close?.(); }
}

async function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new Error("Your phone image format is not supported by this browser. Please convert HEIC/HEIF to JPG in your gallery, then upload again.");
  } finally { URL.revokeObjectURL(url); }
}
