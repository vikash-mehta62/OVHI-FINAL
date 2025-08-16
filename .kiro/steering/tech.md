# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4+ with SWC plugin
- **UI Library**: shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS with custom animations
- **State Management**: Redux Toolkit + React Query (TanStack Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation

## Backend
- **Runtime**: Node.js with Express.js
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT with bcryptjs
- **File Upload**: Multer + AWS S3 integration
- **Real-time**: Socket.IO
- **Payment**: Stripe integration
- **PDF Generation**: jsPDF, PDFKit, Puppeteer
- **Email**: Nodemailer
- **Scheduling**: node-cron

## Development Tools
- **Package Manager**: npm (frontend), npm (backend)
- **Linting**: ESLint with TypeScript support
- **Type Checking**: TypeScript with relaxed settings
- **API Documentation**: Swagger (swagger-jsdoc, swagger-ui-express)

## Common Commands

### Frontend Development
```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development
```bash
cd server
npm run dev          # Start with nodemon
npm start            # Production start
```

### Full Stack Setup
```bash
# Setup RCM system with sample data
node setup-rcm-with-payments.js

# Setup auto specialty system
node run-auto-specialty-system.js

# Test systems
node test-rcm-complete.js
node server/test-auto-specialty.js
```

## Architecture Notes
- Frontend uses path alias `@/` for src directory
- Backend follows MVC pattern with controllers, routes, services
- Database schemas are in `server/sql/` directory
- Environment variables managed via `.env` files
- CORS enabled for cross-origin requests
- Rate limiting and security headers implemented