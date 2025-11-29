import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Music,
  Loader2,
  FileAudio
} from "lucide-react";
import { BatchUploader, type BatchFile } from "@/components/batch-uploader";
import { BatchResults, type BatchResult } from "@/components/batch-results";
import { AnalysisParameters, defaultAnalysisParams, type AnalysisParams } from "@/components/analysis-parameters";
import type { Note, Chord } from "@shared/schema";

function detectPitch(frame: Float32Array, sampleRate: number): number {
  const minFreq = 80;
  const maxFreq = 1000;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorrelation = 0;
  let bestPeriod = 0;

  for (let period = minPeriod; period < maxPeriod && period < frame.length / 2; period++) {
    let correlation = 0;
    for (let i = 0; i < frame.length - period; i++) {
      correlation += frame[i] * frame[i + period];
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod === 0) return 0;
  return sampleRate / bestPeriod;
}

function frequencyToNote(frequency: number): string {
  if (frequency <= 0) return "";
  
  const noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
  const a4 = 440;
  const halfStepsFromA4 = 12 * Math.log2(frequency / a4);
  const noteIndex = Math.round(halfStepsFromA4) + 57;
  
  if (noteIndex < 0 || noteIndex > 127) return "";
  
  const octave = Math.floor(noteIndex / 12);
  const noteNameIndex = noteIndex % 12;
  
  return `${noteNames[noteNameIndex]}${octave}`;
}

const KEY_PROFILES = {
  major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
};

function detectKey(notes: Note[]): string {
  const noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
  const chromaCounts = new Array(12).fill(0);
  
  for (const note of notes) {
    const noteMatch = note.note.match(/^([a-gs]+)(\d+)$/);
    if (noteMatch) {
      const noteIndex = noteNames.indexOf(noteMatch[1].toLowerCase());
      if (noteIndex >= 0) {
        chromaCounts[noteIndex] += (note.duration || 0.25) * (note.velocity || 0.8);
      }
    }
  }
  
  let bestKey = "C";
  let bestCorrelation = -Infinity;
  
  for (let i = 0; i < 12; i++) {
    const rotatedCounts = [...chromaCounts.slice(i), ...chromaCounts.slice(0, i)];
    
    let majorCorr = 0;
    let minorCorr = 0;
    
    for (let j = 0; j < 12; j++) {
      majorCorr += rotatedCounts[j] * KEY_PROFILES.major[j];
      minorCorr += rotatedCounts[j] * KEY_PROFILES.minor[j];
    }
    
    if (majorCorr > bestCorrelation) {
      bestCorrelation = majorCorr;
      bestKey = noteNames[i].toUpperCase().replace("S", "#");
    }
    if (minorCorr > bestCorrelation) {
      bestCorrelation = minorCorr;
      bestKey = noteNames[i].toUpperCase().replace("S", "#") + "m";
    }
  }
  
  return bestKey;
}

function detectTempo(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05);
  
  const energyValues: number[] = [];
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[i + j] * channelData[i + j];
    }
    energyValues.push(energy);
  }
  
  const onsets: number[] = [];
  for (let i = 1; i < energyValues.length; i++) {
    if (energyValues[i] > energyValues[i - 1] * 1.5 && energyValues[i] > 0.01) {
      onsets.push(i * windowSize / sampleRate);
    }
  }
  
  if (onsets.length < 2) return 120;
  
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  let tempo = 60 / avgInterval;
  
  while (tempo < 60) tempo *= 2;
  while (tempo > 200) tempo /= 2;
  
  return Math.round(tempo);
}

function generateChords(notes: Note[], key: string): Chord[] {
  if (notes.length < 4) return [];
  
  const chordIntervals: Record<string, number[]> = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
  };
  
  const noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
  const chordProgressions: Record<string, string[]> = {
    "C": ["C", "Am", "F", "G"],
    "G": ["G", "Em", "C", "D"],
    "D": ["D", "Bm", "G", "A"],
    "A": ["A", "F#m", "D", "E"],
    "E": ["E", "C#m", "A", "B"],
    "F": ["F", "Dm", "Bb", "C"],
    "Cm": ["Cm", "Ab", "Eb", "G"],
    "Am": ["Am", "F", "C", "G"],
    "Em": ["Em", "C", "G", "D"],
    "Dm": ["Dm", "Bb", "F", "C"],
  };
  
  const progression = chordProgressions[key] || chordProgressions["C"];
  const chords: Chord[] = [];
  const duration = notes[notes.length - 1].time + (notes[notes.length - 1].duration || 0.25);
  const chordDuration = duration / progression.length;
  
  for (let i = 0; i < progression.length; i++) {
    const chordName = progression[i];
    const isMinor = chordName.includes("m") && !chordName.includes("maj");
    const rootNote = chordName.replace(/m$/, "").replace("#", "s").toLowerCase();
    const rootIndex = noteNames.indexOf(rootNote);
    
    if (rootIndex >= 0) {
      const intervals = isMinor ? chordIntervals.min : chordIntervals.maj;
      const chordNotes = intervals.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return `${noteNames[noteIndex]}4`;
      });
      
      chords.push({
        notes: chordNotes,
        name: chordName,
        time: i * chordDuration,
        duration: chordDuration
      });
    }
  }
  
  return chords;
}

function formatNoteForStrudel(note: string): string {
  const match = note.match(/^([A-Ga-g])([#b]?)(\d+)$/);
  if (!match) return note.toLowerCase();
  const [, noteName, accidental, octave] = match;
  const strudelAccidental = accidental === '#' ? 's' : accidental === 'b' ? 'f' : '';
  return `${noteName.toLowerCase()}${strudelAccidental}${octave}`;
}

function generateStrudelCode(notes: Note[], chords: Chord[], tempo: number = 120, timeSignature: string = "4/4"): { melody: string; chords: string; combined: string } {
  const [beatsPerBar, noteValue] = timeSignature.split("/").map(Number);
  const beatDuration = (60 / tempo) * (4 / noteValue);
  
  // Generate melody with duration notation
  const melodyWithDuration = notes.map(note => {
    const formatted = formatNoteForStrudel(note.note);
    if (!note.duration) return formatted;
    
    const durationBeats = note.duration / beatDuration;
    if (Math.abs(durationBeats - 0.5) < 0.1) return `${formatted}*0.5`;
    if (Math.abs(durationBeats - 1) < 0.1) return formatted;
    if (Math.abs(durationBeats - 2) < 0.1) return `${formatted}*2`;
    if (Math.abs(durationBeats - 4) < 0.1) return `${formatted}*4`;
    
    return formatted;
  }).join(" ");
  
  const melodyCode = melodyWithDuration
    ? `note("${melodyWithDuration}").sound("piano")`
    : `note("~").sound("piano")`;
  
  // Generate chords with timing
  const chordWithDuration = chords.map(chord => {
    const chordNotes = chord.notes.map(n => formatNoteForStrudel(n)).join(",");
    const formatted = `[${chordNotes}]`;
    if (!chord.duration) return formatted;
    
    const durationBeats = chord.duration / beatDuration;
    if (Math.abs(durationBeats - 0.5) < 0.1) return `${formatted}*0.5`;
    if (Math.abs(durationBeats - 1) < 0.1) return formatted;
    if (Math.abs(durationBeats - 2) < 0.1) return `${formatted}*2`;
    if (Math.abs(durationBeats - 4) < 0.1) return `${formatted}*4`;
    
    return formatted;
  }).join(" ");
  
  const chordCode = chordWithDuration
    ? `note("${chordWithDuration}").sound("piano")`
    : `note("~").sound("piano")`;
  
  const combined = `// Tempo: ${tempo} BPM, Time Signature: ${timeSignature}\nstack(\n  ${melodyCode},\n  ${chordCode}\n).cpm(${Math.round(tempo / 4)})`;
  
  return {
    melody: melodyCode,
    chords: chordCode,
    combined
  };
}

interface BatchAnalysisResult {
  detectedNotes: number;
  chordChanges: number;
  detectedKey: string;
  estimatedTempo: number;
  duration: number;
  waveformData: number[];
}

async function analyzeAudioFile(
  file: File, 
  params: AnalysisParams,
  onProgress: (progress: number) => void
): Promise<{ 
  notes: Note[]; 
  chords: Chord[]; 
  result: BatchAnalysisResult;
  strudelCode: { melody: string; chords: string; combined: string };
}> {
  onProgress(10);
  
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  onProgress(30);
  
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const frameSize = 2048;
  const hopSize = 512;
  const notes: Note[] = [];
  
  const minAmplitude = (100 - params.pitchSensitivity) / 1000;
  const minNoteDurationSec = params.minNoteDuration / 1000;
  
  let lastNote = "";
  let noteStartTime = 0;
  
  const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);
  
  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    
    let rms = 0;
    for (let j = 0; j < frame.length; j++) {
      rms += frame[j] * frame[j];
    }
    rms = Math.sqrt(rms / frame.length);
    
    const currentFrame = Math.floor(i / hopSize);
    onProgress(30 + Math.floor((currentFrame / totalFrames) * 40));
    
    if (rms < minAmplitude) {
      if (lastNote) {
        const duration = (i / sampleRate) - noteStartTime;
        if (duration >= minNoteDurationSec) {
          notes.push({
            note: lastNote,
            time: noteStartTime,
            duration: duration,
            velocity: Math.min(1, rms * 10)
          });
        }
        lastNote = "";
      }
      continue;
    }
    
    const frequency = detectPitch(frame, sampleRate);
    if (frequency < 80 || frequency > 2000) {
      continue;
    }
    
    const note = frequencyToNote(frequency);
    
    if (note !== lastNote) {
      if (lastNote) {
        const duration = (i / sampleRate) - noteStartTime;
        if (duration >= minNoteDurationSec) {
          notes.push({
            note: lastNote,
            time: noteStartTime,
            duration: duration,
            velocity: Math.min(1, rms * 10)
          });
        }
      }
      lastNote = note;
      noteStartTime = i / sampleRate;
    }
  }
  
  if (lastNote) {
    const duration = audioBuffer.duration - noteStartTime;
    if (duration >= minNoteDurationSec) {
      notes.push({
        note: lastNote,
        time: noteStartTime,
        duration: duration,
        velocity: 0.8
      });
    }
  }
  
  onProgress(75);
  
  const detectedKey = params.autoDetectKey ? detectKey(notes) : params.targetKey;
  const estimatedTempo = params.autoDetectTempo ? detectTempo(audioBuffer) : params.targetTempo;
  
  onProgress(85);
  
  const chords = generateChords(notes, detectedKey);
  
  onProgress(95);
  
  const strudelCode = generateStrudelCode(notes, chords);
  
  const waveformData: number[] = [];
  const waveformSamples = 200;
  const samplesPerPoint = Math.floor(channelData.length / waveformSamples);
  
  for (let i = 0; i < waveformSamples; i++) {
    let sum = 0;
    for (let j = 0; j < samplesPerPoint; j++) {
      const index = i * samplesPerPoint + j;
      if (index < channelData.length) {
        sum += Math.abs(channelData[index]);
      }
    }
    waveformData.push(sum / samplesPerPoint);
  }
  
  await audioContext.close();
  
  onProgress(100);
  
  return {
    notes,
    chords,
    result: {
      detectedNotes: notes.length,
      chordChanges: chords.length,
      detectedKey,
      estimatedTempo,
      duration: audioBuffer.duration,
      waveformData
    },
    strudelCode
  };
}

export default function BatchProcessing() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [params, setParams] = useState<AnalysisParams>(defaultAnalysisParams);
  const processingRef = useRef<boolean>(false);
  
  const handleFilesSelect = useCallback((newFiles: File[]) => {
    const batchFiles: BatchFile[] = newFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      file,
      status: "pending" as const,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...batchFiles]);
  }, []);
  
  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);
  
  const handleClearAll = useCallback(() => {
    setFiles([]);
    setResults([]);
  }, []);
  
  const processFiles = useCallback(async () => {
    if (isProcessing) return;
    
    const pendingFiles = files.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) return;
    
    setIsProcessing(true);
    processingRef.current = true;
    
    for (const batchFile of pendingFiles) {
      if (!processingRef.current) break;
      
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, status: "processing" as const, progress: 0 }
          : f
      ));
      
      try {
        const { notes, chords, result, strudelCode } = await analyzeAudioFile(
          batchFile.file,
          params,
          (progress) => {
            setFiles(prev => prev.map(f =>
              f.id === batchFile.id
                ? { ...f, progress }
                : f
            ));
          }
        );
        
        setFiles(prev => prev.map(f =>
          f.id === batchFile.id
            ? { ...f, status: "completed" as const, progress: 100 }
            : f
        ));
        
        setResults(prev => [...prev, {
          id: batchFile.id,
          fileName: batchFile.file.name,
          result,
          notes,
          chords,
          strudelCode
        }]);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        setFiles(prev => prev.map(f =>
          f.id === batchFile.id
            ? { ...f, status: "error" as const, error: errorMessage }
            : f
        ));
        
        setResults(prev => [...prev, {
          id: batchFile.id,
          fileName: batchFile.file.name,
          error: errorMessage
        }]);
      }
    }
    
    setIsProcessing(false);
    processingRef.current = false;
  }, [files, isProcessing, params]);
  
  const stopProcessing = useCallback(() => {
    processingRef.current = false;
  }, []);
  
  const resetAll = useCallback(() => {
    stopProcessing();
    setFiles([]);
    setResults([]);
    setIsProcessing(false);
  }, [stopProcessing]);
  
  const pendingCount = files.filter(f => f.status === "pending").length;
  const completedCount = files.filter(f => f.status === "completed").length;
  const processingFile = files.find(f => f.status === "processing");
  const overallProgress = files.length > 0 
    ? Math.round((completedCount / files.length) * 100)
    : 0;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Music className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Batch Processing</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
            Process multiple audio files at once to extract Strudel patterns
          </p>
          <Link href="/" asChild>
            <Button variant="outline" className="gap-2" data-testid="link-single-file">
              <FileAudio className="w-4 h-4" />
              Single File Mode
            </Button>
          </Link>
        </header>
        
        <section className="space-y-6 mb-8">
          <AnalysisParameters
            params={params}
            onChange={setParams}
            disabled={isProcessing}
          />
          
          <BatchUploader
            files={files}
            onFilesSelect={handleFilesSelect}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAll}
            disabled={isProcessing}
            maxFiles={10}
          />
          
          {files.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  {isProcessing && processingFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-foreground truncate">
                          Processing: {processingFile.file.name}
                        </span>
                      </div>
                      <Progress value={processingFile.progress} className="h-2" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-sm text-foreground">
                        {pendingCount > 0 
                          ? `${pendingCount} file${pendingCount !== 1 ? "s" : ""} ready to process`
                          : `${completedCount} file${completedCount !== 1 ? "s" : ""} processed`
                        }
                      </span>
                      {completedCount > 0 && (
                        <Progress value={overallProgress} className="h-2" />
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isProcessing ? (
                    <Button
                      variant="outline"
                      onClick={stopProcessing}
                      className="gap-2"
                      data-testid="button-stop-batch"
                    >
                      <Pause className="w-4 h-4" />
                      Stop
                    </Button>
                  ) : (
                    <>
                      {completedCount > 0 && (
                        <Button
                          variant="outline"
                          onClick={resetAll}
                          className="gap-2"
                          data-testid="button-reset-batch"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </Button>
                      )}
                      <Button
                        onClick={processFiles}
                        disabled={pendingCount === 0}
                        className="gap-2"
                        data-testid="button-start-batch"
                      >
                        <Play className="w-4 h-4" />
                        Process {pendingCount > 0 ? `(${pendingCount})` : ""}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
        </section>
        
        <BatchResults
          results={results}
          files={files}
          onExportAll={() => {}}
        />
      </div>
    </div>
  );
}
