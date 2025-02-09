import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ResponseViewerProps {
  response: string;
  isLoading: boolean;
  error: string | null;
  streamingComplete: boolean;
}

export default function ResponseViewer({
  response,
  isLoading,
  error,
  streamingComplete
}: ResponseViewerProps) {
  const [copied, setCopied] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (responseRef.current && streamingComplete) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, streamingComplete]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Response</CardTitle>
        {response && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={responseRef}
          className="h-[400px] overflow-y-auto rounded-lg bg-muted p-4 font-mono text-sm"
        >
          {isLoading && !response && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {response && (
            <div className="whitespace-pre-wrap">
              {response}
              {isLoading && !streamingComplete && (
                <span className="inline-block animate-pulse">▊</span>
              )}
            </div>
          )}

          {!isLoading && !error && !response && (
            <div className="text-center text-muted-foreground h-full flex items-center justify-center">
              Response will appear here
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}