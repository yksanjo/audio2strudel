import { useState } from "react";
import { Code, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CodeOutputCardProps {
  title: string;
  code: string;
  colorClass: string;
  defaultExpanded?: boolean;
  description?: string;
}

export function CodeOutputCard({ 
  title, 
  code, 
  colorClass, 
  defaultExpanded = false,
  description 
}: CodeOutputCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const highlightCode = (codeStr: string) => {
    const parts = codeStr.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('"') || part.startsWith("'")) {
        return (
          <span key={index} className="text-chart-1">
            {part}
          </span>
        );
      }
      
      const withFunctions = part.split(/(\.\w+\(|\bstack\(|\bnote\(|\bsound\()/g);
      return withFunctions.map((subpart, subIndex) => {
        if (/^\.\w+\($/.test(subpart) || /^(stack|note|sound)\($/.test(subpart)) {
          return (
            <span key={`${index}-${subIndex}`} className="text-chart-2">
              {subpart}
            </span>
          );
        }
        
        const withNumbers = subpart.split(/(\b\d+\.?\d*\b)/g);
        return withNumbers.map((numPart, numIndex) => {
          if (/^\d+\.?\d*$/.test(numPart)) {
            return (
              <span key={`${index}-${subIndex}-${numIndex}`} className="text-chart-3">
                {numPart}
              </span>
            );
          }
          return <span key={`${index}-${subIndex}-${numIndex}`}>{numPart}</span>;
        });
      });
    });
  };

  return (
    <Card className="border border-border/50 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="flex flex-row items-center justify-between gap-2 p-4 cursor-pointer hover-elevate"
            data-testid={`toggle-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                <Code className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 gap-1.5"
                data-testid={`button-copy-${title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-chart-1" />
                    <span className="text-chart-1">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
              <Badge variant="outline" className="h-8 w-8 p-0 flex items-center justify-center">
                {isOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="bg-background/80 border-t border-border/30">
              <pre 
                className="p-6 overflow-x-auto font-mono text-sm leading-relaxed text-foreground/90"
                data-testid={`code-${title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <code>{highlightCode(code)}</code>
              </pre>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
