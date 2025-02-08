import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '@/lib/auth';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';

export default function EmailVerification() {
  const router = useRouter();
  const { token } = router.query;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      await auth.verifyEmail(verificationToken);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    if (token && typeof token === 'string') {
      setStatus('loading');
      setError(null);
      verifyEmail(token);
    }
  };

  const handleDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Verification
        </CardTitle>
        <CardDescription>
          Verifying your email address
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Verifying your email address...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Email Verified Successfully
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your email address has been verified. You can now access all features.
            </p>
            <Button onClick={handleDashboard}>
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-col items-center justify-center py-6">
              <XCircle className="h-8 w-8 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Verification Failed
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We couldn't verify your email address. Please try again.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  Try Again
                </Button>
                <Button variant="destructive" onClick={handleDashboard}>
                  Skip for Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}