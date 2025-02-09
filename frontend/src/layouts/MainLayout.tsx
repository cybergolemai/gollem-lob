import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  MonitorDot,
  History,
  HelpCircle,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCredits } from '@/features/payments/hooks/useCredits';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  requiredRole?: string;
}

const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Inference',
    href: '/inference',
    icon: MonitorDot
  },
  {
    label: 'Credits',
    href: '/credits',
    icon: CreditCard
  },
  {
    label: 'History',
    href: '/history',
    icon: History
  }
];

const secondaryNavItems: NavItem[] = [
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings
  },
  {
    label: 'Help & Support',
    href: '/support',
    icon: HelpCircle
  }
];

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  const { balance, isBalanceLoading } = useCredits();

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false);
      setIsUserMenuOpen(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [router]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (isAuthLoading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            className="mr-2 px-0 text-base hover:bg-transparent focus:ring-0 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold">GoLLeM</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary",
                  router.pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Credits Display */}
            {!isBalanceLoading && (
              <Link href="/credits" className="hidden md:block">
                <Button variant="outline" size="sm">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {balance?.toFixed(8)} credits
                </Button>
              </Link>
            )}

            {/* User Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center space-x-2"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background shadow-lg">
                  <div className="p-2">
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {user.email}
                    </div>
                    <div className="my-1 h-px bg-muted" />
                    {secondaryNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                    <div className="my-1 h-px bg-muted" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/80 backdrop-blur-sm md:hidden">
          <div className="fixed inset-x-4 top-20 z-30 rounded-lg border bg-background shadow-lg">
            <div className="flex flex-col p-4 space-y-4">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md p-2 text-sm font-medium hover:bg-muted",
                    router.pathname === item.href
                      ? "bg-muted"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-muted" />
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GoLLeM. All rights reserved.
          </p>
          <nav className="flex items-center space-x-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/docs" className="hover:underline">
              Documentation
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}