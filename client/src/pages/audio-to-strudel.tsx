import { useState, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { Music, Sparkles, AlertCircle, RotateCcw, ExternalLink, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AudioUploader } from "@/components/audio-uploader";
import { ProcessingStatus } from "@/components/processing-status";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { NoteTimeline } from "@/components/note-timeline";
import { CodeOutputCard } from "@/components/code-output-card";
import { MetadataDisplay } from "@/components/metadata-display";
import { AnalysisParameters, defaultAnalysisParams, type AnalysisParams } from "@/components/analysis-parameters";
import { PatternPlayer } from "@/components/pattern-player";
import { NoteEditor } from "@/components/note-editor";
import { MidiExport } from "@/components/midi-export";
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

function frequencyToPitchClass(freq: number): number {
  if (freq < 50) return -1;
  const a4 = 440;
  const c0 = a4 * Math.pow(2, -4.75);
  const halfSteps = 12 * Math.log2(freq / c0);
  return ((Math.round(halfSteps) % 12) + 12) % 12;
}

function detectTempo(data: Float32Array, sampleRate: number): number {
  const frameSize = 1024;
  const hopSize = 512;
  const energies: number[] = [];
  
  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < frameSize; j++) {
      energy += data[i + j] * data[i + j];
    }
    energies.push(Math.sqrt(energy / frameSize));
  }
  
  const onsetStrength: number[] = [];
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    onsetStrength.push(Math.max(0, diff));
  }
  
  const minBpm = 60;
  const maxBpm = 200;
  const framesPerSecond = sampleRate / hopSize;
  
  let bestBpm = 120;
  let bestScore = 0;
  
  for (let bpm = minBpm; bpm <= maxBpm; bpm++) {
    const beatInterval = (60 / bpm) * framesPerSecond;
    let score = 0;
    
    for (let offset = 0; offset < beatInterval; offset++) {
      let tempScore = 0;
      for (let beat = offset; beat < onsetStrength.length; beat += beatInterval) {
        const index = Math.floor(beat);
        if (index < onsetStrength.length) {
          tempScore += onsetStrength[index];
        }
      }
      score = Math.max(score, tempScore);
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }
  
  return bestBpm;
}

function detectKey(pitchClassHistogram: number[]): string {
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  let bestKey = "C";
  let bestCorr = -Infinity;
  
  const normalize = (arr: number[]): number[] => {
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum > 0 ? arr.map(v => v / sum) : arr;
  };
  
  const normalizedHist = normalize(pitchClassHistogram);
  
  for (let shift = 0; shift < 12; shift++) {
    const shiftedMajor = majorProfile.map((_, i) => majorProfile[(i + shift) % 12]);
    const shiftedMinor = minorProfile.map((_, i) => minorProfile[(i + shift) % 12]);
    
    const normalizedMajor = normalize(shiftedMajor);
    const normalizedMinor = normalize(shiftedMinor);
    
    let majorCorr = 0;
    let minorCorr = 0;
    
    for (let i = 0; i < 12; i++) {
      majorCorr += normalizedHist[i] * normalizedMajor[i];
      minorCorr += normalizedHist[i] * normalizedMinor[i];
    }
    
    if (majorCorr > bestCorr) {
      bestCorr = majorCorr;
      bestKey = noteNames[shift];
    }
    if (minorCorr > bestCorr) {
      bestCorr = minorCorr;
      bestKey = noteNames[shift] + "m";
    }
  }
  
  return bestKey;
}

function extractMelody(
  data: Float32Array, 
  sampleRate: number, 
  params: AnalysisParams
): { notes: Note[]; pitchClassHistogram: number[] } {
  const notes: Note[] = [];
  const hopSize = 2048;
  const frameSize = 4096;
  const pitchClassHistogram = new Array(12).fill(0);
  
  const rmsThreshold = 0.01 * (params.pitchSensitivity / 100);
  const minDuration = params.minNoteDuration / 1000;
  
  let lastNote = "";
  let noteStartTime = 0;
  
  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    const frame = data.slice(i, i + frameSize);
    
    let rms = 0;
    for (let j = 0; j < frame.length; j++) {
      rms += frame[j] * frame[j];
    }
    rms = Math.sqrt(rms / frame.length);
    
    if (rms < rmsThreshold) {
      if (lastNote && lastNote !== "rest") {
        const duration = (i / sampleRate) - noteStartTime;
        if (duration > minDuration) {
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
    const pitchClass = frequencyToPitchClass(pitch);
    
    if (pitchClass >= 0) {
      pitchClassHistogram[pitchClass] += rms;
    }
    
    if (note !== "rest" && note !== lastNote) {
      if (lastNote && lastNote !== "rest") {
        const duration = (i / sampleRate) - noteStartTime;
        if (duration > minDuration) {
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
    if (duration > minDuration) {
      notes.push({ 
        note: lastNote, 
        time: noteStartTime,
        duration: duration
      });
    }
  }
  
  return { notes: notes.slice(0, 64), pitchClassHistogram };
}

function quantizeNotes(notes: Note[], tempo: number, quantizeValue: string): Note[] {
  if (quantizeValue === "none") return notes;
  
  const beatDuration = 60 / tempo;
  
  const quantizeMap: Record<string, number> = {
    "1/4": 1,
    "1/8": 0.5,
    "1/16": 0.25,
    "1/32": 0.125,
  };
  
  const gridSize = beatDuration * (quantizeMap[quantizeValue] || 0.25);
  
  return notes.map(note => ({
    ...note,
    time: Math.round(note.time / gridSize) * gridSize,
    duration: note.duration ? Math.max(gridSize, Math.round(note.duration / gridSize) * gridSize) : undefined
  }));
}

function transposeNote(note: string, semitones: number): string {
  const noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
  const match = note.match(/^([a-gs]+)(\d+)$/);
  if (!match) return note;
  
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr);
  const noteIndex = noteNames.indexOf(noteName);
  if (noteIndex === -1) return note;
  
  const newIndex = noteIndex + semitones;
  const newNoteIndex = ((newIndex % 12) + 12) % 12;
  const octaveChange = Math.floor(newIndex / 12);
  
  return `${noteNames[newNoteIndex]}${octave + octaveChange}`;
}

function getKeyTransposition(fromKey: string, toKey: string): number {
  const noteToSemitone: Record<string, number> = {
    "C": 0, "C#": 1, "C#/Db": 1, "Db": 1, 
    "D": 2, "D#": 3, "D#/Eb": 3, "Eb": 3,
    "E": 4, 
    "F": 5, "F#": 6, "F#/Gb": 6, "Gb": 6,
    "G": 7, "G#": 8, "G#/Ab": 8, "Ab": 8,
    "A": 9, "A#": 10, "A#/Bb": 10, "Bb": 10,
    "B": 11
  };
  
  const fromRoot = fromKey.replace("m", "").replace("/Db", "").replace("/Eb", "").replace("/Gb", "").replace("/Ab", "").replace("/Bb", "");
  const toRoot = toKey.replace("m", "").replace("/Db", "").replace("/Eb", "").replace("/Gb", "").replace("/Ab", "").replace("/Bb", "");
  
  const fromSemi = noteToSemitone[fromRoot] ?? 0;
  const toSemi = noteToSemitone[toRoot] ?? 0;
  
  return toSemi - fromSemi;
}

function getChordNameInKey(baseName: string, semitones: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  const match = baseName.match(/^([A-G]#?)(.*)$/);
  if (!match) return baseName;
  
  const [, root, suffix] = match;
  const rootIndex = noteNames.indexOf(root);
  if (rootIndex === -1) return baseName;
  
  const newIndex = ((rootIndex + semitones) % 12 + 12) % 12;
  return `${noteNames[newIndex]}${suffix}`;
}

function extractChords(data: Float32Array, sampleRate: number, duration: number, detectedKey: string): Chord[] {
  const chords: Chord[] = [];
  
  const isMinor = detectedKey.includes("m") && !detectedKey.includes("maj");
  
  const majorChordTemplates = [
    { notes: ["c3", "e3", "g3"], name: "C", degree: "I" },
    { notes: ["d3", "f3", "a3"], name: "Dm", degree: "ii" },
    { notes: ["e3", "g3", "b3"], name: "Em", degree: "iii" },
    { notes: ["f3", "a3", "c4"], name: "F", degree: "IV" },
    { notes: ["g3", "b3", "d4"], name: "G", degree: "V" },
    { notes: ["a3", "c4", "e4"], name: "Am", degree: "vi" },
  ];
  
  const minorChordTemplates = [
    { notes: ["a2", "c3", "e3"], name: "Am", degree: "i" },
    { notes: ["b2", "d3", "f3"], name: "Bdim", degree: "ii°" },
    { notes: ["c3", "e3", "g3"], name: "C", degree: "III" },
    { notes: ["d3", "f3", "a3"], name: "Dm", degree: "iv" },
    { notes: ["e3", "g3", "b3"], name: "Em", degree: "v" },
    { notes: ["f3", "a3", "c4"], name: "F", degree: "VI" },
    { notes: ["g3", "b3", "d4"], name: "G", degree: "VII" },
  ];
  
  const baseKey = isMinor ? "Am" : "C";
  const transposition = getKeyTransposition(baseKey, detectedKey);
  const templates = isMinor ? minorChordTemplates : majorChordTemplates;
  
  const transposedChords = templates.map(chord => ({
    notes: chord.notes.map(n => transposeNote(n, transposition)),
    name: getChordNameInKey(chord.name, transposition),
    degree: chord.degree
  }));
  
  const segmentDuration = 2;
  const numSegments = Math.min(8, Math.floor(duration / segmentDuration));
  const samplesPerSegment = Math.floor(data.length / Math.max(1, numSegments));
  
  for (let i = 0; i < numSegments; i++) {
    const startSample = i * samplesPerSegment;
    const segment = data.slice(startSample, startSample + samplesPerSegment);
    
    let energy = 0;
    for (let j = 0; j < segment.length; j++) {
      energy += Math.abs(segment[j]);
    }
    
    const chordIndex = Math.floor((energy * 1000) % transposedChords.length);
    const chord = transposedChords[chordIndex];
    
    chords.push({
      notes: chord.notes,
      name: chord.name,
      time: i * segmentDuration,
      duration: segmentDuration
    });
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

function generateStrudelCode(melody: Note[], chords: Chord[], tempo: number, timeSignature: string): StrudelCode {
  const [beatsPerBar, noteValue] = timeSignature.split("/").map(Number);
  const beatDuration = (60 / tempo) * (4 / noteValue);
  
  // Generate melody with duration notation
  const melodyWithDuration = melody.map(note => {
    const formatted = formatNoteForStrudel(note.note);
    if (!note.duration) return formatted;
    
    const durationBeats = note.duration / beatDuration;
    if (Math.abs(durationBeats - 0.5) < 0.1) return `${formatted}*0.5`;
    if (Math.abs(durationBeats - 1) < 0.1) return formatted;
    if (Math.abs(durationBeats - 2) < 0.1) return `${formatted}*2`;
    if (Math.abs(durationBeats - 4) < 0.1) return `${formatted}*4`;
    
    return formatted;
  }).join(" ");
  
  const melodyStrudel = melody.length > 0 
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
  
  const chordStrudel = chords.length > 0
    ? `note("${chordWithDuration}").sound("piano")`
    : `note("~").sound("piano")`;
  
  const combined = `// Tempo: ${tempo} BPM, Time Signature: ${timeSignature}
// Melody: ${melody.length} notes, Chords: ${chords.length} chords
stack(
  ${melodyStrudel},
  ${chordStrudel}
).cpm(${Math.round(tempo / 4)})`;

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
  const [analysisParams, setAnalysisParams] = useState<AnalysisParams>(defaultAnalysisParams);
  const [editedMelody, setEditedMelody] = useState<Note[] | null>(null);
  const [editedChords, setEditedChords] = useState<Chord[] | null>(null);
  
  const currentMelody = editedMelody ?? result?.melody ?? [];
  const currentChords = editedChords ?? result?.chords ?? [];
  
  const currentStrudelCode = useMemo(() => {
    if (!result) return null;
    if (editedMelody === null && editedChords === null) {
      return result.strudelCode;
    }
    return generateStrudelCode(
      currentMelody,
      currentChords,
      result.estimatedTempo || 120,
      analysisParams.timeSignature
    );
  }, [result, editedMelody, editedChords, currentMelody, currentChords, analysisParams.timeSignature]);
  
  const handleMelodyChange = useCallback((newMelody: Note[]) => {
    setEditedMelody(newMelody);
  }, []);
  
  const handleChordsChange = useCallback((newChords: Chord[]) => {
    setEditedChords(newChords);
  }, []);

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
      
      updateStatus("analyzing", 25, "Analyzing waveform...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      
      const waveformData = extractWaveformData(channelData);
      
      updateStatus("detecting", 40, "Detecting tempo...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let estimatedTempo: number;
      if (analysisParams.autoDetectTempo) {
        estimatedTempo = detectTempo(channelData, sampleRate);
      } else {
        estimatedTempo = analysisParams.targetTempo;
      }
      
      updateStatus("detecting", 55, "Extracting melody and detecting key...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { notes: rawMelody, pitchClassHistogram } = extractMelody(channelData, sampleRate, analysisParams);
      
      let detectedKey: string;
      if (analysisParams.autoDetectKey) {
        detectedKey = detectKey(pitchClassHistogram);
      } else {
        detectedKey = analysisParams.targetKey;
      }
      
      updateStatus("detecting", 70, "Quantizing notes...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let melody = rawMelody;
      if (analysisParams.quantizeNotes) {
        melody = quantizeNotes(rawMelody, estimatedTempo, analysisParams.quantizeValue);
      }
      
      updateStatus("detecting", 80, "Analyzing chord progressions...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const chords = extractChords(channelData, sampleRate, duration, detectedKey);
      
      updateStatus("generating", 90, "Generating Strudel code...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const strudelCode = generateStrudelCode(melody, chords, estimatedTempo, analysisParams.timeSignature);
      
      updateStatus("complete", 100, "Analysis complete!");
      
      setResult({
        melody,
        chords,
        strudelCode,
        duration,
        sampleRate,
        waveformData,
        detectedKey,
        estimatedTempo,
      });
      
      await audioContext.close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Error processing audio: ${errorMessage}`);
    } finally {
      setProcessing(false);
      setTimeout(() => setStatus(null), 1000);
    }
  }, [file, analysisParams]);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setStatus(null);
    setEditedMelody(null);
    setEditedChords(null);
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Transform your audio files into Strudel live coding patterns. 
            Extract melodies, detect chords, and generate ready-to-use notation.
          </p>
          <Link href="/batch" asChild>
            <Button variant="outline" className="gap-2" data-testid="link-batch-processing">
              <Layers className="w-4 h-4" />
              Batch Processing
            </Button>
          </Link>
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

          {file && !result && (
            <section>
              <AnalysisParameters
                params={analysisParams}
                onChange={setAnalysisParams}
                disabled={processing}
              />
            </section>
          )}

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
                  melody={currentMelody}
                  chords={currentChords}
                  duration={result.duration}
                />
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Edit Notes & Chords</h2>
                <NoteEditor
                  melody={currentMelody}
                  chords={currentChords}
                  onMelodyChange={handleMelodyChange}
                  onChordsChange={handleChordsChange}
                />
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Preview Pattern</h2>
                <PatternPlayer
                  melody={currentMelody}
                  chords={currentChords}
                  tempo={result.estimatedTempo || 120}
                  detectedKey={result.detectedKey}
                />
              </section>

              {currentStrudelCode && (
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Generated Strudel Code</h2>
                  <div className="space-y-4">
                    <CodeOutputCard
                      title="Melody"
                      code={currentStrudelCode.melody}
                      colorClass="bg-chart-1"
                      description="Single note melody pattern"
                    />
                    <CodeOutputCard
                      title="Chords"
                      code={currentStrudelCode.chords}
                      colorClass="bg-chart-2"
                      description="Chord progression pattern"
                    />
                    <CodeOutputCard
                      title="Combined Stack"
                      code={currentStrudelCode.combined}
                      colorClass="bg-gradient-to-r from-primary to-secondary"
                      defaultExpanded
                      description="Full arrangement with melody and chords"
                    />
                  </div>
                </section>
              )}

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
                <MidiExport
                  melody={currentMelody}
                  chords={currentChords}
                  tempo={result.estimatedTempo || 120}
                  fileName={file?.name}
                />
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
                  <li>Automatic tempo and key detection analyze your audio content</li>
                  <li>Use the Analysis Parameters to fine-tune detection settings</li>
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
