import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Download, 
  Music, 
  FileAudio, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Play,
  ExternalLink
} from "lucide-react";
import { downloadMidiFile } from "@/lib/midi-export";
import { useToast } from "@/hooks/use-toast";
import type { Note, Chord } from "@shared/schema";
import type { BatchFile } from "./batch-uploader";

export interface BatchAnalysisResult {
  detectedNotes: number;
  chordChanges: number;
  detectedKey: string;
  estimatedTempo: number;
  duration: number;
  waveformData: number[];
}

export interface BatchResult {
  id: string;
  fileName: string;
  result?: BatchAnalysisResult;
  notes?: Note[];
  chords?: Chord[];
  strudelCode?: {
    melody: string;
    chords: string;
    combined: string;
  };
  error?: string;
}

interface BatchResultsProps {
  results: BatchResult[];
  files: BatchFile[];
  onExportAll: () => void;
}

export function BatchResults({ results, files, onExportAll }: BatchResultsProps) {
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const successfulResults = results.filter(r => r.result && !r.error);
  const failedResults = results.filter(r => r.error);

  const handleCopyCode = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: `${type} code copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExportMidi = (result: BatchResult) => {
    if (!result.notes || !result.result) return;
    
    downloadMidiFile(
      result.notes,
      result.chords || [],
      { tempo: result.result.estimatedTempo || 120 },
      `${result.fileName.replace(/\.[^.]+$/, "")}.mid`
    );
    
    toast({
      title: "MIDI Exported",
      description: `${result.fileName} exported successfully`,
    });
  };

  const handleCopyAllCode = async () => {
    const allCode = successfulResults
      .map(r => {
        if (!r.strudelCode) return "";
        return `// ${r.fileName}\n${r.strudelCode.combined}`;
      })
      .filter(Boolean)
      .join("\n\n");
    
    try {
      await navigator.clipboard.writeText(allCode);
      toast({
        title: "Copied!",
        description: `All Strudel code copied to clipboard (${successfulResults.length} files)`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExportAllMidi = () => {
    let exported = 0;
    for (const result of successfulResults) {
      if (result.notes && result.result) {
        downloadMidiFile(
          result.notes,
          result.chords || [],
          { tempo: result.result.estimatedTempo || 120 },
          `${result.fileName.replace(/\.[^.]+$/, "")}.mid`
        );
        exported++;
      }
    }
    
    toast({
      title: "MIDI Export Complete",
      description: `Exported ${exported} MIDI file${exported !== 1 ? "s" : ""}`,
    });
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-foreground" data-testid="text-batch-results-summary">
              Batch Processing Results
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {successfulResults.length} successful, {failedResults.length} failed
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAllCode}
              disabled={successfulResults.length === 0}
              className="gap-2"
              data-testid="button-copy-all-code"
            >
              <Copy className="w-4 h-4" />
              Copy All Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAllMidi}
              disabled={successfulResults.length === 0}
              className="gap-2"
              data-testid="button-export-all-midi"
            >
              <Download className="w-4 h-4" />
              Export All MIDI
            </Button>
            <Button
              variant="default"
              size="sm"
              asChild
              className="gap-2"
            >
              <a 
                href="https://strudel.cc/" 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid="link-batch-strudel"
              >
                <ExternalLink className="w-4 h-4" />
                Open Strudel
              </a>
            </Button>
          </div>
        </div>
      </Card>

      <ScrollArea className="max-h-[600px]">
        <Accordion
          type="multiple"
          value={expandedItems}
          onValueChange={setExpandedItems}
          className="space-y-2 pr-4"
        >
          {results.map((result) => (
            <AccordionItem
              key={result.id}
              value={result.id}
              className="border rounded-lg overflow-hidden"
              data-testid={`batch-result-${result.id}`}
            >
              <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <FileAudio className="w-4 h-4 text-primary" />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <span 
                      className="font-medium text-foreground truncate block text-sm"
                      data-testid={`text-batch-result-filename-${result.id}`}
                    >
                      {result.fileName}
                    </span>
                  </div>
                  
                  {result.error ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Failed
                    </Badge>
                  ) : result.result ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Music className="w-3 h-3" />
                        {result.notes?.length || 0} notes
                      </Badge>
                      <Badge variant="secondary">
                        {result.result.detectedKey}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="w-3 h-3 text-chart-1" />
                        Complete
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                {result.error ? (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {result.error}
                  </div>
                ) : result.result && result.strudelCode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                      <span>
                        <strong className="text-foreground">Key:</strong> {result.result.detectedKey}
                      </span>
                      <span>
                        <strong className="text-foreground">Tempo:</strong> {result.result.estimatedTempo} BPM
                      </span>
                      <span>
                        <strong className="text-foreground">Notes:</strong> {result.notes?.length || 0}
                      </span>
                      <span>
                        <strong className="text-foreground">Chords:</strong> {result.chords?.length || 0}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Strudel Code</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(result.strudelCode!.combined, "Combined")}
                            className="gap-1"
                            data-testid={`button-copy-code-${result.id}`}
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportMidi(result)}
                            className="gap-1"
                            data-testid={`button-export-midi-${result.id}`}
                          >
                            <Download className="w-3 h-3" />
                            MIDI
                          </Button>
                        </div>
                      </div>
                      
                      <pre className="p-3 rounded-lg bg-muted/50 text-xs font-mono overflow-x-auto max-h-32">
                        <code data-testid={`code-output-${result.id}`}>
                          {result.strudelCode.combined}
                        </code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No results available
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
