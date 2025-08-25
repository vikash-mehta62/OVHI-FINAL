# Frontend Development Guide

## Overview

This guide covers frontend development practices, architecture patterns, and implementation details for the RCM System's React-based user interface.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Component Development](#component-development)
5. [State Management](#state-management)
6. [Routing & Navigation](#routing--navigation)
7. [API Integration](#api-integration)
8. [Testing](#testing)
9. [Performance Optimization](#performance-optimization)
10. [Best Practices](#best-practices)

## Architecture Overview

### Technology Stack

#### Core Technologies
- **React 18**: Component-based UI framework with concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework

#### State Management
- **Redux Toolkit**: Predictable state container
- **RTK Query**: Data fetching and caching
- **React Query**: Server state management
- **Zustand**: Lightweight state management for local state

#### UI Components
- **shadcn/ui**: Modern component library
- **Radix UI**: Unstyled, accessible components
- **Lucide React**: Icon library
- **Recharts**: Chart and data visualization

#### Development Tools
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing

### Architecture Patterns

#### Component Architecture
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components
├── pages/               # Route-level page components
├── features/            # Feature-based modules
│   └── rcm/            # RCM-specific features
│       ├── components/  # Feature components
│       ├── hooks/       # Feature hooks
│       ├── services/    # Feature services
│       └── types/       # Feature types
└── shared/              # Shared utilities and components
```

#### State Architecture
```
Frontend State Management:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local State   │    │  Global State   │    │  Server State   │
│   (useState)    │    │  (Redux/Zustand)│    │  (RTK Query)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Form data     │    │ • User session  │    │ • API data      │
│ • UI state      │    │ • App settings  │    │ • Cache         │
│ • Temp data     │    │ • Navigation    │    │ • Mutations     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Development Setup

### Prerequisites
```bash
# Required software
Node.js >= 18.0.0
npm >= 8.0.0
Git >= 2.30.0

# Recommended tools
VS Code with extensions:
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Tailwind CSS IntelliSense
- ESLint
- Prettier
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/rcm-system.git
cd rcm-system

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Development Scripts
```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run dev:host         # Start dev server with network access

# Building
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run end-to-end tests
```

## Project Structure

### Directory Organization

#### Source Structure
```
src/
├── components/          # Reusable components
│   ├── ui/             # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── index.ts
│   ├── forms/          # Form components
│   │   ├── FormField.tsx
│   │   ├── FormValidation.tsx
│   │   └── index.ts
│   └── layout/         # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Layout.tsx
├── pages/              # Route components
│   ├── Dashboard.tsx
│   ├── Claims.tsx
│   ├── Payments.tsx
│   └── index.ts
├── features/           # Feature modules
│   └── rcm/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
├── hooks/              # Custom hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── index.ts
├── services/           # API services
│   ├── api.ts
│   ├── auth.ts
│   └── rcm.ts
├── store/              # State management
│   ├── index.ts
│   ├── authSlice.ts
│   └── rcmSlice.ts
├── types/              # TypeScript types
│   ├── api.ts
│   ├── auth.ts
│   └── rcm.ts
├── utils/              # Utility functions
│   ├── formatters.ts
│   ├── validators.ts
│   └── helpers.ts
├── styles/             # Global styles
│   ├── globals.css
│   └── components.css
└── lib/                # Third-party configurations
    ├── utils.ts
    └── validations.ts
```

#### File Naming Conventions
```
Components: PascalCase (UserProfile.tsx)
Hooks: camelCase with 'use' prefix (useUserData.ts)
Services: camelCase (apiService.ts)
Types: PascalCase (UserType.ts)
Utils: camelCase (formatCurrency.ts)
Constants: UPPER_SNAKE_CASE (API_ENDPOINTS.ts)
```

## Component Development

### Component Structure

#### Functional Component Template
```typescript
// UserProfile.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface UserProfileProps {
  user: User;
  className?: string;
  onEdit?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  className,
  onEdit
}) => {
  const handleEdit = () => {
    onEdit?.(user);
  };

  return (
    <div className={cn('user-profile', className)}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};

export default UserProfile;
```

#### Component with Hooks
```typescript
// ClaimsList.tsx
import React, { useState, useEffect } from 'react';
import { useClaims } from '@/hooks/useClaims';
import { ClaimCard } from './ClaimCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ClaimsListProps {
  filters?: ClaimFilters;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ filters }) => {
  const [page, setPage] = useState(1);
  const { data: claims, isLoading, error } = useClaims({ 
    filters, 
    page 
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading claims</div>;

  return (
    <div className=\"claims-list\">
      {claims?.map(claim => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
};
```

### Component Patterns

#### Compound Components
```typescript
// Modal compound component
const Modal = ({ children, ...props }) => {
  return <ModalProvider {...props}>{children}</ModalProvider>;
};

const ModalTrigger = ({ children }) => {
  const { openModal } = useModalContext();
  return <button onClick={openModal}>{children}</button>;
};

const ModalContent = ({ children }) => {
  const { isOpen, closeModal } = useModalContext();
  if (!isOpen) return null;
  return <div className=\"modal\">{children}</div>;
};

Modal.Trigger = ModalTrigger;
Modal.Content = ModalContent;

// Usage
<Modal>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Content>
    <h2>Modal Title</h2>
    <p>Modal content</p>
  </Modal.Content>
</Modal>
```

#### Render Props Pattern
```typescript
// DataFetcher with render props
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

export const DataFetcher = <T,>({ url, children }: DataFetcherProps<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData(url)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return <>{children({ data, loading, error })}</>;
};

// Usage
<DataFetcher<Claim[]> url=\"/api/claims\">
  {({ data, loading, error }) => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    return <ClaimsList claims={data} />;
  }}
</DataFetcher>
```

### Form Components

#### Form with React Hook Form
```typescript
// ClaimForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const claimSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  serviceDate: z.string().min(1, 'Service date is required'),
  amount: z.number().positive('Amount must be positive'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  procedure: z.string().min(1, 'Procedure is required'),
});

type ClaimFormData = z.infer<typeof claimSchema>;

interface ClaimFormProps {
  onSubmit: (data: ClaimFormData) => void;
  initialData?: Partial<ClaimFormData>;
}

export const ClaimForm: React.FC<ClaimFormProps> = ({
  onSubmit,
  initialData
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: initialData
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className=\"space-y-4\">
      <div>
        <label htmlFor=\"patientId\">Patient ID</label>
        <input
          {...register('patientId')}
          className=\"form-input\"
        />
        {errors.patientId && (
          <span className=\"error\">{errors.patientId.message}</span>
        )}
      </div>

      <div>
        <label htmlFor=\"serviceDate\">Service Date</label>
        <input
          type=\"date\"
          {...register('serviceDate')}
          className=\"form-input\"
        />
        {errors.serviceDate && (
          <span className=\"error\">{errors.serviceDate.message}</span>
        )}
      </div>

      <button
        type=\"submit\"
        disabled={isSubmitting}
        className=\"btn-primary\"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Claim'}
      </button>
    </form>
  );
};
```

## State Management

### Redux Toolkit Setup

#### Store Configuration
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authSlice';
import { rcmSlice } from './rcmSlice';
import { apiSlice } from './apiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    rcm: rcmSlice.reducer,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### Slice Example
```typescript
// store/rcmSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RCMState {
  selectedClaims: string[];
  filters: ClaimFilters;
  viewMode: 'list' | 'grid';
}

const initialState: RCMState = {
  selectedClaims: [],
  filters: {},
  viewMode: 'list',
};

export const rcmSlice = createSlice({
  name: 'rcm',
  initialState,
  reducers: {
    selectClaim: (state, action: PayloadAction<string>) => {
      state.selectedClaims.push(action.payload);
    },
    deselectClaim: (state, action: PayloadAction<string>) => {
      state.selectedClaims = state.selectedClaims.filter(
        id => id !== action.payload
      );
    },
    setFilters: (state, action: PayloadAction<ClaimFilters>) => {
      state.filters = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'list' | 'grid'>) => {
      state.viewMode = action.payload;
    },
  },
});

export const { selectClaim, deselectClaim, setFilters, setViewMode } = 
  rcmSlice.actions;
```

### RTK Query API Slice
```typescript
// store/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Claim', 'Payment', 'Patient'],
  endpoints: (builder) => ({
    getClaims: builder.query<Claim[], ClaimFilters>({
      query: (filters) => ({
        url: 'claims',
        params: filters,
      }),
      providesTags: ['Claim'],
    }),
    createClaim: builder.mutation<Claim, CreateClaimRequest>({
      query: (claim) => ({
        url: 'claims',
        method: 'POST',
        body: claim,
      }),
      invalidatesTags: ['Claim'],
    }),
  }),
});

export const { useGetClaimsQuery, useCreateClaimMutation } = apiSlice;
```

### Custom Hooks for State
```typescript
// hooks/useRCMState.ts
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { selectClaim, deselectClaim } from '@/store/rcmSlice';

export const useRCMState = () => {
  const dispatch = useDispatch();
  const { selectedClaims, filters, viewMode } = useSelector(
    (state: RootState) => state.rcm
  );

  const toggleClaimSelection = (claimId: string) => {
    if (selectedClaims.includes(claimId)) {
      dispatch(deselectClaim(claimId));
    } else {
      dispatch(selectClaim(claimId));
    }
  };

  return {
    selectedClaims,
    filters,
    viewMode,
    toggleClaimSelection,
  };
};
```

## API Integration

### API Service Layer
```typescript
// services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
```

### Feature-Specific API Services
```typescript
// services/rcmService.ts
import { apiService } from './api';

export class RCMService {
  // Claims
  async getClaims(filters?: ClaimFilters): Promise<Claim[]> {
    return apiService.get('/claims', { params: filters });
  }

  async getClaimById(id: string): Promise<Claim> {
    return apiService.get(`/claims/${id}`);
  }

  async createClaim(claim: CreateClaimRequest): Promise<Claim> {
    return apiService.post('/claims', claim);
  }

  async updateClaim(id: string, updates: UpdateClaimRequest): Promise<Claim> {
    return apiService.put(`/claims/${id}`, updates);
  }

  // Payments
  async getPayments(filters?: PaymentFilters): Promise<Payment[]> {
    return apiService.get('/payments', { params: filters });
  }

  async processPayment(payment: ProcessPaymentRequest): Promise<Payment> {
    return apiService.post('/payments', payment);
  }

  // Analytics
  async getDashboardData(dateRange?: DateRange): Promise<DashboardData> {
    return apiService.get('/dashboard', { params: dateRange });
  }
}

export const rcmService = new RCMService();
```

### Error Handling
```typescript
// utils/errorHandler.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    // Server responded with error status
    return new ApiError(
      error.response.status,
      error.response.data?.message || 'Server error',
      error.response.data?.code
    );
  } else if (error.request) {
    // Network error
    return new ApiError(0, 'Network error', 'NETWORK_ERROR');
  } else {
    // Other error
    return new ApiError(0, error.message, 'UNKNOWN_ERROR');
  }
};
```

## Testing

### Unit Testing with Vitest

#### Component Testing
```typescript
// __tests__/ClaimCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ClaimCard } from '../ClaimCard';

const mockClaim: Claim = {
  id: '1',
  claimNumber: 'CLM001',
  patientName: 'John Doe',
  amount: 150.00,
  status: 'pending',
  serviceDate: '2023-01-15',
};

describe('ClaimCard', () => {
  it('renders claim information correctly', () => {
    render(<ClaimCard claim={mockClaim} />);
    
    expect(screen.getByText('CLM001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<ClaimCard claim={mockClaim} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockClaim);
  });

  it('displays correct status badge', () => {
    render(<ClaimCard claim={mockClaim} />);
    
    const statusBadge = screen.getByText('pending');
    expect(statusBadge).toHaveClass('status-pending');
  });
});
```

#### Hook Testing
```typescript
// __tests__/useRCMData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useRCMData } from '../useRCMData';
import { rcmService } from '@/services/rcmService';

vi.mock('@/services/rcmService');

describe('useRCMData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches claims data successfully', async () => {
    const mockClaims = [{ id: '1', claimNumber: 'CLM001' }];
    vi.mocked(rcmService.getClaims).mockResolvedValue(mockClaims);

    const { result } = renderHook(() => useRCMData());

    await waitFor(() => {
      expect(result.current.claims).toEqual(mockClaims);
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles error states', async () => {
    const error = new Error('API Error');
    vi.mocked(rcmService.getClaims).mockRejectedValue(error);

    const { result } = renderHook(() => useRCMData());

    await waitFor(() => {
      expect(result.current.error).toBe(error);
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### Integration Testing
```typescript
// __tests__/ClaimsPage.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/store';
import { ClaimsPage } from '../ClaimsPage';
import { server } from '@/mocks/server';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ClaimsPage Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('loads and displays claims data', async () => {
    renderWithProviders(<ClaimsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('CLM001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy loading components
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ClaimsPage = lazy(() => import('@/pages/ClaimsPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));

// Route-level code splitting
const AppRoutes = () => (
  <Routes>
    <Route
      path=\"/claims\"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <ClaimsPage />
        </Suspense>
      }
    />
    <Route
      path=\"/payments\"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentsPage />
        </Suspense>
      }
    />
  </Routes>
);
```

### Memoization
```typescript
// Component memoization
import { memo, useMemo, useCallback } from 'react';

interface ClaimsListProps {
  claims: Claim[];
  onClaimSelect: (claim: Claim) => void;
}

export const ClaimsList = memo<ClaimsListProps>(({ claims, onClaimSelect }) => {
  // Memoize expensive calculations
  const sortedClaims = useMemo(() => {
    return claims.sort((a, b) => 
      new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
    );
  }, [claims]);

  // Memoize callback functions
  const handleClaimClick = useCallback((claim: Claim) => {
    onClaimSelect(claim);
  }, [onClaimSelect]);

  return (
    <div>
      {sortedClaims.map(claim => (
        <ClaimCard
          key={claim.id}
          claim={claim}
          onClick={handleClaimClick}
        />
      ))}
    </div>
  );
});
```

### Virtual Scrolling
```typescript
// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';

interface VirtualClaimsListProps {
  claims: Claim[];
  height: number;
}

const ClaimRow = ({ index, style, data }: any) => (
  <div style={style}>
    <ClaimCard claim={data[index]} />
  </div>
);

export const VirtualClaimsList: React.FC<VirtualClaimsListProps> = ({
  claims,
  height
}) => (
  <List
    height={height}
    itemCount={claims.length}
    itemSize={100}
    itemData={claims}
  >
    {ClaimRow}
  </List>
);
```

## Best Practices

### Component Best Practices

#### 1. Single Responsibility
```typescript
// Good: Component has single responsibility
const UserAvatar = ({ user, size = 'md' }) => (
  <img
    src={user.avatar}
    alt={user.name}
    className={`avatar avatar-${size}`}
  />
);

// Bad: Component doing too many things
const UserProfile = ({ user }) => (
  <div>
    <img src={user.avatar} alt={user.name} />
    <h2>{user.name}</h2>
    <form onSubmit={handleSubmit}>
      {/* Complex form logic */}
    </form>
    <div>
      {/* Complex analytics */}
    </div>
  </div>
);
```

#### 2. Prop Validation
```typescript
// Use TypeScript interfaces for prop validation
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick
}) => {
  // Component implementation
};
```

#### 3. Error Boundaries
```typescript
// Error boundary for graceful error handling
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

### Performance Best Practices

#### 1. Avoid Inline Objects and Functions
```typescript
// Bad: Creates new objects on every render
const MyComponent = () => (
  <ChildComponent
    style={{ marginTop: 10 }}
    onClick={() => console.log('clicked')}
  />
);

// Good: Define outside or use useMemo/useCallback
const style = { marginTop: 10 };

const MyComponent = () => {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return (
    <ChildComponent
      style={style}
      onClick={handleClick}
    />
  );
};
```

#### 2. Optimize Re-renders
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = memo(({ data, onUpdate }) => {
  // Expensive rendering logic
  return <div>{/* Complex UI */}</div>;
});

// Use useMemo for expensive calculations
const MyComponent = ({ items }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + item.value, 0);
  }, [items]);

  return <div>{expensiveValue}</div>;
};
```

### Code Organization Best Practices

#### 1. Barrel Exports
```typescript
// components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { Card } from './Card';

// Usage
import { Button, Input, Modal } from '@/components';
```

#### 2. Custom Hooks
```typescript
// Extract reusable logic into custom hooks
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
};
```

#### 3. Type Safety
```typescript
// Use strict TypeScript configuration
// Define comprehensive types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Use generic types for reusability
const useApiQuery = <T>(url: string): {
  data: T | null;
  loading: boolean;
  error: string | null;
} => {
  // Implementation
};
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Document Owner**: Frontend Development Team