import { CheckCircle, Loader2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProcessingStatus as ProcessingStatusType } from "@shared/schema";

interface ProcessingStatusProps {
  status: ProcessingStatusType;
}

const steps = [
  { key: "decoding", label: "Decoding Audio", description: "Reading audio data" },
  { key: "analyzing", label: "Analyzing Waveform", description: "Processing signal" },
  { key: "detecting", label: "Detecting Pitches", description: "Finding melody notes" },
  { key: "generating", label: "Generating Code", description: "Creating Strudel notation" },
];

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  const getCurrentStepIndex = () => {
    const stepKeys = ["decoding", "analyzing", "detecting", "generating", "complete"];
    return stepKeys.indexOf(status.step);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <Card className="p-8 border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground" data-testid="text-processing-status">
            {status.message}
          </h3>
          <span className="text-sm font-mono text-muted-foreground" data-testid="text-processing-progress">
            {status.progress}%
          </span>
        </div>
        <Progress 
          value={status.progress} 
          className="h-2"
          data-testid="progress-bar"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex && status.step !== "complete";
          const isPending = index > currentIndex;

          return (
            <div
              key={step.key}
              className={`
                relative p-4 rounded-xl border transition-all duration-300
                ${isCompleted 
                  ? "border-chart-1/30 bg-chart-1/10" 
                  : isCurrent 
                    ? "border-primary/50 bg-primary/10" 
                    : "border-muted bg-muted/30"
                }
              `}
              data-testid={`step-${step.key}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${isCompleted 
                    ? "bg-chart-1 text-white" 
                    : isCurrent 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <span className={`
                  text-sm font-medium
                  ${isCompleted 
                    ? "text-chart-1" 
                    : isCurrent 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  }
                `}>
                  Step {index + 1}
                </span>
              </div>
              <h4 className={`
                font-semibold text-sm mb-1
                ${isPending ? "text-muted-foreground" : "text-foreground"}
              `}>
                {step.label}
              </h4>
              <p className="text-xs text-muted-foreground">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
