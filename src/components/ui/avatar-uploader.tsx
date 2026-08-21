import React, { useRef, useState } from "react";
import { Upload, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { processImageFile } from "@/lib/imageUtils";

interface AvatarUploaderProps {
  currentAvatar: string;
  onAvatarChange: (newAvatar: string) => void;
  presetAvatars: string[];
  label?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatar,
  onAvatarChange,
  presetAvatars,
  label = "Avatar",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedDataUrl = await processImageFile(file, 256);
      onAvatarChange(compressedDataUrl);
    } catch (err) {
      console.warn("Avatar upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isCustomUploaded = !presetAvatars.includes(currentAvatar) && currentAvatar.startsWith("data:");

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground/80">{label}:</label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-primary hover:underline"
        >
          {showUrlInput ? "Hide image URL" : "Enter image URL"}
        </button>
      </div>

      {/* Preset and Upload Actions Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Preset Gallery */}
        {presetAvatars.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onAvatarChange(url)}
            className={`relative size-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
              currentAvatar === url ? "border-primary ring-2 ring-primary/40 scale-105" : "border-transparent opacity-80"
            }`}
          >
            <img src={url} alt={`Preset ${i}`} className="size-full object-cover" />
            {currentAvatar === url && (
              <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                <Check className="size-3.5 text-white" />
              </div>
            )}
          </button>
        ))}

        {/* Custom Uploaded Badge/Thumbnail */}
        {isCustomUploaded && (
          <div className="relative size-10 rounded-full overflow-hidden border-2 border-primary ring-2 ring-primary/40 scale-105">
            <img src={currentAvatar} alt="Custom" className="size-full object-cover" />
            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
              <Check className="size-3.5 text-white" />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="size-10 rounded-full border border-dashed border-border/90 bg-muted/40 hover:bg-accent flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all group"
          title="Upload custom image file from your computer"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <Upload className="size-4 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Optional URL Input */}
      {showUrlInput && (
        <div className="flex items-center gap-2 pt-1 animate-in fade-in-50">
          <ImageIcon className="size-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={currentAvatar.startsWith("data:") ? "" : currentAvatar}
            onChange={(e) => onAvatarChange(e.target.value)}
            placeholder="Paste image link (https://...)..."
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-light"
          />
        </div>
      )}
    </div>
  );
};
