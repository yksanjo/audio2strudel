import { useState } from "react";
import { Settings, Music, Clock, Hash, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export interface AnalysisParams {
  autoDetectTempo: boolean;
  targetTempo: number;
  autoDetectKey: boolean;
  targetKey: string;
  timeSignature: string;
  minNoteDuration: number;
  pitchSensitivity: number;
  quantizeNotes: boolean;
  quantizeValue: string;
}

interface AnalysisParametersProps {
  params: AnalysisParams;
  onChange: (params: AnalysisParams) => void;
  disabled?: boolean;
}

const MUSICAL_KEYS = [
  "C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B",
  "Cm", "C#m/Dbm", "Dm", "D#m/Ebm", "Em", "Fm", "F#m/Gbm", "Gm", "G#m/Abm", "Am", "A#m/Bbm", "Bm"
];

const TIME_SIGNATURES = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8"];

const QUANTIZE_VALUES = ["1/4", "1/8", "1/16", "1/32", "none"];

export const defaultAnalysisParams: AnalysisParams = {
  autoDetectTempo: true,
  targetTempo: 120,
  autoDetectKey: true,
  targetKey: "C",
  timeSignature: "4/4",
  minNoteDuration: 50,
  pitchSensitivity: 70,
  quantizeNotes: true,
  quantizeValue: "1/16",
};

export function AnalysisParameters({ params, onChange, disabled }: AnalysisParametersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateParam = <K extends keyof AnalysisParams>(key: K, value: AnalysisParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <Card className="border border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto hover:bg-transparent"
            disabled={disabled}
            data-testid="button-toggle-parameters"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-foreground">Analysis Parameters</span>
                <p className="text-xs text-muted-foreground">Tempo, key, and timing settings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!params.autoDetectTempo && (
                <Badge variant="secondary" className="text-xs">
                  {params.targetTempo} BPM
                </Badge>
              )}
              {!params.autoDetectKey && (
                <Badge variant="secondary" className="text-xs">
                  {params.targetKey}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 space-y-6 border-t border-border/50">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-chart-1" />
                  <span className="font-medium text-sm">Tempo Settings</span>
                </div>

                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto-tempo" className="text-sm cursor-pointer">
                        Auto-detect tempo
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Automatically detect BPM from audio transients</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="auto-tempo"
                      checked={params.autoDetectTempo}
                      onCheckedChange={(checked) => updateParam("autoDetectTempo", checked)}
                      disabled={disabled}
                      data-testid="switch-auto-tempo"
                    />
                  </div>

                  {!params.autoDetectTempo && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-muted-foreground">Target Tempo</Label>
                        <span className="text-sm font-mono text-foreground" data-testid="value-tempo">
                          {params.targetTempo} BPM
                        </span>
                      </div>
                      <Slider
                        value={[params.targetTempo]}
                        onValueChange={([value]) => updateParam("targetTempo", value)}
                        min={40}
                        max={240}
                        step={1}
                        disabled={disabled}
                        data-testid="slider-tempo"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="time-sig" className="text-sm">Time Signature</Label>
                    <Select
                      value={params.timeSignature}
                      onValueChange={(value) => updateParam("timeSignature", value)}
                      disabled={disabled}
                    >
                      <SelectTrigger 
                        id="time-sig" 
                        className="w-24 h-8"
                        data-testid="select-time-signature"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SIGNATURES.map((sig) => (
                          <SelectItem key={sig} value={sig}>
                            {sig}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-chart-2" />
                  <span className="font-medium text-sm">Key Settings</span>
                </div>

                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="auto-key" className="text-sm cursor-pointer">
                        Auto-detect key
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Analyze pitch class distribution to detect musical key</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="auto-key"
                      checked={params.autoDetectKey}
                      onCheckedChange={(checked) => updateParam("autoDetectKey", checked)}
                      disabled={disabled}
                      data-testid="switch-auto-key"
                    />
                  </div>

                  {!params.autoDetectKey && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="target-key" className="text-sm text-muted-foreground">
                        Target Key
                      </Label>
                      <Select
                        value={params.targetKey}
                        onValueChange={(value) => updateParam("targetKey", value)}
                        disabled={disabled}
                      >
                        <SelectTrigger 
                          id="target-key" 
                          className="w-full"
                          data-testid="select-target-key"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSICAL_KEYS.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-chart-3" />
                <span className="font-medium text-sm">Detection Settings</span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pl-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Pitch Sensitivity</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Higher values detect more notes but may include noise</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm font-mono text-foreground" data-testid="value-sensitivity">
                      {params.pitchSensitivity}%
                    </span>
                  </div>
                  <Slider
                    value={[params.pitchSensitivity]}
                    onValueChange={([value]) => updateParam("pitchSensitivity", value)}
                    min={10}
                    max={100}
                    step={5}
                    disabled={disabled}
                    data-testid="slider-sensitivity"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Min Note Duration</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Ignore notes shorter than this duration</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm font-mono text-foreground" data-testid="value-min-duration">
                      {params.minNoteDuration}ms
                    </span>
                  </div>
                  <Slider
                    value={[params.minNoteDuration]}
                    onValueChange={([value]) => updateParam("minNoteDuration", value)}
                    min={10}
                    max={200}
                    step={10}
                    disabled={disabled}
                    data-testid="slider-min-duration"
                  />
                </div>
              </div>

              <div className="pl-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quantize" className="text-sm cursor-pointer">
                      Quantize notes
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Snap notes to the nearest rhythmic grid value</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-3">
                    {params.quantizeNotes && (
                      <Select
                        value={params.quantizeValue}
                        onValueChange={(value) => updateParam("quantizeValue", value)}
                        disabled={disabled || !params.quantizeNotes}
                      >
                        <SelectTrigger 
                          className="w-20 h-8"
                          data-testid="select-quantize-value"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUANTIZE_VALUES.filter(v => v !== "none").map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Switch
                      id="quantize"
                      checked={params.quantizeNotes}
                      onCheckedChange={(checked) => updateParam("quantizeNotes", checked)}
                      disabled={disabled}
                      data-testid="switch-quantize"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
