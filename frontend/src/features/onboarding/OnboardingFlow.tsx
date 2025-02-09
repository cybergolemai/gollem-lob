import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/features/auth/AuthProvider';
import { CreditPurchase } from '@/features/payments/credit-purchase/CreditPurchase';
import { Coins, Cpu, Settings, User, Zap, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the structure for each step's data
interface StepData {
  profile?: {
    name: string;
    organization?: string;
    useCase: string;
  };
  providers?: {
    selectedModels: string[];
    maxLatency: number;
    maxPrice: string;
  };
  preferences?: {
    emailNotifications: boolean;
    defaultModel: string;
  };
}

// Define the interfaces for the step components
interface StepProps {
  data: StepData;
  onUpdate: (data: Partial<StepData>) => void;
  onNext: () => void;
  onBack: () => void;
  isValid: boolean;
}

// Profile setup component
function ProfileSetup({ data, onUpdate, onNext, isValid }: StepProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: data.profile?.name || user?.name || '',
    organization: data.profile?.organization || '',
    useCase: data.profile?.useCase || ''
  });

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newData = { ...formData, [field]: e.target.value };
    setFormData(newData);
    onUpdate({ profile: newData });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <Input
          value={formData.organization}
          onChange={handleChange('organization')}
          placeholder="Your organization (optional)"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Primary Use Case</label>
        <Input
          value={formData.useCase}
          onChange={handleChange('useCase')}
          placeholder="How will you use GoLLeM?"
        />
      </div>

      <Button
        className="w-full"
        onClick={onNext}
        disabled={!isValid}
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// Provider preferences component
function ProviderPreferences({ data, onUpdate, onNext, onBack }: StepProps) {
  const [preferences, setPreferences] = useState({
    selectedModels: data.providers?.selectedModels || ['gpt4'],
    maxLatency: data.providers?.maxLatency || 1000,
    maxPrice: data.providers?.maxPrice || '0.001'
  });

  const handleModelToggle = (model: string) => {
    setPreferences(prev => {
      const newModels = prev.selectedModels.includes(model)
        ? prev.selectedModels.filter(m => m !== model)
        : [...prev.selectedModels, model];
      
      const newPrefs = { ...prev, selectedModels: newModels };
      onUpdate({ providers: newPrefs });
      return newPrefs;
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="text-sm font-medium">Select Models</label>
        <div className="grid grid-cols-2 gap-4">
          {['gpt4', 'gpt3'].map(model => (
            <Button
              key={model}
              variant={preferences.selectedModels.includes(model) ? 'default' : 'outline'}
              onClick={() => handleModelToggle(model)}
              className="justify-start"
            >
              <Cpu className="mr-2 h-4 w-4" />
              {model.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium">Maximum Latency (ms)</label>
        <Input
          type="number"
          value={preferences.maxLatency}
          onChange={e => {
            const newPrefs = { ...preferences, maxLatency: parseInt(e.target.value) };
            setPreferences(newPrefs);
            onUpdate({ providers: newPrefs });
          }}
          min={100}
          max={5000}
          step={100}
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium">Maximum Price per Token</label>
        <Input
          type="number"
          value={preferences.maxPrice}
          onChange={e => {
            const newPrefs = { ...preferences, maxPrice: e.target.value };
            setPreferences(newPrefs);
            onUpdate({ providers: newPrefs });
          }}
          min={0.0001}
          max={0.01}
          step={0.0001}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// System preferences component
function SystemPreferences({ data, onUpdate, onNext, onBack }: StepProps) {
  const [preferences, setPreferences] = useState({
    emailNotifications: data.preferences?.emailNotifications ?? true,
    defaultModel: data.preferences?.defaultModel || 'gpt4'
  });

  const handleChange = (field: keyof typeof preferences) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    const newPrefs = { ...preferences, [field]: value };
    setPreferences(newPrefs);
    onUpdate({ preferences: newPrefs });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Email Notifications</p>
          <p className="text-sm text-muted-foreground">
            Receive updates about system status and usage
          </p>
        </div>
        <input
          type="checkbox"
          checked={preferences.emailNotifications}
          onChange={handleChange('emailNotifications')}
          className="h-6 w-6 rounded border-gray-300"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Default Model</label>
        <select
          value={preferences.defaultModel}
          onChange={handleChange('defaultModel')}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="gpt4">GPT-4</option>
          <option value="gpt3">GPT-3</option>
        </select>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Final completion component
function OnboardingComplete({ onNext }: StepProps) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
      </div>
      <h3 className="text-lg font-semibold">You're All Set!</h3>
      <p className="text-muted-foreground">
        Your account is now configured and ready to use. You can adjust these settings
        anytime from your dashboard.
      </p>
      <Button className="w-full" onClick={onNext}>
        Go to Dashboard
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// Steps configuration
const steps = [
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Tell us about yourself',
    icon: User,
    component: ProfileSetup,
    validateData: (data: StepData) => 
      data.profile?.name && data.profile.useCase
  },
  {
    id: 'credits',
    title: 'Add Credits',
    description: 'Purchase credits to get started',
    icon: Coins,
    component: CreditPurchase,
    validateData: () => true // Credit purchase has its own validation
  },
  {
    id: 'providers',
    title: 'Provider Settings',
    description: 'Configure your provider preferences',
    icon: Cpu,
    component: ProviderPreferences,
    validateData: (data: StepData) =>
      data.providers?.selectedModels.length > 0
  },
  {
    id: 'preferences',
    title: 'System Preferences',
    description: 'Customize your experience',
    icon: Settings,
    component: SystemPreferences,
    validateData: (data: StepData) =>
      data.preferences !== undefined
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'You're ready to go',
    icon: Zap,
    component: OnboardingComplete,
    validateData: () => true
  }
];

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<StepData>({});
  const [error, setError] = useState<string | null>(null);

  const CurrentStepComponent = steps[currentStep].component;
  const isLastStep = currentStep === steps.length - 1;
  const isStepValid = steps[currentStep].validateData(stepData);

  const handleNext = async () => {
    try {
      if (isLastStep) {
        await router.push('/dashboard');
        return;
      }

      setCurrentStep(prev => prev + 1);
      setError(null);
    } catch (err) {
      setError('Failed to proceed to next step. Please try again.');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
    setError(null);
  };

  const updateStepData = (newData: Partial<StepData>) => {
    setStepData(prev => ({
      ...prev,
      ...newData
    }));
  };

  return (
    <div className="min-h-screen bg-muted/50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center space-y-2",
                  {
                    "text-primary": index === currentStep,
                    "text-muted-foreground": index !== currentStep
                  }
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-full border-2 flex items-center justify-center",
                    {
                      "border-primary bg-primary text-primary-foreground": index === currentStep,
                      "border-muted-foreground": index !== currentStep
                    }
                  )}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                <div className="text-sm font-medium">{step.title}</div>
              </div>
            ))}
          </div>

          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <CurrentStepComponent
            data={stepData}
            onUpdate={updateStepData}
            onNext={handleNext}
            onBack={handleBack}
            isValid={isStepValid}
          />
        </CardContent>

        {currentStep !== 1 && ( // Hide footer during credit purchase step
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <div>Step {currentStep + 1} of {steps.length}</div>
            <div>
              {isStepValid ? '✓ Ready to continue' : 'Please complete all required fields'}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}