import { api } from './api';

export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthError {
  message: string;
  code: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  async signInWithProvider(provider: 'google' | 'github'): Promise<AuthResponse> {
    // Open provider auth window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const authWindow = window.open(
      `/api/auth/${provider}`,
      'Auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise((resolve, reject) => {
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'auth_callback') return;

        window.removeEventListener('message', handleMessage);
        authWindow?.close();

        if (event.data.error) {
          reject(new Error(event.data.error));
          return;
        }

        try {
          const response = await this.handleAuthCallback(event.data.code);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  private async handleAuthCallback(code: string): Promise<AuthResponse> {
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const auth = await response.json();
    this.setSession(auth);
    return auth;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    if (!this.token) throw new Error('Not authenticated');

    const response = await api.put('/auth/profile', data);
    const updatedUser = response.data;
    
    this.user = { ...this.user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(this.user));
    
    return this.user;
  }

  async sendVerificationEmail(): Promise<void> {
    if (!this.token) throw new Error('Not authenticated');
    await api.post('/auth/send-verification');
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await api.post('/auth/verify-email', { token });
    if (response.data.verified && this.user) {
      this.user.emailVerified = true;
      localStorage.setItem('user', JSON.stringify(this.user));
    }
  }

  async signOut(): Promise<void> {
    if (this.token) {
      try {
        await api.post('/auth/signout');
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
    this.clearSession();
  }

  private setSession(auth: AuthResponse): void {
    this.token = auth.token;
    this.user = auth.user;
    
    localStorage.setItem('auth_token', auth.token);
    localStorage.setItem('user', JSON.stringify(auth.user));
    
    api.setToken(auth.token);
  }

  private clearSession(): void {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    api.setToken(null);
  }
}

export const auth = new AuthService();