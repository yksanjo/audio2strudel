import { useRef, useState, useCallback } from "react";
import { Upload, Music, FileAudio, X, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export function AudioUploader({ onFileSelect, selectedFile, onClear, disabled }: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("audio/")) {
      onFileSelect(droppedFile);
    }
  }, [disabled, onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "AUDIO";
  };

  if (selectedFile) {
    return (
      <Card className="p-6 border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <FileAudio className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate" data-testid="text-filename">
                {selectedFile.name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {getFileExtension(selectedFile.name)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span data-testid="text-filesize">{formatFileSize(selectedFile.size)}</span>
              <span className="flex items-center gap-1 text-chart-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Ready to analyze
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={disabled}
            data-testid="button-clear-file"
            aria-label="Remove file"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
        disabled={disabled}
        data-testid="input-audio-file"
      />
      <Card
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative overflow-visible min-h-64 border-2 border-dashed cursor-pointer
          transition-all duration-300 hover-elevate
          ${isDragging 
            ? "border-primary bg-primary/10 scale-[1.01]" 
            : "border-muted-foreground/30 hover:border-primary/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        data-testid="dropzone-audio"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <div className={`
            w-20 h-20 rounded-2xl mb-6 flex items-center justify-center
            transition-all duration-300
            ${isDragging 
              ? "bg-gradient-to-br from-primary to-secondary scale-110" 
              : "bg-muted"
            }
          `}>
            {isDragging ? (
              <Music className="w-10 h-10 text-primary-foreground animate-pulse" />
            ) : (
              <Upload className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {isDragging ? "Drop your audio file here" : "Drop audio file or click to browse"}
          </h3>
          
          <p className="text-muted-foreground mb-6 max-w-sm">
            Upload any audio file to extract melody patterns and chord progressions for Strudel
          </p>
          
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {["MP3", "WAV", "OGG", "FLAC", "M4A"].map((format) => (
              <Badge key={format} variant="outline" className="text-xs font-mono">
                {format}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
