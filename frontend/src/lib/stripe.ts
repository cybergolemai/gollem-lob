import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe singleton
let stripePromise: Promise<Stripe | null>;

// Initialize Stripe with your publishable key
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  }
  return stripePromise;
};

// Types for credit purchase
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  amount: number;
  currency: string;
}

// Function to create a payment intent
export const createPaymentIntent = async (amount: number): Promise<CreatePaymentIntentResponse> => {
  try {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'usd',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Function to handle card payment
export const handleCardPayment = async (
  clientSecret: string,
  card: any,
  billingDetails?: {
    name?: string;
    email?: string;
  }
) => {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe failed to initialize');
  }

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card,
      billing_details: billingDetails,
    },
  });

  if (error) {
    throw error;
  }

  return paymentIntent;
};

// Hook-friendly function to setup payment elements
export const setupStripeElements = async () => {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe failed to initialize');
  }

  const elements = stripe.elements({
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0A2540',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      },
    },
  });

  const card = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        '::placeholder': {
          color: '#6b7280',
        },
      },
    },
  });

  return { stripe, elements, card };
};

// Constants for credit calculations
export const CREDIT_RATE = 0.001; // $0.001 per credit
export const MIN_PURCHASE_AMOUNT = 1.00; // $1.00 minimum
export const MAX_PURCHASE_AMOUNT = 1000.00; // $1,000.00 maximum

// Utility function to calculate credits from amount
export const calculateCredits = (amount: number): number => {
  return Math.floor(amount / CREDIT_RATE);
};
// Utility function to validate purchase amount
export const validatePurchaseAmount = (amount: number): string | null => {
  if (amount < MIN_PURCHASE_AMOUNT) {
    return `Minimum purchase amount is $${MIN_PURCHASE_AMOUNT.toFixed(2)}`;
  }
  if (amount > MAX_PURCHASE_AMOUNT) {
    return `Maximum purchase amount is $${MAX_PURCHASE_AMOUNT.toFixed(2)}`;
  }
  return null;
};