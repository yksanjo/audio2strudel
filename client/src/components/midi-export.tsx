import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Download, Music } from "lucide-react";
import { downloadMidiFile } from "@/lib/midi-export";
import type { Note, Chord } from "@shared/schema";

interface MidiExportProps {
  melody: Note[];
  chords: Chord[];
  tempo: number;
  fileName?: string;
}

export function MidiExport({ melody, chords, tempo, fileName }: MidiExportProps) {
  const [open, setOpen] = useState(false);
  const [includeMelody, setIncludeMelody] = useState(true);
  const [includeChords, setIncludeChords] = useState(true);
  const [customFileName, setCustomFileName] = useState(
    fileName?.replace(/\.[^.]+$/, "") || "audio-extract"
  );

  const handleExport = () => {
    downloadMidiFile(melody, chords, {
      tempo,
      includeMelody,
      includeChords,
    }, `${customFileName}.mid`);
    setOpen(false);
  };

  const canExport = (includeMelody && melody.length > 0) || (includeChords && chords.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="lg" 
          className="gap-2"
          data-testid="button-export-midi-open"
        >
          <Download className="w-4 h-4" />
          Export MIDI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-midi-export">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Export to MIDI
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="midi-filename">File Name</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="midi-filename"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="audio-extract"
                data-testid="input-midi-filename"
              />
              <span className="text-sm text-muted-foreground">.mid</span>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Include in Export</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-melody" className="font-normal">
                  Melody Notes
                </Label>
                <p className="text-xs text-muted-foreground">
                  {melody.length} note{melody.length !== 1 ? "s" : ""} on Channel 1
                </p>
              </div>
              <Switch
                id="include-melody"
                checked={includeMelody}
                onCheckedChange={setIncludeMelody}
                disabled={melody.length === 0}
                data-testid="switch-include-melody"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-chords" className="font-normal">
                  Chord Progression
                </Label>
                <p className="text-xs text-muted-foreground">
                  {chords.length} chord{chords.length !== 1 ? "s" : ""} on Channel 2
                </p>
              </div>
              <Switch
                id="include-chords"
                checked={includeChords}
                onCheckedChange={setIncludeChords}
                disabled={chords.length === 0}
                data-testid="switch-include-chords"
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <p>
              Tempo: <span className="font-mono font-medium text-foreground">{tempo} BPM</span>
            </p>
            <p className="mt-1">
              The MIDI file will be compatible with most DAWs including 
              Ableton Live, FL Studio, Logic Pro, and GarageBand.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-midi-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            className="gap-2"
            data-testid="button-midi-download"
          >
            <Download className="w-4 h-4" />
            Download MIDI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
