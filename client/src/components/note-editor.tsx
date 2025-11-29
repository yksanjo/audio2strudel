import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Plus, Music, Layers, Undo2, ChevronUp, ChevronDown } from "lucide-react";
import type { Note, Chord } from "@shared/schema";

interface NoteEditorProps {
  melody: Note[];
  chords: Chord[];
  onMelodyChange: (melody: Note[]) => void;
  onChordsChange: (chords: Chord[]) => void;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVES = [2, 3, 4, 5, 6, 7];

const CHORD_TYPES = [
  { suffix: "", name: "Major" },
  { suffix: "m", name: "Minor" },
  { suffix: "7", name: "Dominant 7" },
  { suffix: "maj7", name: "Major 7" },
  { suffix: "m7", name: "Minor 7" },
  { suffix: "dim", name: "Diminished" },
  { suffix: "aug", name: "Augmented" },
  { suffix: "sus2", name: "Sus2" },
  { suffix: "sus4", name: "Sus4" },
  { suffix: "add9", name: "Add9" },
];

function parseNote(note: string): { noteName: string; octave: number } {
  const match = note.match(/^([A-Ga-g]#?)(\d+)?$/);
  if (!match) return { noteName: "C", octave: 4 };
  return {
    noteName: match[1].toUpperCase(),
    octave: parseInt(match[2] || "4", 10),
  };
}

function formatNote(noteName: string, octave: number): string {
  return `${noteName}${octave}`;
}

function parseChordName(name: string): { root: string; type: string } {
  const match = name.match(/^([A-Ga-g]#?)(.*)$/);
  if (!match) return { root: "C", type: "" };
  return { root: match[1].toUpperCase(), type: match[2] };
}

export function NoteEditor({ melody, chords, onMelodyChange, onChordsChange }: NoteEditorProps) {
  const [editingNote, setEditingNote] = useState<{ index: number; note: Note } | null>(null);
  const [editingChord, setEditingChord] = useState<{ index: number; chord: Chord } | null>(null);
  const [history, setHistory] = useState<{ melody: Note[]; chords: Chord[] }[]>([]);
  const [activeTab, setActiveTab] = useState<"melody" | "chords">("melody");

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), { melody: [...melody], chords: [...chords] }]);
  }, [melody, chords]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    onMelodyChange(previous.melody);
    onChordsChange(previous.chords);
  }, [history, onMelodyChange, onChordsChange]);

  const updateNote = useCallback((index: number, updates: Partial<Note>) => {
    saveHistory();
    const newMelody = [...melody];
    newMelody[index] = { ...newMelody[index], ...updates };
    onMelodyChange(newMelody);
  }, [melody, onMelodyChange, saveHistory]);

  const deleteNote = useCallback((index: number) => {
    saveHistory();
    const newMelody = melody.filter((_, i) => i !== index);
    onMelodyChange(newMelody);
  }, [melody, onMelodyChange, saveHistory]);

  const addNote = useCallback(() => {
    saveHistory();
    const lastNote = melody[melody.length - 1];
    const newNote: Note = {
      note: lastNote?.note || "C4",
      time: (lastNote?.time || 0) + (lastNote?.duration || 0.25),
      duration: 0.25,
      velocity: 0.8,
    };
    onMelodyChange([...melody, newNote]);
  }, [melody, onMelodyChange, saveHistory]);

  const moveNoteUp = useCallback((index: number) => {
    const { noteName, octave } = parseNote(melody[index].note);
    const noteIdx = NOTE_NAMES.indexOf(noteName);
    let newNoteName = noteName;
    let newOctave = octave;
    
    if (noteIdx === NOTE_NAMES.length - 1) {
      newNoteName = NOTE_NAMES[0];
      newOctave = Math.min(octave + 1, 7);
    } else {
      newNoteName = NOTE_NAMES[noteIdx + 1];
    }
    
    updateNote(index, { note: formatNote(newNoteName, newOctave) });
  }, [melody, updateNote]);

  const moveNoteDown = useCallback((index: number) => {
    const { noteName, octave } = parseNote(melody[index].note);
    const noteIdx = NOTE_NAMES.indexOf(noteName);
    let newNoteName = noteName;
    let newOctave = octave;
    
    if (noteIdx === 0) {
      newNoteName = NOTE_NAMES[NOTE_NAMES.length - 1];
      newOctave = Math.max(octave - 1, 2);
    } else {
      newNoteName = NOTE_NAMES[noteIdx - 1];
    }
    
    updateNote(index, { note: formatNote(newNoteName, newOctave) });
  }, [melody, updateNote]);

  const updateChord = useCallback((index: number, updates: Partial<Chord>) => {
    saveHistory();
    const newChords = [...chords];
    newChords[index] = { ...newChords[index], ...updates };
    onChordsChange(newChords);
  }, [chords, onChordsChange, saveHistory]);

  const deleteChord = useCallback((index: number) => {
    saveHistory();
    const newChords = chords.filter((_, i) => i !== index);
    onChordsChange(newChords);
  }, [chords, onChordsChange, saveHistory]);

  const addChord = useCallback(() => {
    saveHistory();
    const lastChord = chords[chords.length - 1];
    const newChord: Chord = {
      notes: ["C4", "E4", "G4"],
      name: "C",
      time: (lastChord?.time || 0) + (lastChord?.duration || 1),
      duration: 1,
    };
    onChordsChange([...chords, newChord]);
  }, [chords, onChordsChange, saveHistory]);

  const handleSaveNote = useCallback(() => {
    if (!editingNote) return;
    setEditingNote(null);
  }, [editingNote]);

  const handleSaveChord = useCallback(() => {
    if (!editingChord) return;
    setEditingChord(null);
  }, [editingChord]);

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
    <Card className="p-4 border border-border/50" data-testid="note-editor">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold text-foreground">Fine-tune Notes & Chords</h3>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={undo}
                  disabled={history.length === 0}
                  data-testid="button-undo"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo last change</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "melody" | "chords")}>
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="melody" className="gap-1.5" data-testid="tab-edit-melody">
              <Music className="w-4 h-4" />
              Melody ({melody.length})
            </TabsTrigger>
            <TabsTrigger value="chords" className="gap-1.5" data-testid="tab-edit-chords">
              <Layers className="w-4 h-4" />
              Chords ({chords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="melody" className="mt-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {melody.map((note, index) => {
                  const { noteName, octave } = parseNote(note.note);
                  return (
                    <div
                      key={`note-${index}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover-elevate"
                      data-testid={`editable-note-${index}`}
                    >
                      <Badge 
                        className={`${getNoteColor(index)} text-white font-mono min-w-[60px] justify-center`}
                        data-testid={`note-pitch-${index}`}
                      >
                        {note.note.toUpperCase()}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveNoteUp(index)}
                              data-testid={`button-note-up-${index}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move note up (semitone)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveNoteDown(index)}
                              data-testid={`button-note-down-${index}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move note down (semitone)</TooltipContent>
                        </Tooltip>
                      </div>

                      <span className="text-xs text-muted-foreground font-mono flex-1">
                        {note.time.toFixed(2)}s • {(note.duration || 0.25).toFixed(2)}s
                      </span>

                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingNote({ index, note: { ...note } })}
                              data-testid={`button-edit-note-${index}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit note details</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteNote(index)}
                              data-testid={`button-delete-note-${index}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete note</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1.5"
              onClick={addNote}
              data-testid="button-add-note"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </Button>
          </TabsContent>

          <TabsContent value="chords" className="mt-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {chords.map((chord, index) => {
                  const { root, type } = parseChordName(chord.name);
                  return (
                    <div
                      key={`chord-${index}`}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover-elevate"
                      data-testid={`editable-chord-${index}`}
                    >
                      <Badge 
                        className={`${getNoteColor(index)} text-white font-mono min-w-[60px] justify-center`}
                        data-testid={`chord-name-${index}`}
                      >
                        {chord.name}
                      </Badge>

                      <span className="text-xs text-muted-foreground font-mono flex-1">
                        {chord.time.toFixed(2)}s • {(chord.duration || 1).toFixed(2)}s
                      </span>

                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingChord({ index, chord: { ...chord } })}
                              data-testid={`button-edit-chord-${index}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit chord details</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteChord(index)}
                              data-testid={`button-delete-chord-${index}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete chord</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
                
                {chords.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No chords detected. Add chords manually.
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1.5"
              onClick={addChord}
              data-testid="button-add-chord"
            >
              <Plus className="w-4 h-4" />
              Add Chord
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editingNote !== null} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="note-name">Note</Label>
                  <Select
                    value={parseNote(editingNote.note.note).noteName}
                    onValueChange={(value) => {
                      const { octave } = parseNote(editingNote.note.note);
                      const newNote = { ...editingNote.note, note: formatNote(value, octave) };
                      updateNote(editingNote.index, newNote);
                      setEditingNote({ ...editingNote, note: newNote });
                    }}
                  >
                    <SelectTrigger data-testid="select-note-name">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_NAMES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note-octave">Octave</Label>
                  <Select
                    value={String(parseNote(editingNote.note.note).octave)}
                    onValueChange={(value) => {
                      const { noteName } = parseNote(editingNote.note.note);
                      const newNote = { ...editingNote.note, note: formatNote(noteName, parseInt(value, 10)) };
                      updateNote(editingNote.index, newNote);
                      setEditingNote({ ...editingNote, note: newNote });
                    }}
                  >
                    <SelectTrigger data-testid="select-note-octave">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OCTAVES.map((o) => (
                        <SelectItem key={o} value={String(o)}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="note-time">Start Time (s)</Label>
                  <Input
                    id="note-time"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingNote.note.time}
                    onChange={(e) => {
                      const newNote = { ...editingNote.note, time: parseFloat(e.target.value) || 0 };
                      updateNote(editingNote.index, newNote);
                      setEditingNote({ ...editingNote, note: newNote });
                    }}
                    data-testid="input-note-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note-duration">Duration (s)</Label>
                  <Input
                    id="note-duration"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editingNote.note.duration || 0.25}
                    onChange={(e) => {
                      const newNote = { ...editingNote.note, duration: parseFloat(e.target.value) || 0.25 };
                      updateNote(editingNote.index, newNote);
                      setEditingNote({ ...editingNote, note: newNote });
                    }}
                    data-testid="input-note-duration"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-velocity">Velocity (0-1)</Label>
                <Input
                  id="note-velocity"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={editingNote.note.velocity || 0.8}
                  onChange={(e) => {
                    const newNote = { ...editingNote.note, velocity: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0.8)) };
                    updateNote(editingNote.index, newNote);
                    setEditingNote({ ...editingNote, note: newNote });
                  }}
                  data-testid="input-note-velocity"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveNote} data-testid="button-save-note">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingChord !== null} onOpenChange={(open) => !open && setEditingChord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chord</DialogTitle>
          </DialogHeader>
          {editingChord && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chord-root">Root Note</Label>
                  <Select
                    value={parseChordName(editingChord.chord.name).root}
                    onValueChange={(value) => {
                      const { type } = parseChordName(editingChord.chord.name);
                      const newChord = { ...editingChord.chord, name: `${value}${type}` };
                      updateChord(editingChord.index, newChord);
                      setEditingChord({ ...editingChord, chord: newChord });
                    }}
                  >
                    <SelectTrigger data-testid="select-chord-root">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_NAMES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chord-type">Chord Type</Label>
                  <Select
                    value={parseChordName(editingChord.chord.name).type}
                    onValueChange={(value) => {
                      const { root } = parseChordName(editingChord.chord.name);
                      const newChord = { ...editingChord.chord, name: `${root}${value}` };
                      updateChord(editingChord.index, newChord);
                      setEditingChord({ ...editingChord, chord: newChord });
                    }}
                  >
                    <SelectTrigger data-testid="select-chord-type">
                      <SelectValue placeholder="Major" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHORD_TYPES.map((ct) => (
                        <SelectItem key={ct.suffix} value={ct.suffix}>{ct.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chord-time">Start Time (s)</Label>
                  <Input
                    id="chord-time"
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingChord.chord.time}
                    onChange={(e) => {
                      const newChord = { ...editingChord.chord, time: parseFloat(e.target.value) || 0 };
                      updateChord(editingChord.index, newChord);
                      setEditingChord({ ...editingChord, chord: newChord });
                    }}
                    data-testid="input-chord-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chord-duration">Duration (s)</Label>
                  <Input
                    id="chord-duration"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editingChord.chord.duration || 1}
                    onChange={(e) => {
                      const newChord = { ...editingChord.chord, duration: parseFloat(e.target.value) || 1 };
                      updateChord(editingChord.index, newChord);
                      setEditingChord({ ...editingChord, chord: newChord });
                    }}
                    data-testid="input-chord-duration"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveChord} data-testid="button-save-chord">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
