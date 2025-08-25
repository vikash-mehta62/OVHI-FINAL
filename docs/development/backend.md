# Backend Development Guide

## Overview

This guide covers backend development practices, architecture patterns, and implementation details for the RCM System's Node.js/Express-based API server.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [API Development](#api-development)
5. [Database Management](#database-management)
6. [Authentication & Authorization](#authentication--authorization)
7. [Testing](#testing)
8. [Performance Optimization](#performance-optimization)
9. [Security](#security)
10. [Best Practices](#best-practices)

## Architecture Overview

### Technology Stack

#### Core Technologies
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **TypeScript**: Type-safe JavaScript (optional)
- **MySQL**: Relational database management system

#### Key Libraries
- **Authentication**: jsonwebtoken, bcryptjs, passport
- **Validation**: joi, express-validator
- **Database**: mysql2, sequelize (ORM)
- **Testing**: jest, supertest, sinon
- **Documentation**: swagger-jsdoc, swagger-ui-express
- **Monitoring**: winston (logging), helmet (security)

#### Development Tools
- **Process Manager**: PM2, nodemon
- **Code Quality**: ESLint, Prettier
- **API Testing**: Postman, Insomnia
- **Database Tools**: MySQL Workbench, phpMyAdmin

### Architecture Patterns

#### Layered Architecture
```
┌─────────────────┐
│   Controllers   │  ← HTTP request handling
├─────────────────┤
│    Services     │  ← Business logic
├─────────────────┤
│  Data Access    │  ← Database operations
├─────────────────┤
│    Database     │  ← Data persistence
└─────────────────┘
```

#### MVC Pattern
```
server/
├── controllers/     # Request handlers (Controller)
├── services/        # Business logic (Model)
├── routes/          # Route definitions
├── middleware/      # Custom middleware
├── models/          # Database models
├── utils/           # Utility functions
└── config/          # Configuration files
```

## Development Setup

### Prerequisites
```bash
# Required software
Node.js >= 18.0.0
npm >= 8.0.0
MySQL >= 8.0.0
Git >= 2.30.0

# Optional tools
Docker >= 20.0.0
Redis >= 6.0.0 (for caching)
```

### Initial Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
mysql -u root -p
CREATE DATABASE rcm_system;
CREATE DATABASE rcm_system_test;

# Run database migrations
npm run migrate

# Seed sample data (optional)
npm run seed

# Start development server
npm run dev
```

### Development Scripts
```bash
# Development
npm run dev              # Start with nodemon (auto-restart)
npm start                # Start production server

# Database
npm run migrate          # Run database migrations
npm run migrate:rollback # Rollback last migration
npm run seed             # Seed sample data
npm run db:reset         # Reset database (drop/create/migrate/seed)

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:integration # Run integration tests only

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier

# Documentation
npm run docs:generate    # Generate API documentation
npm run docs:serve       # Serve documentation locally
```

## Project Structure

### Directory Organization

#### Server Structure
```
server/
├── config/              # Configuration files
│   ├── database.js      # Database configuration
│   ├── auth.js          # Authentication configuration
│   └── app.js           # Application configuration
├── controllers/         # HTTP request handlers
│   ├── authCtrl.js      # Authentication controller
│   ├── rcmCtrl.js       # RCM controller
│   └── userCtrl.js      # User controller
├── services/            # Business logic layer
│   ├── auth/            # Authentication services
│   ├── rcm/             # RCM services
│   └── users/           # User services
├── routes/              # Route definitions
│   ├── auth.js          # Authentication routes
│   ├── rcm.js           # RCM routes
│   └── users.js         # User routes
├── middleware/          # Custom middleware
│   ├── auth.js          # Authentication middleware
│   ├── validation.js    # Validation middleware
│   ├── errorHandler.js  # Error handling middleware
│   └── logging.js       # Logging middleware
├── models/              # Database models
│   ├── User.js          # User model
│   ├── Claim.js         # Claim model
│   └── Payment.js       # Payment model
├── utils/               # Utility functions
│   ├── database.js      # Database utilities
│   ├── encryption.js    # Encryption utilities
│   └── validators.js    # Validation utilities
├── migrations/          # Database migrations
├── seeders/             # Database seeders
├── tests/               # Test files
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── fixtures/        # Test data
├── docs/                # API documentation
├── logs/                # Application logs
└── app.js               # Application entry point
```

#### File Naming Conventions
```
Controllers: camelCase with 'Ctrl' suffix (userCtrl.js)
Services: camelCase with 'Service' suffix (userService.js)
Routes: camelCase (userRoutes.js)
Models: PascalCase (User.js)
Middleware: camelCase (authMiddleware.js)
Utils: camelCase (dbUtils.js)
Tests: camelCase with '.test.js' suffix (user.test.js)
```

## API Development

### Express Application Setup

#### Basic App Configuration
```javascript
// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/rcm', require('./routes/rcm'));
app.use('/api/v1/users', require('./routes/users'));

// Error handling middleware
app.use(require('./middleware/errorHandler'));

module.exports = app;
```

### Controller Pattern

#### Standard Controller Structure
```javascript
// controllers/rcmCtrl.js
const { rcmService } = require('../services/rcm/rcmService');
const { validationResult } = require('express-validator');
const { ApiResponse } = require('../utils/apiResponse');

class RCMController {
  // Get claims with filtering and pagination
  async getClaims(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', errors.array())
        );
      }

      // Extract query parameters
      const {
        page = 1,
        limit = 20,
        status,
        patientId,
        providerId,
        startDate,
        endDate
      } = req.query;

      // Build filters
      const filters = {
        ...(status && { status }),
        ...(patientId && { patientId }),
        ...(providerId && { providerId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      // Get claims from service
      const result = await rcmService.getClaims({
        filters,
        pagination: { page: parseInt(page), limit: parseInt(limit) }
      });

      res.json(ApiResponse.success(result));
    } catch (error) {
      next(error);
    }
  }

  // Create new claim
  async createClaim(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', errors.array())
        );
      }

      const claimData = {
        ...req.body,
        createdBy: req.user.id
      };

      const claim = await rcmService.createClaim(claimData);
      
      res.status(201).json(ApiResponse.success(claim, 'Claim created successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Update claim
  async updateClaim(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const claim = await rcmService.updateClaim(id, updates, req.user.id);
      
      res.json(ApiResponse.success(claim, 'Claim updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Delete claim
  async deleteClaim(req, res, next) {
    try {
      const { id } = req.params;
      
      await rcmService.deleteClaim(id, req.user.id);
      
      res.json(ApiResponse.success(null, 'Claim deleted successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RCMController();
```

### Service Layer Pattern

#### Business Logic Service
```javascript
// services/rcm/rcmService.js
const { ClaimModel } = require('../../models/Claim');
const { PaymentModel } = require('../../models/Payment');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const { dbUtils } = require('../../utils/database');

class RCMService {
  // Get claims with advanced filtering
  async getClaims({ filters = {}, pagination = {} }) {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereClause = this.buildWhereClause(filters);
    
    // Execute query with pagination
    const [claims, total] = await Promise.all([
      ClaimModel.findAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [
          { model: PatientModel, as: 'patient' },
          { model: ProviderModel, as: 'provider' }
        ]
      }),
      ClaimModel.count({ where: whereClause })
    ]);

    return {
      claims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Create new claim with validation
  async createClaim(claimData) {
    // Validate business rules
    await this.validateClaimData(claimData);

    // Start transaction
    const transaction = await dbUtils.beginTransaction();

    try {
      // Create claim
      const claim = await ClaimModel.create(claimData, { transaction });

      // Generate claim number
      const claimNumber = await this.generateClaimNumber(claim.id);
      await claim.update({ claimNumber }, { transaction });

      // Create audit log
      await this.createAuditLog({
        action: 'CREATE_CLAIM',
        entityId: claim.id,
        userId: claimData.createdBy,
        details: claimData
      }, transaction);

      await transaction.commit();
      
      return claim;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Update claim with business logic
  async updateClaim(claimId, updates, userId) {
    const claim = await ClaimModel.findByPk(claimId);
    
    if (!claim) {
      throw new NotFoundError('Claim not found');
    }

    // Check if claim can be updated
    if (!this.canUpdateClaim(claim)) {
      throw new ValidationError('Claim cannot be updated in current status');
    }

    const transaction = await dbUtils.beginTransaction();

    try {
      // Update claim
      await claim.update(updates, { transaction });

      // Create audit log
      await this.createAuditLog({
        action: 'UPDATE_CLAIM',
        entityId: claimId,
        userId,
        details: { before: claim.dataValues, after: updates }
      }, transaction);

      await transaction.commit();
      
      return claim;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Private helper methods
  buildWhereClause(filters) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    
    if (filters.startDate && filters.endDate) {
      where.serviceDate = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    }
    
    return where;
  }

  async validateClaimData(claimData) {
    // Validate patient exists
    const patient = await PatientModel.findByPk(claimData.patientId);
    if (!patient) {
      throw new ValidationError('Patient not found');
    }

    // Validate provider exists
    const provider = await ProviderModel.findByPk(claimData.providerId);
    if (!provider) {
      throw new ValidationError('Provider not found');
    }

    // Validate service date
    if (new Date(claimData.serviceDate) > new Date()) {
      throw new ValidationError('Service date cannot be in the future');
    }

    // Additional business rule validations...
  }

  canUpdateClaim(claim) {
    const nonUpdatableStatuses = ['paid', 'closed', 'cancelled'];
    return !nonUpdatableStatuses.includes(claim.status);
  }

  async generateClaimNumber(claimId) {
    const prefix = 'CLM';
    const paddedId = claimId.toString().padStart(6, '0');
    return `${prefix}${paddedId}`;
  }
}

module.exports = new RCMService();
```

### Route Definition

#### RESTful Route Structure
```javascript
// routes/rcm.js
const express = require('express');
const { body, query, param } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/role');
const rcmController = require('../controllers/rcmCtrl');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Claims routes
router.get('/claims',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'approved', 'denied', 'paid']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  rcmController.getClaims
);

router.post('/claims',
  roleMiddleware(['admin', 'specialist']),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('providerId').notEmpty().withMessage('Provider ID is required'),
    body('serviceDate').isISO8601().withMessage('Valid service date is required'),
    body('diagnosis').notEmpty().withMessage('Diagnosis is required'),
    body('procedure').notEmpty().withMessage('Procedure is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive')
  ],
  rcmController.createClaim
);

router.get('/claims/:id',
  param('id').isUUID().withMessage('Valid claim ID is required'),
  rcmController.getClaimById
);

router.put('/claims/:id',
  roleMiddleware(['admin', 'specialist']),
  [
    param('id').isUUID().withMessage('Valid claim ID is required'),
    body('amount').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['pending', 'approved', 'denied', 'paid'])
  ],
  rcmController.updateClaim
);

router.delete('/claims/:id',
  roleMiddleware(['admin']),
  param('id').isUUID().withMessage('Valid claim ID is required'),
  rcmController.deleteClaim
);

// Payment routes
router.get('/payments', rcmController.getPayments);
router.post('/payments', rcmController.processPayment);

// Analytics routes
router.get('/dashboard', rcmController.getDashboardData);
router.get('/analytics/performance', rcmController.getPerformanceMetrics);

module.exports = router;
```

### Middleware Development

#### Authentication Middleware
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { UserModel } = require('../models/User');
const { ApiResponse } = require('../utils/apiResponse');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(
        ApiResponse.error('Access denied. No token provided.')
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json(
        ApiResponse.error('Invalid token.')
      );
    }

    if (!user.isActive) {
      return res.status(401).json(
        ApiResponse.error('Account is deactivated.')
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        ApiResponse.error('Invalid token.')
      );
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        ApiResponse.error('Token expired.')
      );
    }

    next(error);
  }
};

module.exports = { authMiddleware };
```

#### Error Handling Middleware
```javascript
// middleware/errorHandler.js
const { ApiResponse } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

const errorHandler = (error, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponse.error('Validation failed', error.details)
    );
  }

  if (error.name === 'NotFoundError') {
    return res.status(404).json(
      ApiResponse.error(error.message)
    );
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json(
      ApiResponse.error('Unauthorized access')
    );
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json(
      ApiResponse.error('Forbidden access')
    );
  }

  // Database errors
  if (error.name === 'SequelizeValidationError') {
    const errors = error.errors.map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json(
      ApiResponse.error('Database validation failed', errors)
    );
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json(
      ApiResponse.error('Resource already exists')
    );
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json(
    ApiResponse.error(message)
  );
};

module.exports = errorHandler;
```

## Database Management

### Database Configuration

#### Connection Setup
```javascript
// config/database.js
const mysql = require('mysql2/promise');

const dbConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rcm_system',
    charset: 'utf8mb4',
    timezone: '+00:00',
    pool: {
      min: 0,
      max: 10,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_TEST_NAME || 'rcm_system_test',
    charset: 'utf8mb4',
    timezone: '+00:00',
    logging: false
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: '+00:00',
    pool: {
      min: 5,
      max: 20,
      acquire: 60000,
      idle: 10000
    },
    ssl: process.env.DB_SSL === 'true'
  }
};

module.exports = dbConfig[process.env.NODE_ENV || 'development'];
```

### Database Models

#### Sequelize Model Example
```javascript
// models/Claim.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Claim = sequelize.define('Claim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  claimNumber: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  providerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'providers',
      key: 'id'
    }
  },
  serviceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  diagnosis: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  procedure: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'approved', 'denied', 'paid', 'closed'),
    defaultValue: 'pending'
  },
  submissionDate: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'claims',
  timestamps: true,
  paranoid: true, // Soft deletes
  indexes: [
    {
      fields: ['patientId']
    },
    {
      fields: ['providerId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['serviceDate']
    },
    {
      fields: ['claimNumber'],
      unique: true
    }
  ]
});

// Model associations
Claim.associate = (models) => {
  Claim.belongsTo(models.Patient, {
    foreignKey: 'patientId',
    as: 'patient'
  });
  
  Claim.belongsTo(models.Provider, {
    foreignKey: 'providerId',
    as: 'provider'
  });
  
  Claim.hasMany(models.Payment, {
    foreignKey: 'claimId',
    as: 'payments'
  });
  
  Claim.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

// Instance methods
Claim.prototype.getRemainingBalance = function() {
  return this.totalAmount - this.paidAmount;
};

Claim.prototype.canBeUpdated = function() {
  const nonUpdatableStatuses = ['paid', 'closed'];
  return !nonUpdatableStatuses.includes(this.status);
};

// Class methods
Claim.findByClaimNumber = function(claimNumber) {
  return this.findOne({ where: { claimNumber } });
};

module.exports = Claim;
```

### Database Migrations

#### Migration Example
```javascript
// migrations/20240115000001-create-claims-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('claims', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      claimNumber: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: false
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      providerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'providers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      serviceDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      diagnosis: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      procedure: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      paidAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('pending', 'submitted', 'approved', 'denied', 'paid', 'closed'),
        defaultValue: 'pending'
      },
      submissionDate: {
        type: Sequelize.DATE
      },
      notes: {
        type: Sequelize.TEXT
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('claims', ['patientId']);
    await queryInterface.addIndex('claims', ['providerId']);
    await queryInterface.addIndex('claims', ['status']);
    await queryInterface.addIndex('claims', ['serviceDate']);
    await queryInterface.addIndex('claims', ['claimNumber'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('claims');
  }
};
```

## Testing

### Unit Testing

#### Service Testing
```javascript
// tests/unit/rcmService.test.js
const { RCMService } = require('../../services/rcm/rcmService');
const { ClaimModel } = require('../../models/Claim');
const { ValidationError, NotFoundError } = require('../../utils/errors');

// Mock dependencies
jest.mock('../../models/Claim');
jest.mock('../../utils/database');

describe('RCMService', () => {
  let rcmService;

  beforeEach(() => {
    rcmService = new RCMService();
    jest.clearAllMocks();
  });

  describe('getClaims', () => {
    it('should return paginated claims', async () => {
      const mockClaims = [
        { id: '1', claimNumber: 'CLM001' },
        { id: '2', claimNumber: 'CLM002' }
      ];

      ClaimModel.findAll.mockResolvedValue(mockClaims);
      ClaimModel.count.mockResolvedValue(2);

      const result = await rcmService.getClaims({
        pagination: { page: 1, limit: 10 }
      });

      expect(result.claims).toEqual(mockClaims);
      expect(result.pagination.total).toBe(2);
      expect(ClaimModel.findAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        include: expect.any(Array)
      });
    });

    it('should apply filters correctly', async () => {
      const filters = { status: 'pending', patientId: '123' };
      
      ClaimModel.findAll.mockResolvedValue([]);
      ClaimModel.count.mockResolvedValue(0);

      await rcmService.getClaims({ filters });

      expect(ClaimModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'pending', patientId: '123' }
        })
      );
    });
  });

  describe('createClaim', () => {
    it('should create claim successfully', async () => {
      const claimData = {
        patientId: '123',
        providerId: '456',
        serviceDate: '2023-01-15',
        diagnosis: 'Z00.00',
        procedure: '99213',
        totalAmount: 150.00,
        createdBy: 'user123'
      };

      const mockClaim = { id: '1', ...claimData };
      
      // Mock validations
      jest.spyOn(rcmService, 'validateClaimData').mockResolvedValue();
      
      // Mock database operations
      ClaimModel.create.mockResolvedValue(mockClaim);
      mockClaim.update = jest.fn().mockResolvedValue();
      
      const result = await rcmService.createClaim(claimData);

      expect(rcmService.validateClaimData).toHaveBeenCalledWith(claimData);
      expect(ClaimModel.create).toHaveBeenCalledWith(claimData, expect.any(Object));
      expect(result).toEqual(mockClaim);
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { patientId: null };
      
      jest.spyOn(rcmService, 'validateClaimData')
        .mockRejectedValue(new ValidationError('Patient ID is required'));

      await expect(rcmService.createClaim(invalidData))
        .rejects.toThrow('Patient ID is required');
    });
  });

  describe('updateClaim', () => {
    it('should update claim successfully', async () => {
      const claimId = '1';
      const updates = { status: 'approved' };
      const userId = 'user123';

      const mockClaim = {
        id: claimId,
        status: 'pending',
        update: jest.fn().mockResolvedValue()
      };

      ClaimModel.findByPk.mockResolvedValue(mockClaim);
      jest.spyOn(rcmService, 'canUpdateClaim').mockReturnValue(true);

      const result = await rcmService.updateClaim(claimId, updates, userId);

      expect(ClaimModel.findByPk).toHaveBeenCalledWith(claimId);
      expect(mockClaim.update).toHaveBeenCalledWith(updates, expect.any(Object));
      expect(result).toEqual(mockClaim);
    });

    it('should throw error for non-existent claim', async () => {
      ClaimModel.findByPk.mockResolvedValue(null);

      await expect(rcmService.updateClaim('999', {}, 'user123'))
        .rejects.toThrow('Claim not found');
    });
  });
});
```

### Integration Testing

#### API Endpoint Testing
```javascript
// tests/integration/rcm.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../config/database');
const { UserModel } = require('../../models/User');
const { ClaimModel } = require('../../models/Claim');

describe('RCM API Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Set up test database
    await sequelize.sync({ force: true });
    
    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await ClaimModel.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/rcm/claims', () => {
    it('should return empty array when no claims exist', async () => {
      const response = await request(app)
        .get('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should return claims with pagination', async () => {
      // Create test claims
      const claims = await Promise.all([
        ClaimModel.create({
          claimNumber: 'CLM001',
          patientId: 'patient1',
          providerId: 'provider1',
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          totalAmount: 150.00,
          createdBy: testUser.id
        }),
        ClaimModel.create({
          claimNumber: 'CLM002',
          patientId: 'patient2',
          providerId: 'provider1',
          serviceDate: '2023-01-16',
          diagnosis: 'Z00.01',
          procedure: '99214',
          totalAmount: 200.00,
          createdBy: testUser.id
        })
      ]);

      const response = await request(app)
        .get('/api/v1/rcm/claims?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter claims by status', async () => {
      // Create claims with different statuses
      await Promise.all([
        ClaimModel.create({
          claimNumber: 'CLM001',
          patientId: 'patient1',
          providerId: 'provider1',
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          totalAmount: 150.00,
          status: 'pending',
          createdBy: testUser.id
        }),
        ClaimModel.create({
          claimNumber: 'CLM002',
          patientId: 'patient2',
          providerId: 'provider1',
          serviceDate: '2023-01-16',
          diagnosis: 'Z00.01',
          procedure: '99214',
          totalAmount: 200.00,
          status: 'approved',
          createdBy: testUser.id
        })
      ]);

      const response = await request(app)
        .get('/api/v1/rcm/claims?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.claims).toHaveLength(1);
      expect(response.body.data.claims[0].status).toBe('pending');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/rcm/claims')
        .expect(401);
    });
  });

  describe('POST /api/v1/rcm/claims', () => {
    it('should create claim successfully', async () => {
      const claimData = {
        patientId: 'patient1',
        providerId: 'provider1',
        serviceDate: '2023-01-15',
        diagnosis: 'Z00.00',
        procedure: '99213',
        amount: 150.00
      };

      const response = await request(app)
        .post('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .send(claimData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claimNumber).toMatch(/^CLM\d+$/);
      expect(response.body.data.status).toBe('pending');

      // Verify claim was created in database
      const claim = await ClaimModel.findOne({
        where: { claimNumber: response.body.data.claimNumber }
      });
      expect(claim).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        patientId: '',
        providerId: 'provider1'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
```

## Performance Optimization

### Database Optimization

#### Query Optimization
```javascript
// Optimized query with proper indexing and joins
const getClaimsWithDetails = async (filters) => {
  return await ClaimModel.findAll({
    where: filters,
    include: [
      {
        model: PatientModel,
        as: 'patient',
        attributes: ['id', 'firstName', 'lastName', 'dateOfBirth'],
        required: true
      },
      {
        model: ProviderModel,
        as: 'provider',
        attributes: ['id', 'name', 'npi'],
        required: true
      },
      {
        model: PaymentModel,
        as: 'payments',
        attributes: ['id', 'amount', 'paymentDate'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });
};

// Use raw queries for complex analytics
const getRevenueAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      DATE_FORMAT(service_date, '%Y-%m') as month,
      COUNT(*) as claim_count,
      SUM(total_amount) as total_revenue,
      SUM(paid_amount) as collected_revenue,
      AVG(total_amount) as avg_claim_amount
    FROM claims 
    WHERE service_date BETWEEN ? AND ?
      AND deleted_at IS NULL
    GROUP BY DATE_FORMAT(service_date, '%Y-%m')
    ORDER BY month DESC
  `;

  const [results] = await sequelize.query(query, {
    replacements: [startDate, endDate],
    type: QueryTypes.SELECT
  });

  return results;
};
```

#### Connection Pooling
```javascript
// Optimized database connection pool
const sequelize = new Sequelize(database, username, password, {
  host: host,
  dialect: 'mysql',
  pool: {
    max: 20,          // Maximum connections
    min: 5,           // Minimum connections
    acquire: 60000,   // Maximum time to get connection
    idle: 10000,      // Maximum idle time
    evict: 1000       // Check for idle connections interval
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  benchmark: true,
  retry: {
    max: 3
  }
});
```

### Caching Strategies

#### Redis Caching
```javascript
// utils/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

class CacheService {
  async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
}

module.exports = new CacheService();
```

#### Caching Middleware
```javascript
// middleware/cache.js
const { cacheService } = require('../utils/cache');

const cacheMiddleware = (ttl = 3600) => {
  return async (req, res, next) => {
    // Generate cache key based on URL and query parameters
    const cacheKey = `api:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode === 200) {
          cacheService.set(cacheKey, data, ttl);
        }
        
        // Call original method
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = { cacheMiddleware };
```

## Best Practices

### Code Organization

#### Service Layer Pattern
```javascript
// Good: Separate business logic into services
class UserService {
  async createUser(userData) {
    // Validation
    await this.validateUserData(userData);
    
    // Business logic
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Database operation
    const user = await UserModel.create({
      ...userData,
      password: hashedPassword
    });
    
    // Post-creation tasks
    await this.sendWelcomeEmail(user);
    
    return user;
  }
}

// Bad: Business logic in controller
const createUser = async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await UserModel.create({
    ...req.body,
    password: hashedPassword
  });
  // Send email logic here...
  res.json(user);
};
```

#### Error Handling
```javascript
// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// Usage in services
const getUserById = async (id) => {
  const user = await UserModel.findByPk(id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  return user;
};
```

#### Input Validation
```javascript
// Validation schemas with Joi
const Joi = require('joi');

const claimValidationSchema = {
  create: Joi.object({
    patientId: Joi.string().uuid().required(),
    providerId: Joi.string().uuid().required(),
    serviceDate: Joi.date().max('now').required(),
    diagnosis: Joi.string().pattern(/^[A-Z]\d{2}(\.\d{1,2})?$/).required(),
    procedure: Joi.string().pattern(/^\d{5}$/).required(),
    amount: Joi.number().positive().precision(2).required(),
    notes: Joi.string().max(1000).optional()
  }),
  
  update: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'denied', 'paid').optional(),
    amount: Joi.number().positive().precision(2).optional(),
    notes: Joi.string().max(1000).optional()
  })
};

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json(
        ApiResponse.error('Validation failed', details)
      );
    }
    
    next();
  };
};
```

### Security Best Practices

#### Input Sanitization
```javascript
const xss = require('xss');
const validator = require('validator');

const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
        obj[key] = validator.escape(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};
```

#### SQL Injection Prevention
```javascript
// Always use parameterized queries
const getUserByEmail = async (email) => {
  // Good: Parameterized query
  const user = await UserModel.findOne({
    where: { email: email }
  });
  
  // Or with raw query
  const [results] = await sequelize.query(
    'SELECT * FROM users WHERE email = ?',
    {
      replacements: [email],
      type: QueryTypes.SELECT
    }
  );
  
  return user;
};

// Bad: String concatenation (vulnerable to SQL injection)
const badQuery = `SELECT * FROM users WHERE email = '${email}'`;
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Document Owner**: Backend Development Team