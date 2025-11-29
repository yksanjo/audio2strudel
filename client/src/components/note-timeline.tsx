import { Card } from "@/components/ui/card";
import type { Note, Chord } from "@shared/schema";

interface NoteTimelineProps {
  melody: Note[];
  chords: Chord[];
  duration: number;
}

const noteToMidi = (note: string): number => {
  const noteNames: Record<string, number> = {
    c: 0, cs: 1, d: 2, ds: 3, e: 4, f: 5,
    fs: 6, g: 7, gs: 8, a: 9, as: 10, b: 11
  };
  
  const match = note.match(/^([a-g]s?)(\d+)$/i);
  if (!match) return 60;
  
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteNum = noteNames[noteName.toLowerCase()] ?? 0;
  
  return noteNum + (octave + 1) * 12;
};

const midiToNoteName = (midi: number): string => {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
};

export function NoteTimeline({ melody, chords, duration }: NoteTimelineProps) {
  if (melody.length === 0 && chords.length === 0) {
    return (
      <Card className="p-6 border border-border/50">
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          <p>Note timeline will appear after analysis</p>
        </div>
      </Card>
    );
  }

  const allMidiNotes = melody.map(n => noteToMidi(n.note));
  const minMidi = Math.max(36, Math.min(...allMidiNotes) - 2);
  const maxMidi = Math.min(96, Math.max(...allMidiNotes) + 2);
  const noteRange = maxMidi - minMidi + 1;
  
  const pianoKeys = [];
  for (let midi = maxMidi; midi >= minMidi; midi--) {
    const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
    pianoKeys.push({ midi, isBlack, name: midiToNoteName(midi) });
  }

  const getNoteColor = (index: number) => {
    const colors = [
      "bg-chart-1",
      "bg-chart-2", 
      "bg-chart-3",
      "bg-chart-4",
      "bg-chart-5",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="p-4 border border-border/50 overflow-hidden">
      <div className="flex gap-0" data-testid="note-timeline">
        <div className="flex-shrink-0 w-12 border-r border-border/50">
          {pianoKeys.map(({ midi, isBlack, name }) => (
            <div
              key={midi}
              className={`
                h-4 flex items-center justify-end pr-1.5 text-[10px] font-mono
                ${isBlack ? "bg-muted text-muted-foreground" : "bg-card text-foreground/70"}
                ${midi % 12 === 0 ? "font-semibold" : ""}
              `}
            >
              {midi % 12 === 0 ? name : ""}
            </div>
          ))}
        </div>

        <div className="flex-1 relative overflow-x-auto">
          <div 
            className="relative"
            style={{ 
              width: `${Math.max(100, duration * 100)}px`,
              height: `${noteRange * 16}px` 
            }}
          >
            {pianoKeys.map(({ midi, isBlack }, index) => (
              <div
                key={midi}
                className={`
                  absolute left-0 right-0 h-4 border-b border-border/20
                  ${isBlack ? "bg-muted/30" : "bg-background"}
                `}
                style={{ top: `${index * 16}px` }}
              />
            ))}

            {melody.map((note, index) => {
              const noteMidi = noteToMidi(note.note);
              const yPos = (maxMidi - noteMidi) * 16;
              const xPos = (note.time / duration) * Math.max(100, duration * 100);
              const noteWidth = Math.max(12, ((note.duration || 0.25) / duration) * Math.max(100, duration * 100));

              return (
                <div
                  key={`${note.note}-${note.time}-${index}`}
                  className={`
                    absolute h-3.5 rounded-sm ${getNoteColor(index)}
                    shadow-sm transition-all duration-150 hover:brightness-110 hover:scale-y-110
                  `}
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos + 1}px`,
                    width: `${noteWidth}px`,
                  }}
                  title={`${note.note} at ${note.time.toFixed(2)}s`}
                  data-testid={`note-block-${index}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {chords.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">Chord Progression:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {chords.map((chord, index) => (
              <div
                key={`chord-${index}`}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-mono font-medium
                  ${getNoteColor(index)} text-white
                `}
                data-testid={`chord-block-${index}`}
              >
                {chord.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
