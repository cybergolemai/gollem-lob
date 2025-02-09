import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { useInference } from './hooks/useInference';
import ModelSelector from './ModelSelector';
import CostEstimator from './CostEstimator';
import ResponseViewer from './ResponseViewer';

export default function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt3');
  
  const {
    isLoading,
    error,
    response,
    generateText,
    reset,
    streamingComplete
  } = useInference();

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    await generateText(prompt, selectedModel);
  }, [prompt, selectedModel, generateText]);

  const handleReset = useCallback(() => {
    setPrompt('');
    reset();
  }, [reset]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your prompt here..."
                className="min-h-[200px] font-mono"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {prompt.length} characters
                  {prompt.length > 0 && ` (≈${Math.ceil(prompt.length / 4)} tokens)`}
                </p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading || (!prompt && !response)}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ModelSelector
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            disabled={isLoading}
          />
          <CostEstimator
            promptLength={prompt.length}
            selectedModel={selectedModel}
          />
        </div>
      </div>

      <ResponseViewer
        response={response}
        isLoading={isLoading}
        error={error}
        streamingComplete={streamingComplete}
      />
    </div>
  );
}