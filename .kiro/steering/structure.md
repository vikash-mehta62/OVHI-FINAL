# Project Structure

## Root Directory Organization

```
project-root/
├── src/                    # Frontend React application
├── server/                 # Backend Node.js application
├── public/                 # Static assets (icons, images)
├── .kiro/                  # Kiro IDE configuration
├── .vscode/                # VS Code settings
├── node_modules/           # Frontend dependencies
└── [config files]          # Build and config files
```

## Frontend Structure (`src/`)

```
src/
├── components/             # Reusable UI components
│   ├── rcm/               # RCM-specific components
│   ├── payments/          # Payment-related components
│   ├── patient/           # Patient management components
│   └── settings/          # Settings components
├── pages/                 # Route-level page components
├── services/              # API service layers
│   └── operations/        # Business logic services
├── contexts/              # React context providers
├── hooks/                 # Custom React hooks
├── redux/                 # Redux store and slices
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
├── lib/                   # Third-party library configurations
└── data/                  # Static data and constants
```

## Backend Structure (`server/`)

```
server/
├── controllers/           # Request handlers (deprecated pattern)
├── services/             # Main business logic (current pattern)
│   ├── rcm/              # RCM system services
│   ├── payments/         # Payment processing services
│   ├── patients/         # Patient management services
│   └── settings/         # Application settings services
├── routes/               # Express route definitions
├── middleware/           # Custom middleware functions
├── config/               # Configuration files
├── sql/                  # Database schemas and migrations
├── utils/                # Backend utility functions
├── socketIO/             # Socket.IO event handlers
├── crons/                # Scheduled job definitions
├── docs/                 # API documentation
├── public/               # Static file serving
└── template/             # Email and document templates
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `PaymentForm.tsx`)
- **Services**: camelCase (e.g., `paymentService.js`)
- **Routes**: camelCase with suffix (e.g., `paymentRoutes.js`)
- **Controllers**: camelCase with suffix (e.g., `paymentCtrl.js`)
- **SQL files**: snake_case (e.g., `rcm_schema.sql`)

### Directory Patterns
- **Feature-based organization**: Group related files by business domain
- **Separation of concerns**: Controllers handle HTTP, services handle business logic
- **Modular structure**: Each major feature has its own subdirectory

### Import Conventions
- Use `@/` alias for src imports in frontend
- Relative imports for same-directory files
- Absolute imports for cross-module dependencies

### Configuration Files Location
- **Frontend config**: Root directory (vite.config.ts, tailwind.config.ts)
- **Backend config**: `server/config/` directory
- **Database schemas**: `server/sql/` directory
- **Environment files**: `.env` in respective directories

## Setup Scripts Location
- **Root directory**: Contains setup and test scripts
- **Naming pattern**: `setup-*.js`, `test-*.js`, `run-*.js`
- **Purpose**: System initialization and testing utilities