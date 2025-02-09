# GoLLeM Frontend

Frontend application for the GoLLeM-LOB (GPU Limit Orderbook for LLM Inference) platform. 

Built with Next.js and React, this modern web application provides a seamless interface for users to interact with our GPU marketplace. The platform enables users to place limit orders for GPU compute resources and manage their inference workloads efficiently. Our frontend implements real-time order book visualization, secure payment processing through Stripe, and comprehensive transaction history tracking. The application follows best practices for accessibility, performance, and responsive design to ensure a great user experience across all devices.

## Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Core dependencies
npm install next@latest react@latest react-dom@latest

# Data handling and API
npm install decimal.js @tanstack/react-query axios

# UI and styling
npm install @radix-ui/react-icons lucide-react recharts
npm install -D tailwindcss postcss autoprefixer
npm install -D tailwindcss-animate @tailwindcss/typography @tailwindcss/forms

# Payment processing
npm install @stripe/stripe-js @stripe/react-stripe-js

# Install shadcn/ui components
npx shadcn-ui@latest init
# NOTE TO SELF:
# npx shadcn-ui@latest add card button input alert

npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# Follow the prompts to set up your design system

# Add commonly used shadcn/ui components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## Tech Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Query
- **Payment Processing**: Stripe
- **Icons**: Lucide React
- **Charts**: Recharts

## Directory Structure

```
frontend/
├── public/               # Static assets
└── src/
    ├── components/       # Reusable UI components
    │   └── ui/          # shadcn/ui components
    ├── features/         # Feature-based components
    │   └── payments/
    │       ├── credit-purchase/
    │       ├── dashboard/
    │       └── transaction-history/
    ├── layouts/          # Layout components
    ├── lib/             # Third-party library configurations
    ├── pages/           # Page components
    ├── styles/          # Global styles
    ├── types/           # TypeScript type definitions
    └── utils/           # Utility functions
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript compiler check
- `npm test`: Run tests
- `npm run storybook`: Start Storybook development server

## Development Guide

### Component Organization

1. **Base Components** (`/components/ui`):
   - Reusable UI components from shadcn/ui
   - Keep components atomic and composable

2. **Feature Components** (`/features`):
   - Organized by domain/feature
   - Include related components, hooks, and utilities

3. **Layouts** (`/layouts`):
   - Page layouts and templates
   - Common navigation and structure

### State Management

- Use React Query for server state
- Use React Context for global UI state
- Keep component state local when possible

### Type System

1. **API Types** (`/types/api.ts`):
   - Full type coverage for all API endpoints
   - Strict decimal string handling for financial values
   - Comprehensive error type definitions
   - Realtime streaming response types

2. **Type Safety Guidelines**:
   - Use decimal strings for all financial values
   - Leverage TypeScript's strict mode
   - Follow API response type definitions
   - Use enums for status and error codes

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow design system tokens:
  - Use `--primary` for main actions
  - Use `--secondary` for supporting elements
  - Use `--destructive` for warnings/errors
  - Use `--muted` for background elements
- Dark mode support via `.dark` class
- Custom animations and transitions defined in globals.css

### API Integration

1. Use the API client:
import { api } from '@/lib/api';

// Set authentication token (e.g., after login)
api.setToken(userToken);

// Make API calls
const balance = await api.getCreditBalance();
const orderBook = await api.getOrderBookStatus('gpt4');

// For payment processing
const paymentIntent = await api.createPaymentIntent(10.00);

// For text generation
const response = await api.generateText({
  model: 'gpt4',
  prompt: 'Your prompt here',
  maxPrice: '0.001',
  maxLatency: 1000
});

## Payment Integration

### Setup Stripe

1. Install Stripe dependencies:
```bash
npm install @stripe/stripe-js
```

2. Initialize in component:
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

3. Wrap payment components:
```typescript
<Elements stripe={stripePromise}>
  <CreditPurchase />
</Elements>
```

### Credit System

- Base rate: 1 credit = $0.001 USD
- Model multipliers:
  - GPT-4 = 2x
  - GPT-3 = 1x
- GPU multipliers:
  - H100 = 2x
  - A100 = 1.5x

## Testing

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

### E2E Tests

```bash
# Start development server
npm run dev

# Run Cypress tests
npm run cypress
```

## Deployment

### Import Aliases

Use TypeScript path aliases for clean imports:
- `@/components/*` - UI components
- `@/features/*` - Feature modules
- `@/lib/*` - Third-party integrations
- `@/styles/*` - CSS modules
- `@/utils/*` - Helper functions
- `@/types/*` - Type definitions

### Production Build

```bash
# Create production build
npm run build

# Test production build locally
npm run start
```

### CI/CD Pipeline

The frontend is automatically deployed through GitHub Actions:

1. Push to `main` triggers build
2. Tests and linting run
3. Production build created
4. Assets deployed to CDN
5. Container image pushed to ECR

### Infrastructure

Frontend resources are managed in Terraform:
- CloudFront distribution
- S3 bucket for assets
- Route53 DNS records
- ACM certificate

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Create pull request

### Code Style

- Follow ESLint configuration
- Run prettier before committing
- Include component documentation
- Add unit tests for new features

## Troubleshooting

### Common Issues

1. **Stripe Integration**:
   - Check publishable key is correct
   - Ensure test mode in development
   - Verify webhook configuration

2. **API Connection**:
   - Confirm API URL is correct
   - Check CORS configuration
   - Verify authentication token

3. **Build Errors**:
   - Clear `.next` directory
   - Update dependencies
   - Check TypeScript errors

### Support

For issues:
1. Check existing GitHub issues
2. Review documentation
3. Create detailed bug report

## License

See root project license.