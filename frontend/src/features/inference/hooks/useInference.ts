import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Decimal } from 'decimal.js';
import { useCredits } from '@/features/payments/hooks/useCredits';

export interface InferenceOptions {
  maxPrice?: string;
  maxLatency?: number;
}

export interface Model {
  id: string;
  name: string;
  multiplier: number;
  maxLength: number;
}

export const AVAILABLE_MODELS: Model[] = [
  { id: 'gpt4', name: 'GPT-4', multiplier: 2, maxLength: 8000 },
  { id: 'gpt3', name: 'GPT-3', multiplier: 1, maxLength: 4000 }
];

export const GPU_MULTIPLIERS = {
  'h100': 2,
  'a100': 1.5
};

export interface UseInferenceReturn {
  isLoading: boolean;
  error: string | null;
  response: string;
  generateText: (prompt: string, model: string, options?: InferenceOptions) => Promise<void>;
  estimateCost: (promptLength: number, model: string) => Decimal;
  reset: () => void;
  streamingComplete: boolean;
}

export function useInference(): UseInferenceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [streamingComplete, setStreamingComplete] = useState(false);
  const { balance } = useCredits();

  const reset = useCallback(() => {
    setResponse('');
    setError(null);
    setStreamingComplete(false);
  }, []);

  const estimateCost = useCallback((promptLength: number, modelId: string) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return new Decimal(0);

    // Base rate is 1 credit per 4 tokens
    const baseTokens = new Decimal(promptLength).div(4).ceil();
    return baseTokens.mul(model.multiplier);
  }, []);

  const generateText = useCallback(async (
    prompt: string,
    modelId: string,
    options: InferenceOptions = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setResponse('');
      setStreamingComplete(false);

      const cost = estimateCost(prompt.length, modelId);
      
      if (!balance || cost.greaterThan(balance)) {
        throw new Error('Insufficient credits');
      }

      const response = await api.generateText({
        model: modelId,
        prompt,
        maxPrice: options.maxPrice || '0.001',
        maxLatency: options.maxLatency || 1000
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Handle streaming response
      if (response.data) {
        let fullResponse = '';
        
        for await (const chunk of response.data) {
          fullResponse += chunk.response;
          setResponse(fullResponse);
          
          if (chunk.done) {
            setStreamingComplete(true);
            break;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [balance, estimateCost]);

  return {
    isLoading,
    error,
    response,
    generateText,
    estimateCost,
    reset,
    streamingComplete
  };
}