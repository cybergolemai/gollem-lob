import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, User, AuthError } from '@/lib/auth';
import { useRouter } from 'next/router';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state
    const currentUser = auth.getUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const signInWithProvider = async (provider: 'google' | 'github') => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await auth.signInWithProvider(provider);
      setUser(response.user);
      
      // Redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Authentication failed',
        code: 'auth_error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await auth.signOut();
      setUser(null);
      router.push('/');
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Sign out failed',
        code: 'signout_error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithProvider,
        signOut,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component to protect routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/');
      }
    }, [isLoading, user, router]);

    if (isLoading) {
      return <div>Loading...</div>; // Consider using a proper loading component
    }

    if (!user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}