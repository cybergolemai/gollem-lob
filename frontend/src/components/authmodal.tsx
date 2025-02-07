import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Github, Chrome } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      window.location.href = '/api/auth/google';
    } catch (error) {
      console.error('Google sign in error:', error);
    }
    setIsLoading(false);
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    try {
      window.location.href = '/api/auth/github';
    } catch (error) {
      console.error('GitHub sign in error:', error);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get Started</DialogTitle>
          <DialogDescription>
            Sign up for free access to the GPU marketplace. No credit card required.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleGithubSignIn}
            disabled={isLoading}
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Free Signup
              </span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Get $10 in free credits after signup
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}