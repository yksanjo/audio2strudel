import { Music, Clock, Hash, Gauge, FileAudio, Waves } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AnalysisResult } from "@shared/schema";

interface MetadataDisplayProps {
  result: AnalysisResult;
  fileSize?: number;
  fileName?: string;
}

export function MetadataDisplay({ result, fileSize, fileName }: MetadataDisplayProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSampleRate = (rate: number) => {
    return `${(rate / 1000).toFixed(1)} kHz`;
  };

  const stats = [
    {
      icon: Music,
      label: "Detected Notes",
      value: result.melody.length.toString(),
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      icon: Hash,
      label: "Chord Changes",
      value: result.chords.length.toString(),
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      icon: Clock,
      label: "Duration",
      value: formatDuration(result.duration),
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      icon: Waves,
      label: "Sample Rate",
      value: formatSampleRate(result.sampleRate),
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      icon: Gauge,
      label: "Est. Tempo",
      value: result.estimatedTempo ? `${result.estimatedTempo} BPM` : "N/A",
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
    {
      icon: FileAudio,
      label: "File Size",
      value: fileSize ? formatFileSize(fileSize) : "N/A",
      color: "text-muted-foreground",
      bgColor: "bg-muted/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="metadata-display">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className="p-4 border border-border/50"
          data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className="text-lg font-bold text-foreground truncate" data-testid={`value-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
