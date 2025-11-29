import type { Note, Chord } from "@shared/schema";

const NOTE_MAP: Record<string, number> = {
  c: 0, cs: 1, d: 2, ds: 3, e: 4, f: 5,
  fs: 6, g: 7, gs: 8, a: 9, as: 10, b: 11
};

function parseNote(note: string): { noteName: string; octave: number } | null {
  const match = note.match(/^([a-g]s?)(\d+)$/i);
  if (!match) return null;
  return {
    noteName: match[1].toLowerCase(),
    octave: parseInt(match[2], 10)
  };
}

function noteToMidi(note: string): number {
  const parsed = parseNote(note);
  if (!parsed) return 60;
  const { noteName, octave } = parsed;
  const noteNum = NOTE_MAP[noteName] ?? 0;
  return noteNum + (octave + 1) * 12;
}

function writeVariableLengthQuantity(value: number): number[] {
  const bytes: number[] = [];
  let v = value;
  
  bytes.push(v & 0x7F);
  v >>= 7;
  
  while (v > 0) {
    bytes.push((v & 0x7F) | 0x80);
    v >>= 7;
  }
  
  return bytes.reverse();
}

function writeInt16BE(value: number): number[] {
  return [(value >> 8) & 0xFF, value & 0xFF];
}

function writeInt32BE(value: number): number[] {
  return [
    (value >> 24) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 8) & 0xFF,
    value & 0xFF
  ];
}

function createMidiTrack(events: { delta: number; data: number[] }[]): number[] {
  const trackData: number[] = [];
  
  for (const event of events) {
    trackData.push(...writeVariableLengthQuantity(event.delta));
    trackData.push(...event.data);
  }
  
  trackData.push(...writeVariableLengthQuantity(0));
  trackData.push(0xFF, 0x2F, 0x00);
  
  const trackChunk = [
    0x4D, 0x54, 0x72, 0x6B,
    ...writeInt32BE(trackData.length)
  ];
  
  return [...trackChunk, ...trackData];
}

interface MidiExportOptions {
  tempo: number;
  ppq?: number;
  includeChords?: boolean;
  includeMelody?: boolean;
}

interface AbsoluteEvent {
  absoluteTick: number;
  data: number[];
}

export function exportMelodyToMidi(
  melody: Note[],
  chords: Chord[],
  options: MidiExportOptions
): Uint8Array {
  const { tempo, ppq = 480, includeChords = true, includeMelody = true } = options;
  
  const ticksPerBeat = ppq;
  const microsecondsPerBeat = Math.round(60000000 / tempo);
  
  const headerChunk = [
    0x4D, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x01,
    ...writeInt16BE(2),
    ...writeInt16BE(ticksPerBeat)
  ];
  
  const tempoTrackEvents: { delta: number; data: number[] }[] = [
    {
      delta: 0,
      data: [
        0xFF, 0x51, 0x03,
        (microsecondsPerBeat >> 16) & 0xFF,
        (microsecondsPerBeat >> 8) & 0xFF,
        microsecondsPerBeat & 0xFF
      ]
    },
    {
      delta: 0,
      data: [0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]
    },
    {
      delta: 0,
      data: [0xFF, 0x03, 0x0B, ...Array.from("Audio Track").map(c => c.charCodeAt(0))]
    }
  ];
  
  const tempoTrack = createMidiTrack(tempoTrackEvents);
  
  const absoluteEvents: AbsoluteEvent[] = [];
  
  const timeToTicks = (time: number): number => {
    return Math.round(time * tempo / 60 * ticksPerBeat);
  };
  
  if (includeMelody && melody.length > 0) {
    for (const note of melody) {
      const midiNote = noteToMidi(note.note);
      const velocity = Math.round((note.velocity || 0.8) * 127);
      const startTick = timeToTicks(note.time);
      const durationTicks = Math.max(1, timeToTicks(note.duration || 0.25));
      
      absoluteEvents.push({
        absoluteTick: startTick,
        data: [0x90, midiNote, velocity]
      });
      
      absoluteEvents.push({
        absoluteTick: startTick + durationTicks,
        data: [0x80, midiNote, 0]
      });
    }
  }
  
  if (includeChords && chords.length > 0) {
    for (const chord of chords) {
      const startTick = timeToTicks(chord.time);
      const durationTicks = Math.max(1, timeToTicks(chord.duration || 1));
      
      for (const noteStr of chord.notes) {
        const midiNote = noteToMidi(noteStr);
        const velocity = 80;
        
        absoluteEvents.push({
          absoluteTick: startTick,
          data: [0x91, midiNote, velocity]
        });
        
        absoluteEvents.push({
          absoluteTick: startTick + durationTicks,
          data: [0x81, midiNote, 0]
        });
      }
    }
  }
  
  absoluteEvents.sort((a, b) => {
    if (a.absoluteTick !== b.absoluteTick) {
      return a.absoluteTick - b.absoluteTick;
    }
    const aIsNoteOff = (a.data[0] & 0xF0) === 0x80;
    const bIsNoteOff = (b.data[0] & 0xF0) === 0x80;
    if (aIsNoteOff !== bIsNoteOff) {
      return aIsNoteOff ? -1 : 1;
    }
    return 0;
  });
  
  const deltaEvents: { delta: number; data: number[] }[] = [];
  let lastTick = 0;
  
  for (const event of absoluteEvents) {
    const delta = event.absoluteTick - lastTick;
    deltaEvents.push({
      delta: Math.max(0, delta),
      data: event.data
    });
    lastTick = event.absoluteTick;
  }
  
  const noteTrack = createMidiTrack(deltaEvents);
  
  const midiData = [...headerChunk, ...tempoTrack, ...noteTrack];
  return new Uint8Array(midiData);
}

export function downloadMidiFile(
  melody: Note[],
  chords: Chord[],
  options: MidiExportOptions,
  filename: string = "audio-extract.mid"
): void {
  const midiData = exportMelodyToMidi(melody, chords, options);
  const blob = new Blob([midiData], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
