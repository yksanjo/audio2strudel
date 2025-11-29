import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

interface WaveformVisualizerProps {
  audioFile: File | null;
  waveformData?: number[];
}

export function WaveformVisualizer({ audioFile, waveformData }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localWaveform, setLocalWaveform] = useState<number[]>([]);

  useEffect(() => {
    if (waveformData && waveformData.length > 0) {
      setLocalWaveform(waveformData);
      return;
    }

    if (!audioFile) {
      setLocalWaveform([]);
      return;
    }

    const loadWaveform = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(channelData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        const maxVal = Math.max(...filteredData);
        const normalized = filteredData.map(val => val / maxVal);
        setLocalWaveform(normalized);
        
        await audioContext.close();
      } catch (err) {
        console.error("Failed to load waveform:", err);
      }
    };

    loadWaveform();
  }, [audioFile, waveformData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (localWaveform.length === 0) {
        ctx.strokeStyle = "hsl(262, 30%, 30%)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "hsl(262, 15%, 45%)";
        ctx.font = "14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Audio waveform will appear here", width / 2, centerY + 30);
        return;
      }

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "hsl(262, 83%, 65%)");
      gradient.addColorStop(0.5, "hsl(217, 91%, 60%)");
      gradient.addColorStop(1, "hsl(280, 70%, 55%)");

      const barWidth = width / localWaveform.length;
      const maxBarHeight = height * 0.8;

      localWaveform.forEach((value, index) => {
        const x = index * barWidth;
        const barHeight = value * maxBarHeight;

        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);

        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, centerY + barHeight / 2, barWidth - 1, barHeight * 0.3);
      });

      ctx.globalAlpha = 1;
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [localWaveform]);

  return (
    <Card className="p-4 border border-border/50">
      <div 
        ref={containerRef} 
        className="relative h-32 w-full rounded-lg bg-background/50 overflow-hidden"
        data-testid="waveform-container"
      >
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0"
          data-testid="waveform-canvas"
        />
      </div>
    </Card>
  );
}
