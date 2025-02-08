import React from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import UserProfile from '@/features/auth/UserProfile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="container space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              Settings
            </CardTitle>
            <CardDescription>
              Manage your account preferences and profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UserProfile />
            {/* Add other settings components here in the future */}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// Icon component - you can replace this with lucide-react if you prefer
const SettingsIcon = React.forwardRef<
  React.ForwardRefExoticComponent<any>,
  React.ComponentPropsWithoutRef<React.ForwardRefExoticComponent<any>>
>(({ className, ...props }, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    ref={ref}
    {...props}
  >
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.414 1.414" />
    <path d="M17.657 17.657l1.414 1.414" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M4.93 19.07l1.414-1.414" />
    <path d="M17.657 6.343l1.414-1.414" />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
  </svg>
));
SettingsIcon.displayName = "SettingsIcon";