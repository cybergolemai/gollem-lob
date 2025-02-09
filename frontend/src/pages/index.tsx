import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Zap, CreditCard, BarChart } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

export default function Home() {
  const router = useRouter();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Update hero section buttons with auth flow
  const handleGetStarted = () => {
    setAuthModalOpen(true);
  };
export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            GPU Limit Orderbook for LLM Inference
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Optimize your LLM inference costs with our market-driven GPU allocation system.
            Match with providers based on price, latency, and throughput requirements.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted}>
              Sign Up Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/docs')}>
              View Documentation
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required • $10 free credits on signup
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <Cpu className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>GPU Marketplace</CardTitle>
              <CardDescription>
                Dynamic market for GPU resources with real-time pricing and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Automatic price discovery</li>
                <li>Provider reputation tracking</li>
                <li>Multi-GPU support</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>Optimized Matching</CardTitle>
              <CardDescription>
                Pareto-optimal matching based on your specific requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Latency preferences</li>
                <li>Price constraints</li>
                <li>Model compatibility</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>Credit System</CardTitle>
              <CardDescription>
                Secure credit-based payment system for all transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Pre-paid credits</li>
                <li>Automatic settlement</li>
                <li>Usage-based billing</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>Real-time Metrics</CardTitle>
              <CardDescription>
                Comprehensive monitoring and analytics for your inference usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Cost tracking</li>
                <li>Performance metrics</li>
                <li>Usage analytics</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-16 mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Transparent Pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pay only for what you use with our credit-based system. Credits are used based on model and GPU type.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Base Rate</CardTitle>
              <CardDescription>1 credit = $0.001 USD</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Base pricing for all standard operations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Multipliers</CardTitle>
              <CardDescription>Based on model complexity</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground">
                <li>GPT-4 = 2x</li>
                <li>GPT-3 = 1x</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GPU Multipliers</CardTitle>
              <CardDescription>Based on GPU performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground">
                <li>H100 = 2x</li>
                <li>A100 = 1.5x</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 text-center bg-primary/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Ready to optimize your LLM inference?
          </h2>
          <p className="text-muted-foreground mb-8">
            Get started for free today with $10 in credits.
          </p>
          <Button size="lg" onClick={handleGetStarted}>
            Sign Up Now
          </Button>
        </div>
      </section>
    </div>
  );
}