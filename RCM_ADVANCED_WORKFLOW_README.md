# RCM Advanced Workflow System

A comprehensive, AI-powered Revenue Cycle Management platform that automates and optimizes the entire medical billing process from claim creation to payment collection.

## 🚀 Features

### 1. AR Aging Intelligence System
- **AI-Powered Analysis**: Machine learning algorithms predict collection probability for each account
- **Risk Scoring**: Automatic categorization of accounts into risk levels (low, medium, high, critical)
- **Automated Actions**: Trigger collection workflows based on configurable thresholds
- **Interactive Dashboard**: Drill-down analytics with aging bucket visualization

### 2. ClaimMD Connector Integration
- **Seamless Integration**: Direct API integration with ClaimMD clearinghouse services
- **Real-time Status**: Automatic claim status synchronization
- **Error Management**: Comprehensive error tracking and resolution
- **ERA Processing**: Automated Electronic Remittance Advice download and processing

### 3. Collection Workflow Manager
- **Automated Workflows**: Configurable collection processes (standard, aggressive, gentle)
- **Smart Statements**: Personalized patient statements with payment options
- **Payment Plans**: Automated payment plan setup and management
- **Multi-channel Communication**: Email, SMS, and mail integration

### 4. Denial Management Workflow
- **Intelligent Categorization**: Automatic denial categorization by reason codes
- **Resolution Suggestions**: AI-powered resolution recommendations based on historical success rates
- **Appeal Generation**: Automated appeal letter creation with supporting documentation
- **Outcome Tracking**: Success rate monitoring and pattern analysis

### 5. EDI Transaction Manager
- **Multi-format Support**: Handle all standard EDI transaction types (837, 835, 276, 277, 270, 271)
- **Comprehensive Validation**: Syntax and business rule validation before transmission
- **Secure Transmission**: HIPAA-compliant EDI communication
- **Compliance Monitoring**: Automatic updates to new EDI standards

### 6. Enhanced Eligibility Checker
- **Real-time Verification**: Multi-payer eligibility checking with comprehensive coverage details
- **Prior Authorization**: Automated prior auth requirement identification and workflow
- **Intelligent Caching**: Performance optimization with smart caching strategies
- **Coverage Analysis**: Detailed copay, deductible, and limitation information

### 7. ERA Processor
- **Automated Processing**: Multi-format ERA file parsing and validation
- **Advanced Matching**: Intelligent payment matching using multiple algorithms
- **Auto-posting**: Automated payment and adjustment posting
- **Variance Analysis**: Detailed reporting of unmatched items and discrepancies

### 8. Intelligent Claims Scrubbers
- **AI Validation**: Machine learning-powered pre-submission claim validation
- **Error Correction**: Automatic error detection and correction suggestions
- **Quality Scoring**: Comprehensive claim quality assessment
- **Learning System**: Continuous improvement from denial patterns

### 9. Patient Financial Portal
- **Self-service Portal**: Secure patient account access and management
- **Multiple Payment Methods**: Credit card, ACH, and payment plan options
- **Secure Messaging**: HIPAA-compliant communication with billing staff
- **Document Access**: Statement and document download capabilities

### 10. Payment Posting Engine
- **Multi-source Processing**: Handle payments from insurance, patients, and other sources
- **Complex Scenarios**: Advanced allocation for partial payments and adjustments
- **Overpayment Management**: Automatic detection and refund processing
- **Audit Trail**: Comprehensive posting history and reporting

### 11. Revenue Forecasting System
- **Predictive Analytics**: ML-based revenue projections with confidence intervals
- **Trend Analysis**: Historical pattern identification and analysis
- **Scenario Modeling**: Business planning with multiple scenario support
- **Cash Flow Forecasting**: Payment timing predictions based on historical data

## 📋 Prerequisites

- Node.js 16+ and npm
- MySQL 8.0+
- Redis (for caching)
- AWS S3 (for document storage)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ovhi-platform
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd server
   npm install
   ```

3. **Environment Configuration**
   Create `.env` file in the server directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=ovhi_db
   
   # ClaimMD Configuration
   CLAIMMD_API_URL=https://api.claimmd.com/v1
   CLAIMMD_API_KEY=your_claimmd_api_key
   CLAIMMD_CLIENT_ID=your_client_id
   
   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=your_bucket_name
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   ```

4. **Database Setup**
   ```bash
   # Run the setup script
   node setup-rcm-advanced-workflow.js
   ```

5. **Start the Application**
   ```bash
   # Start backend server
   cd server
   npm run dev
   
   # Start frontend (in another terminal)
   npm run dev
   ```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Full system test
node test-rcm-advanced-workflow.js

# Test specific components
node test-rcm-advanced-workflow.js ar-aging
node test-rcm-advanced-workflow.js claimmd
```

## 📚 API Documentation

### AR Aging Intelligence

#### Analyze AR Accounts
```http
GET /api/v1/rcm-advanced/ar-aging/analyze
```

Query Parameters:
- `providerId` (optional): Filter by provider
- `payerId` (optional): Filter by payer
- `minBalance` (optional): Minimum balance threshold

#### Predict Collection Probability
```http
GET /api/v1/rcm-advanced/ar-aging/predict/{accountId}
```

#### Trigger Automated Actions
```http
POST /api/v1/rcm-advanced/ar-aging/trigger-actions
```

Request Body:
```json
{
  "riskScoreThreshold": 80,
  "balanceThreshold": 1000,
  "daysOutstandingThreshold": 90
}
```

### ClaimMD Connector

#### Submit Claim
```http
POST /api/v1/rcm-advanced/claimmd/submit
```

#### Get Claim Status
```http
GET /api/v1/rcm-advanced/claimmd/status/{claimMDId}
```

#### Validate Claim
```http
POST /api/v1/rcm-advanced/claimmd/validate
```

### Collection Workflow Manager

#### Initiate Workflow
```http
POST /api/v1/rcm-advanced/collection/initiate
```

Request Body:
```json
{
  "accountId": 123,
  "workflowType": "standard"
}
```

#### Generate Statement
```http
POST /api/v1/rcm-advanced/collection/statement/{accountId}
```

#### Setup Payment Plan
```http
POST /api/v1/rcm-advanced/collection/payment-plan
```

### Denial Management

#### Categorize Denial
```http
POST /api/v1/rcm-advanced/denial/categorize
```

#### Generate Appeal
```http
POST /api/v1/rcm-advanced/denial/generate-appeal
```

#### Analyze Patterns
```http
GET /api/v1/rcm-advanced/denial/analyze-patterns?timeframe=30
```

## 🎯 Usage Examples

### 1. Analyzing AR Aging

```javascript
const response = await fetch('/api/v1/rcm-advanced/ar-aging/analyze', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const analysis = await response.json();
console.log(`Total Outstanding: $${analysis.data.totalOutstanding}`);
console.log(`Collection Probability: ${analysis.data.collectionProbability}%`);
```

### 2. Submitting a Claim to ClaimMD

```javascript
const claimData = {
  patientInfo: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1980-01-01'
  },
  providerInfo: {
    npi: '1234567890'
  },
  serviceLines: [{
    procedureCode: '99213',
    diagnosisCode: 'Z00.00',
    serviceDate: '2024-01-15',
    chargeAmount: 150.00
  }]
};

const response = await fetch('/api/v1/rcm-advanced/claimmd/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(claimData)
});
```

### 3. Initiating Collection Workflow

```javascript
const workflowData = {
  accountId: 123,
  workflowType: 'aggressive'
};

const response = await fetch('/api/v1/rcm-advanced/collection/initiate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(workflowData)
});
```

## 🔧 Configuration

### Workflow Types

**Standard Workflow:**
- Initial statement (Day 0)
- First reminder (Day 30)
- Second reminder (Day 60)
- Final notice (Day 90)
- Collection call (Day 105)
- External collection (Day 120)

**Aggressive Workflow:**
- Initial statement (Day 0)
- First reminder (Day 15)
- Collection call (Day 30)
- Final notice (Day 45)
- External collection (Day 60)

**Gentle Workflow:**
- Initial statement (Day 0)
- First reminder (Day 45)
- Second reminder (Day 90)
- Payment plan offer (Day 120)
- Final notice (Day 150)

### Risk Score Thresholds

- **Low Risk**: 0-29 points
- **Medium Risk**: 30-49 points
- **High Risk**: 50-69 points
- **Critical Risk**: 70+ points

## 📊 Dashboard Components

### AR Aging Intelligence Dashboard
- Total outstanding amounts by aging bucket
- Collection probability trends
- Risk distribution pie chart
- Top risk accounts table
- Automated action history

### ClaimMD Connector Dashboard
- Submission status trends
- Error code analysis
- Processing time metrics
- Recent submissions table

### Collection Workflow Dashboard
- Active workflow status
- Payment plan performance
- Collection action effectiveness
- Workflow completion rates

### Denial Management Dashboard
- Denial category breakdown
- Appeal success rates
- Resolution time analysis
- Pattern identification

## 🔒 Security Features

- **HIPAA Compliance**: All PHI is encrypted and access-controlled
- **Role-based Access**: Granular permissions for different user types
- **Audit Logging**: Comprehensive audit trail for all actions
- **Data Encryption**: End-to-end encryption for sensitive data
- **Secure APIs**: JWT-based authentication and rate limiting

## 🚀 Performance Optimization

- **Intelligent Caching**: Redis-based caching for frequently accessed data
- **Database Indexing**: Optimized indexes for fast query performance
- **Async Processing**: Background processing for heavy operations
- **Connection Pooling**: Efficient database connection management

## 🔄 Automated Processes

### Scheduled Jobs
- **AR Analysis**: Daily aging analysis and risk scoring
- **Status Sync**: Hourly ClaimMD status synchronization
- **Workflow Processing**: Real-time action execution
- **Report Generation**: Weekly performance reports

### Event-driven Actions
- **Payment Received**: Update workflows and risk scores
- **Denial Received**: Automatic categorization and resolution suggestions
- **Threshold Exceeded**: Trigger escalation workflows
- **Appeal Response**: Update success rates and learning models

## 📈 Analytics and Reporting

### Key Performance Indicators (KPIs)
- Collection rate by aging bucket
- Average days to payment
- Denial rate by category
- Appeal success rate
- Revenue forecasting accuracy

### Custom Reports
- Provider performance analysis
- Payer relationship metrics
- Patient payment behavior
- Workflow effectiveness

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database credentials in `.env`
   - Ensure MySQL service is running
   - Verify database exists and schema is created

2. **ClaimMD API Errors**
   - Verify API credentials
   - Check network connectivity
   - Review API rate limits

3. **Authentication Issues**
   - Ensure JWT secret is configured
   - Check token expiration
   - Verify user permissions

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=rcm:*
LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For technical support or questions:
- Email: support@ovhi.com
- Documentation: https://docs.ovhi.com
- Issue Tracker: https://github.com/ovhi/platform/issues

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with all 11 core components
- Complete API implementation
- Frontend dashboard components
- Comprehensive test suite
- Full documentation

### Roadmap
- Machine learning model improvements
- Additional payer integrations
- Mobile application support
- Advanced analytics features
- Blockchain integration for audit trails