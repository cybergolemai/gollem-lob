import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ size = 'md', text, fullScreen = false, className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    };

    const containerClasses = cn(
      'flex flex-col items-center justify-center',
      {
        'fixed inset-0 bg-background/80 backdrop-blur-sm z-50': fullScreen,
        'p-4': !fullScreen
      },
      className
    );

    return (
      <div ref={ref} className={containerClasses} {...props}>
        <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
        {text && (
          <p className={cn('mt-2 text-center text-muted-foreground', {
            'text-sm': size === 'sm',
            'text-base': size === 'md',
            'text-lg': size === 'lg'
          })}>
            {text}
          </p>
        )}
      </div>
    );
  }
);

Loading.displayName = 'Loading';

interface LoadingOverlayProps extends LoadingProps {
  active: boolean;
}

export const LoadingOverlay = ({
  active,
  ...props
}: LoadingOverlayProps) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Loading {...props} />
    </div>
  );
};

export const PageLoader = () => (
  <Loading
    fullScreen
    size="lg"
    text="Loading..."
    className="min-h-[400px]"
  />
);

export const ButtonLoader = () => (
  <Loader2 className="h-4 w-4 animate-spin" />
);

export default Loading;