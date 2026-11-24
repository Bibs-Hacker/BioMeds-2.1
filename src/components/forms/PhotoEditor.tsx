import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, RotateCw, ZoomIn } from "lucide-react";

type Props = {
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
};

async function loadPhoto(
  file: File,
): Promise<{
  image: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      /* Some mobile formats/MIME declarations need the browser image decoder fallback. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoEditor({ value, onChange, required = false }: Props) {
  const [source, setSource] = useState<File | null>(value);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbackRef = useRef(onChange);
  const generatedRef = useRef<File | null>(null);
  callbackRef.current = onChange;
  useEffect(() => {
    if (value !== generatedRef.current) {
      generatedRef.current = null;
      setSource(value);
      setRotation(0);
      setZoom(1);
    }
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!source) {
        callbackRef.current(null);
        return;
      }
      if (source.size > 15 * 1024 * 1024) {
        setError(
          "That image is larger than 15 MB. Choose a smaller photo or resize it on your phone.",
        );
        callbackRef.current(null);
        return;
      }
      setWorking(true); setError("");
      let decoded: Awaited<ReturnType<typeof loadPhoto>> | undefined;
      try {
        decoded = await loadPhoto(source);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const size = 800;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Your browser could not open the photo editor.");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, size);
        const radians = (rotation * Math.PI) / 180;
        const rotatedW =
          Math.abs(decoded.width * Math.cos(radians)) +
          Math.abs(decoded.height * Math.sin(radians));
        const rotatedH =
          Math.abs(decoded.width * Math.sin(radians)) +
          Math.abs(decoded.height * Math.cos(radians));
        const scale = Math.max(size / rotatedW, size / rotatedH) * zoom;
        ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(radians);
        ctx.drawImage(
          decoded.image,
          (-decoded.width * scale) / 2,
          (-decoded.height * scale) / 2,
          decoded.width * scale,
          decoded.height * scale,
        );
        ctx.restore();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("Could not prepare this photo. Try another image.")),
            "image/jpeg",
            0.88,
          ),
        );
        if (cancelled) return;
        const edited = new File([blob], "recognition-photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
        generatedRef.current = edited;
        callbackRef.current(edited);
      } catch {
        if (!cancelled) {
          setError("This phone image could not be decoded by your browser. Please choose JPG, PNG or WebP, or convert HEIC/HEIF to JPG in your phone gallery.");
          callbackRef.current(null);
        }
      } finally {
        decoded?.close?.();
        if (!cancelled) setWorking(false);
      }
    }
    void render();
    return () => { cancelled = true; };
  }, [source, rotation, zoom]);

  function choose(file?: File) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("Choose an image smaller than 15 MB.");
      return;
    }
    const knownImageExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
    if (file.type && !file.type.startsWith("image/") && !knownImageExtension) {
      setError("Please choose a JPG, PNG, WebP or supported phone image.");
      return;
    }
    setSource(file); setRotation(0); setZoom(1); setError("");
  }

  return <div className="photo-editor">
    <label className="photo-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files?.[0]); }}>
      <input type="file" accept="image/*,.heic,.heif" required={required && !value} onChange={e => choose(e.target.files?.[0])} />
      <ImagePlus size={26} />
      <strong>Click to add or drag and drop one</strong>
      <span>Choose a photo from your phone, camera or computer</span>
      <small>JPG, PNG, WebP and supported phone image formats · up to 15 MB before editing</small>
    </label>
    {source && <div className="photo-editor-tools">
      <div className="photo-crop-preview"><canvas ref={canvasRef} aria-label="Cropped profile photo preview" /></div>
      <div className="photo-controls">
        <span className="muted">Adjust your photo before submitting</span>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setRotation(v => (v - 90 + 360) % 360)}><RotateCcw size={16}/> Rotate left</button>
          <button type="button" className="secondary" onClick={() => setRotation(v => (v + 90) % 360)}><RotateCw size={16}/> Rotate right</button>
          <button type="button" className="secondary" onClick={() => { setRotation(0); setZoom(1); }}>Reset</button>
        </div>
        <label className="photo-zoom"><span><ZoomIn size={16}/> Zoom / crop</span><input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label>
        <small>{working ? "Preparing photo…" : "Square crop · JPEG optimized for reliable mobile upload"}</small>
        <button type="button" className="secondary" onClick={() => { setSource(null); setRotation(0); setZoom(1); generatedRef.current = null; callbackRef.current(null); }}>Remove photo</button>
      </div>
    </div>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
