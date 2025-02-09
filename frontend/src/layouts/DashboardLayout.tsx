import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CreditCard, Settings, Activity, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const router = useRouter();

  const navigationItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/credits', label: 'Credits', icon: CreditCard },
    { href: '/dashboard/activity', label: 'Activity', icon: Activity },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <div className="fixed top-0 left-0 h-full w-64 border-r bg-card">
        {/* Logo / Brand */}
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold">GoLLeM</h1>
          <p className="text-sm text-muted-foreground">GPU Marketplace</p>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 py-2">
          {navigationItems.map(({ href, label, icon: Icon }) => {
            const isActive = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center px-6">
            <div className="ml-auto flex items-center gap-4">
              <Card className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-sm text-muted-foreground">Credits:</span>
                <span className="font-medium">0.00000000</span>
              </Card>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="container py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;