import { useRef, useState, useCallback } from "react";
import { Upload, Music, FileAudio, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

export interface BatchFile {
  id: string;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
}

interface BatchUploaderProps {
  files: BatchFile[];
  onFilesSelect: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function BatchUploader({ 
  files, 
  onFilesSelect, 
  onRemoveFile, 
  onClearAll, 
  disabled,
  maxFiles = 10
}: BatchUploaderProps) {
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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith("audio/")
    );
    
    if (droppedFiles.length > 0) {
      onFilesSelect(droppedFiles.slice(0, maxFiles - files.length));
    }
  }, [disabled, onFilesSelect, files.length, maxFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      file => file.type.startsWith("audio/")
    );
    
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles.slice(0, maxFiles - files.length));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const getStatusIcon = (status: BatchFile["status"]) => {
    switch (status) {
      case "pending":
        return <Music className="w-4 h-4 text-muted-foreground" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-chart-1" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusText = (status: BatchFile["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing...";
      case "completed":
        return "Complete";
      case "error":
        return "Error";
    }
  };

  const completedCount = files.filter(f => f.status === "completed").length;
  const processingCount = files.filter(f => f.status === "processing").length;
  const pendingCount = files.filter(f => f.status === "pending").length;
  const errorCount = files.filter(f => f.status === "error").length;

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        multiple
        className="hidden"
        disabled={disabled}
        data-testid="input-batch-audio-files"
      />

      {files.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h3 className="font-semibold text-foreground" data-testid="text-batch-file-count">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </h3>
              <div className="flex items-center gap-2 text-sm">
                {completedCount > 0 && (
                  <Badge variant="secondary" className="gap-1" data-testid="badge-completed-count">
                    <CheckCircle className="w-3 h-3" />
                    {completedCount} done
                  </Badge>
                )}
                {processingCount > 0 && (
                  <Badge variant="secondary" className="gap-1" data-testid="badge-processing-count">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {processingCount} processing
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge variant="outline" className="gap-1" data-testid="badge-pending-count">
                    {pendingCount} pending
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1" data-testid="badge-error-count">
                    <AlertCircle className="w-3 h-3" />
                    {errorCount} failed
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {files.length < maxFiles && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={disabled}
                  data-testid="button-add-more-files"
                >
                  Add More
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                disabled={disabled || processingCount > 0}
                data-testid="button-clear-all-files"
              >
                Clear All
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-64">
            <div className="space-y-2 pr-4">
              {files.map((batchFile) => (
                <div
                  key={batchFile.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                  data-testid={`batch-file-${batchFile.id}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <FileAudio className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="font-medium text-foreground truncate text-sm"
                        data-testid={`text-batch-filename-${batchFile.id}`}
                      >
                        {batchFile.file.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getFileExtension(batchFile.file.name)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(batchFile.file.size)}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        {getStatusIcon(batchFile.status)}
                        <span className={
                          batchFile.status === "completed" ? "text-chart-1" :
                          batchFile.status === "error" ? "text-destructive" :
                          batchFile.status === "processing" ? "text-primary" :
                          "text-muted-foreground"
                        }>
                          {batchFile.error || getStatusText(batchFile.status)}
                        </span>
                      </span>
                    </div>
                    
                    {batchFile.status === "processing" && (
                      <Progress 
                        value={batchFile.progress} 
                        className="h-1 mt-2"
                        data-testid={`progress-batch-${batchFile.id}`}
                      />
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveFile(batchFile.id)}
                    disabled={disabled || batchFile.status === "processing"}
                    data-testid={`button-remove-batch-file-${batchFile.id}`}
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {files.length < maxFiles && (
        <Card
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative overflow-visible cursor-pointer
            transition-all duration-300 hover-elevate
            ${files.length > 0 ? "min-h-32 border-dashed" : "min-h-64 border-2 border-dashed"}
            ${isDragging 
              ? "border-primary bg-primary/10 scale-[1.01]" 
              : "border-muted-foreground/30 hover:border-primary/50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          data-testid="dropzone-batch-audio"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            {files.length === 0 ? (
              <>
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
                  {isDragging ? "Drop your audio files here" : "Drop audio files or click to browse"}
                </h3>
                
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Upload up to {maxFiles} audio files for batch processing
                </p>
                
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {["MP3", "WAV", "OGG", "FLAC", "M4A"].map((format) => (
                    <Badge key={format} variant="outline" className="text-xs font-mono">
                      {format}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Upload className={`w-8 h-8 mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm text-muted-foreground">
                  {isDragging ? "Drop to add files" : `Add up to ${maxFiles - files.length} more file${maxFiles - files.length !== 1 ? "s" : ""}`}
                </p>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
