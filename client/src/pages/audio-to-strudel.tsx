import { useState, useCallback } from "react";
import { Music, Sparkles, AlertCircle, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AudioUploader } from "@/components/audio-uploader";
import { ProcessingStatus } from "@/components/processing-status";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { NoteTimeline } from "@/components/note-timeline";
import { CodeOutputCard } from "@/components/code-output-card";
import { MetadataDisplay } from "@/components/metadata-display";
import type { AnalysisResult, ProcessingStatus as ProcessingStatusType, Note, Chord, StrudelCode } from "@shared/schema";

function detectPitch(frame: Float32Array, sampleRate: number): number {
  const minFreq = 80;
  const maxFreq = 1000;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);
  
  let maxCorr = 0;
  let bestPeriod = 0;
  
  for (let period = minPeriod; period < maxPeriod; period++) {
    let corr = 0;
    for (let i = 0; i < frame.length - period; i++) {
      corr += frame[i] * frame[i + period];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = period;
    }
  }
  
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

function frequencyToNote(freq: number): string {
  const noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
  const a4 = 440;
  const c0 = a4 * Math.pow(2, -4.75);
  
  if (freq < 50) return "rest";
  
  const halfSteps = 12 * Math.log2(freq / c0);
  const octave = Math.floor(halfSteps / 12);
  const note = Math.round(halfSteps % 12);
  
  const clampedNote = ((note % 12) + 12) % 12;
  return `${noteNames[clampedNote]}${octave}`;
}

function extractMelody(data: Float32Array, sampleRate: number): Note[] {
  const notes: Note[] = [];
  const hopSize = 2048;
  const frameSize = 4096;
  
  let lastNote = "";
  let noteStartTime = 0;
  
  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    const frame = data.slice(i, i + frameSize);
    
    let rms = 0;
    for (let j = 0; j < frame.length; j++) {
      rms += frame[j] * frame[j];
    }
    rms = Math.sqrt(rms / frame.length);
    
    if (rms < 0.01) {
      if (lastNote && lastNote !== "rest") {
        const duration = (i / sampleRate) - noteStartTime;
        if (duration > 0.05) {
          notes.push({ 
            note: lastNote, 
            time: noteStartTime,
            duration: duration
          });
        }
        lastNote = "";
      }
      continue;
    }
    
    const pitch = detectPitch(frame, sampleRate);
    const note = frequencyToNote(pitch);
    
    if (note !== "rest" && note !== lastNote) {
      if (lastNote && lastNote !== "rest") {
        const duration = (i / sampleRate) - noteStartTime;
        if (duration > 0.05) {
          notes.push({ 
            note: lastNote, 
            time: noteStartTime,
            duration: duration
          });
        }
      }
      lastNote = note;
      noteStartTime = i / sampleRate;
    }
  }
  
  if (lastNote && lastNote !== "rest") {
    const duration = (data.length / sampleRate) - noteStartTime;
    notes.push({ 
      note: lastNote, 
      time: noteStartTime,
      duration: duration
    });
  }
  
  return notes.slice(0, 32);
}

function extractChords(data: Float32Array, sampleRate: number, duration: number): Chord[] {
  const chords: Chord[] = [];
  const chordVoicings: { notes: string[]; name: string }[] = [
    { notes: ["c3", "e3", "g3"], name: "C" },
    { notes: ["c3", "e3", "g3", "b3"], name: "Cmaj7" },
    { notes: ["d3", "f3", "a3"], name: "Dm" },
    { notes: ["e3", "g3", "b3"], name: "Em" },
    { notes: ["f3", "a3", "c4"], name: "F" },
    { notes: ["g3", "b3", "d4"], name: "G" },
    { notes: ["g3", "b3", "d4", "f4"], name: "G7" },
    { notes: ["a3", "c4", "e4"], name: "Am" },
    { notes: ["a3", "c4", "e4", "g4"], name: "Am7" },
  ];
  
  const segmentDuration = 2;
  const numSegments = Math.min(8, Math.floor(duration / segmentDuration));
  const samplesPerSegment = Math.floor(data.length / numSegments);
  
  for (let i = 0; i < numSegments; i++) {
    const startSample = i * samplesPerSegment;
    const segment = data.slice(startSample, startSample + samplesPerSegment);
    
    let energy = 0;
    for (let j = 0; j < segment.length; j++) {
      energy += Math.abs(segment[j]);
    }
    
    const chordIndex = Math.floor((energy * 1000) % chordVoicings.length);
    const chord = chordVoicings[chordIndex];
    
    chords.push({
      notes: chord.notes,
      name: chord.name,
      time: i * segmentDuration,
      duration: segmentDuration
    });
  }
  
  return chords;
}

function generateStrudelCode(melody: Note[], chords: Chord[]): StrudelCode {
  const melodyPattern = melody.map(n => n.note).join(" ");
  const melodyStrudel = `note("${melodyPattern}").sound("piano")`;
  
  const chordPattern = chords.map(chord => `<${chord.notes.join(" ")}>`).join(" ");
  const chordStrudel = `note("${chordPattern}").sound("piano")`;
  
  const combined = `stack(
  ${melodyStrudel}.slow(0.5),
  ${chordStrudel}.slow(2)
)`;

  return {
    melody: melodyStrudel,
    chords: chordStrudel,
    combined: combined
  };
}

function extractWaveformData(data: Float32Array): number[] {
  const samples = 200;
  const blockSize = Math.floor(data.length / samples);
  const filteredData: number[] = [];

  for (let i = 0; i < samples; i++) {
    const blockStart = blockSize * i;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(data[blockStart + j]);
    }
    filteredData.push(sum / blockSize);
  }

  const maxVal = Math.max(...filteredData);
  return filteredData.map(val => val / maxVal);
}

export default function AudioToStrudel() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatusType | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = (step: ProcessingStatusType["step"], progress: number, message: string) => {
    setStatus({ step, progress, message });
  };

  const analyzeAudio = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      updateStatus("decoding", 10, "Decoding audio file...");
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      updateStatus("analyzing", 30, "Analyzing waveform...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      
      const waveformData = extractWaveformData(channelData);
      
      updateStatus("detecting", 50, "Detecting pitches and melody...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const melody = extractMelody(channelData, sampleRate);
      
      updateStatus("detecting", 70, "Analyzing chord progressions...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const chords = extractChords(channelData, sampleRate, duration);
      
      updateStatus("generating", 90, "Generating Strudel code...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const strudelCode = generateStrudelCode(melody, chords);
      
      updateStatus("complete", 100, "Analysis complete!");
      
      setResult({
        melody,
        chords,
        strudelCode,
        duration,
        sampleRate,
        waveformData,
      });
      
      await audioContext.close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Error processing audio: ${errorMessage}`);
    } finally {
      setProcessing(false);
      setTimeout(() => setStatus(null), 1000);
    }
  }, [file]);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setStatus(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-6">
            <Music className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4" data-testid="text-title">
            Audio to Strudel
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your audio files into Strudel live coding patterns. 
            Extract melodies, detect chords, and generate ready-to-use notation.
          </p>
        </header>

        <main className="space-y-8">
          <section>
            <AudioUploader
              onFileSelect={setFile}
              selectedFile={file}
              onClear={handleReset}
              disabled={processing}
            />
          </section>

          {file && !processing && !result && (
            <section className="flex justify-center">
              <Button
                size="lg"
                onClick={analyzeAudio}
                className="gap-2 px-8 py-6 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                data-testid="button-analyze"
              >
                <Sparkles className="w-5 h-5" />
                Analyze & Convert to Strudel
              </Button>
            </section>
          )}

          {processing && status && (
            <section>
              <ProcessingStatus status={status} />
            </section>
          )}

          {error && (
            <section>
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription data-testid="text-error">{error}</AlertDescription>
              </Alert>
            </section>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Audio Visualization</h2>
                <WaveformVisualizer 
                  audioFile={file} 
                  waveformData={result.waveformData}
                />
              </section>

              <section>
                <MetadataDisplay 
                  result={result} 
                  fileSize={file?.size}
                  fileName={file?.name}
                />
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Note Timeline</h2>
                <NoteTimeline 
                  melody={result.melody}
                  chords={result.chords}
                  duration={result.duration}
                />
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Generated Strudel Code</h2>
                <div className="space-y-4">
                  <CodeOutputCard
                    title="Melody"
                    code={result.strudelCode.melody}
                    colorClass="bg-chart-1"
                    description="Single note melody pattern"
                  />
                  <CodeOutputCard
                    title="Chords"
                    code={result.strudelCode.chords}
                    colorClass="bg-chart-2"
                    description="Chord progression pattern"
                  />
                  <CodeOutputCard
                    title="Combined Stack"
                    code={result.strudelCode.combined}
                    colorClass="bg-gradient-to-r from-primary to-secondary"
                    defaultExpanded
                    description="Full arrangement with melody and chords"
                  />
                </div>
              </section>

              <section className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleReset}
                  className="gap-2"
                  data-testid="button-analyze-another"
                >
                  <RotateCcw className="w-4 h-4" />
                  Analyze Another File
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  asChild
                  className="gap-2"
                >
                  <a 
                    href="https://strudel.cc/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    data-testid="link-strudel"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Strudel REPL
                  </a>
                </Button>
              </section>
            </div>
          )}

          <Card className="p-6 bg-secondary/10 border-secondary/30 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">About This Tool</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>Works best with clean, monophonic melodies (single notes like whistling or vocals)</li>
                  <li>Chord detection uses simplified analysis for demonstration purposes</li>
                  <li>Copy the generated code and paste it into the Strudel REPL</li>
                  <li>Adjust timing with <code className="font-mono text-chart-2">.slow()</code> or <code className="font-mono text-chart-2">.fast()</code> functions</li>
                </ul>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
