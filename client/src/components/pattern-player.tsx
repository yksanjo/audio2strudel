import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, Square, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Note, Chord } from "@shared/schema";

interface PatternPlayerProps {
  melody: Note[];
  chords: Chord[];
  tempo: number;
  detectedKey?: string;
}

type PlayMode = "melody" | "chords" | "combined";

const NOTE_FREQUENCIES: Record<string, number> = {};

function initNoteFrequencies() {
  const noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
  const a4 = 440;
  
  for (let octave = 0; octave <= 8; octave++) {
    for (let i = 0; i < noteNames.length; i++) {
      const noteName = `${noteNames[i]}${octave}`;
      const semitonesFromA4 = (octave - 4) * 12 + i - 9;
      NOTE_FREQUENCIES[noteName] = a4 * Math.pow(2, semitonesFromA4 / 12);
    }
  }
}

initNoteFrequencies();

function getFrequency(note: string): number {
  const normalizedNote = note.toLowerCase().replace("#", "s");
  return NOTE_FREQUENCIES[normalizedNote] || 440;
}

export function PatternPlayer({ melody, chords, tempo, detectedKey }: PatternPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("combined");
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const scheduledNodesRef = useRef<OscillatorNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current;
  }, [volume, isMuted]);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : newVolume;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newMuted ? 0 : volume;
      }
      return newMuted;
    });
  }, [volume]);

  const stopPlayback = useCallback(() => {
    scheduledNodesRef.current.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
      }
    });
    scheduledNodesRef.current = [];
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsPlaying(false);
    setProgress(0);
    setCurrentNote(null);
  }, []);

  const playNote = useCallback((
    ctx: AudioContext, 
    frequency: number, 
    startTime: number, 
    duration: number,
    type: OscillatorType = "sine"
  ) => {
    const oscillator = ctx.createOscillator();
    const noteGain = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    oscillator.connect(noteGain);
    noteGain.connect(gainNodeRef.current!);
    
    const attackTime = 0.02;
    const releaseTime = Math.min(0.1, duration * 0.3);
    
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.3, startTime + attackTime);
    noteGain.gain.setValueAtTime(0.3, startTime + duration - releaseTime);
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    scheduledNodesRef.current.push(oscillator);
    
    return oscillator;
  }, []);

  const schedulePattern = useCallback((mode: PlayMode) => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    stopPlayback();
    
    const beatDuration = 60 / tempo;
    const now = ctx.currentTime + 0.1;
    startTimeRef.current = now;
    
    let totalDuration = 0;
    
    if (mode === "melody" || mode === "combined") {
      melody.forEach((note, index) => {
        if (note.note === "rest") return;
        
        const freq = getFrequency(note.note);
        const noteDuration = note.duration || beatDuration;
        const startTime = now + (note.time || index * beatDuration);
        
        playNote(ctx, freq, startTime, Math.min(noteDuration, 2), "triangle");
        
        totalDuration = Math.max(totalDuration, startTime - now + noteDuration);
      });
    }
    
    if (mode === "chords" || mode === "combined") {
      chords.forEach((chord) => {
        const chordDuration = chord.duration || beatDuration * 4;
        const startTime = now + (chord.time || 0);
        
        chord.notes.forEach((noteStr) => {
          const freq = getFrequency(noteStr);
          playNote(ctx, freq, startTime, Math.min(chordDuration, 4), "sine");
        });
        
        totalDuration = Math.max(totalDuration, startTime - now + chordDuration);
      });
    }
    
    durationRef.current = totalDuration;
    setIsPlaying(true);
    
    const updateProgress = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      const progressPercent = Math.min((elapsed / durationRef.current) * 100, 100);
      setProgress(progressPercent);
      
      const currentMelodyNote = melody.find((note, idx) => {
        const noteTime = note.time || idx * beatDuration;
        const noteDur = note.duration || beatDuration;
        return elapsed >= noteTime && elapsed < noteTime + noteDur;
      });
      
      if (currentMelodyNote) {
        setCurrentNote(currentMelodyNote.note);
      }
      
      if (elapsed < durationRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        setIsPlaying(false);
        setProgress(100);
        setCurrentNote(null);
        setTimeout(() => setProgress(0), 500);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [getAudioContext, stopPlayback, playNote, melody, chords, tempo]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      schedulePattern(playMode);
    }
  }, [isPlaying, stopPlayback, schedulePattern, playMode]);

  const handleRestart = useCallback(() => {
    stopPlayback();
    schedulePattern(playMode);
  }, [stopPlayback, schedulePattern, playMode]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
      schedulePattern(playMode);
    }
  }, [playMode]);

  const getModeDescription = (mode: PlayMode): string => {
    switch (mode) {
      case "melody": return `${melody.length} notes`;
      case "chords": return `${chords.length} chords`;
      case "combined": return "Full arrangement";
    }
  };

  return (
    <Card className="p-4 border border-border/50" data-testid="pattern-player">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Pattern Preview</h3>
            {detectedKey && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-detected-key">
                {detectedKey}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-mono" data-testid="badge-tempo">
              {tempo} BPM
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              data-testid="button-mute"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([v]) => updateVolume(v / 100)}
                max={100}
                step={1}
                disabled={isMuted}
                data-testid="slider-volume"
              />
            </div>
          </div>
        </div>

        <Tabs value={playMode} onValueChange={(v) => setPlayMode(v as PlayMode)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="melody" data-testid="tab-melody">
              Melody
            </TabsTrigger>
            <TabsTrigger value="chords" data-testid="tab-chords">
              Chords
            </TabsTrigger>
            <TabsTrigger value="combined" data-testid="tab-combined">
              Combined
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={playMode} className="mt-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span data-testid="text-mode-description">{getModeDescription(playMode)}</span>
              {currentNote && isPlaying && (
                <Badge variant="secondary" className="font-mono animate-pulse" data-testid="badge-current-note">
                  {currentNote.toUpperCase()}
                </Badge>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" data-testid="progress-playback" />
          
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRestart}
              disabled={!isPlaying && progress === 0}
              data-testid="button-restart"
              aria-label="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <Button
              size="lg"
              onClick={handlePlayPause}
              className="gap-2 min-w-32"
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Play
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={stopPlayback}
              disabled={!isPlaying && progress === 0}
              data-testid="button-stop"
              aria-label="Stop"
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Uses Web Audio synthesis to preview patterns. 
          For authentic sounds, paste code into Strudel REPL.
        </p>
      </div>
    </Card>
  );
}
