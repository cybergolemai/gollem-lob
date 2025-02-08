import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Sparkles, Zap } from 'lucide-react';
import { AVAILABLE_MODELS, type Model } from './hooks/useInference';

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onModelSelect,
  disabled
}: ModelSelectorProps) {
  const getModelIcon = (model: Model) => {
    switch (model.id) {
      case 'gpt4':
        return <Sparkles className="h-5 w-5" />;
      case 'gpt3':
        return <Cpu className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AVAILABLE_MODELS.map((model) => (
            <Button
              key={model.id}
              variant={selectedModel === model.id ? "default" : "outline"}
              className={`
                flex items-center justify-between p-4 h-auto
                ${selectedModel === model.id ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => onModelSelect(model.id)}
              disabled={disabled}
            >
              <div className="flex items-center gap-3">
                {getModelIcon(model)}
                <div className="text-left">
                  <p className="font-medium">{model.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {model.multiplier}x credits
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {model.maxLength.toLocaleString()} tokens
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}