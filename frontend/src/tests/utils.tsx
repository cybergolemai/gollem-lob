import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';

// Create a custom render function that includes providers
function render(ui: React.ReactElement, { ...options } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Mock the window.matchMedia function
function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock IntersectionObserver
function mockIntersectionObserver() {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })),
  });
}

// Create test data builders
const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  ...overrides,
});

const createMockTransaction = (overrides = {}) => ({
  transaction_id: 'test-transaction-id',
  user_id: 'test-user-id',
  amount: '100',
  balance_after: '1000',
  type: 'TRANSACTION_TYPE_PURCHASE',
  timestamp: Date.now(),
  payment_status: 'PAYMENT_STATUS_SUCCEEDED',
  ...overrides,
});

// Test waitFor utilities
const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export {
  render,
  mockMatchMedia,
  mockIntersectionObserver,
  createMockUser,
  createMockTransaction,
  waitForLoadingToFinish,
};