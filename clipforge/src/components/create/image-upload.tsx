"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export interface UploadedImage {
  path: string;
  previewUrl: string;
}

export function ImageUpload({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: UploadedImage | null;
  onChange: (image: UploadedImage | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 10 MB.");
      return;
    }
    setUploading(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("inputs").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    onChange({ path, previewUrl: URL.createObjectURL(file) });
  }

  if (value) {
    return (
      <div className="relative w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.previewUrl} alt="Uploaded product" className="max-h-64 rounded-xl border object-contain" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 hover:bg-black"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void upload(file);
      }}
      disabled={uploading}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-sm text-muted-foreground transition-colors hover:border-violet-500/60 hover:bg-violet-500/5",
        dragging && "border-violet-500 bg-violet-500/10",
      )}
    >
      {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
      <span className="font-medium text-foreground">{uploading ? "Uploading…" : "Upload a product photo"}</span>
      <span className="text-xs">PNG, JPG or WebP · up to 10 MB · tap or drag & drop</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
