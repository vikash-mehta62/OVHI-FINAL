/**
 * Swagger/OpenAPI Documentation Setup
 * Configures and serves API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

class SwaggerSetup {
  constructor() {
    this.swaggerSpec = null;
    this.options = {
      definition: {
        openapi: '3.0.3',
        info: {
          title: 'RCM API Documentation',
          version: '1.0.0',
          description: `
            Comprehensive API for Revenue Cycle Management system providing healthcare billing, 
            claims processing, payment management, and analytics capabilities.
            
            ## Features
            - Claims management and processing
            - Payment processing and reconciliation
            - A/R aging and collections
            - Revenue analytics and reporting
            - Patient account management
            - Provider and insurance management
            
            ## Authentication
            This API uses JWT (JSON Web Tokens) for authentication. Include the token in the 
            Authorization header as \`Bearer <token>\`.
            
            ## Rate Limiting
            API requests are rate limited to prevent abuse:
            - General endpoints: 100 requests per 15 minutes
            - Authentication endpoints: 5 requests per 15 minutes
            - Create operations: 10 requests per minute
          `,
          contact: {
            name: 'RCM API Support',
            email: 'support@rcm-system.com'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
        },
        servers: [
          {
            url: 'http://localhost:3000/api/v1',
            description: 'Development server'
          },
          {
            url: 'https://api.rcm-system.com/v1',
            description: 'Production server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      apis: [
        './services/*/routes/*.js',
        './services/*/*Routes.js',
        './routes/*.js',
        './docs/api/*.yaml'
      ]
    };
  }

  /**
   * Initialize Swagger documentation
   */
  initialize() {
    try {
      // Load OpenAPI spec from YAML file if it exists
      const yamlPath = path.join(__dirname, 'docs/api/openapi.yaml');
      if (fs.existsSync(yamlPath)) {
        this.swaggerSpec = YAML.load(yamlPath);
        console.log('✅ Loaded OpenAPI spec from YAML file');
      } else {
        // Generate spec from JSDoc comments
        this.swaggerSpec = swaggerJsdoc(this.options);
        console.log('✅ Generated OpenAPI spec from JSDoc comments');
      }

      return this.swaggerSpec;
    } catch (error) {
      console.error('❌ Failed to initialize Swagger documentation:', error);
      throw error;
    }
  }

  /**
   * Setup Swagger UI middleware
   */
  setupSwaggerUI(app) {
    if (!this.swaggerSpec) {
      this.initialize();
    }

    // Swagger UI options
    const swaggerUiOptions = {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2c3e50; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .swagger-ui .btn.authorize { background-color: #007bff; border-color: #007bff; }
        .swagger-ui .btn.authorize:hover { background-color: #0056b3; border-color: #0056b3; }
      `,
      customSiteTitle: 'RCM API Documentation',
      customfavIcon: '/favicon.ico'
    };

    // Serve Swagger UI
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(this.swaggerSpec, swaggerUiOptions));

    // Serve raw OpenAPI spec
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.swaggerSpec);
    });

    // Serve OpenAPI spec as YAML
    app.get('/api-docs.yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(YAML.stringify(this.swaggerSpec, 4));
    });

    console.log('📚 Swagger UI available at: /api-docs');
    console.log('📄 OpenAPI JSON spec available at: /api-docs.json');
    console.log('📄 OpenAPI YAML spec available at: /api-docs.yaml');
  }

  /**
   * Generate API documentation from routes
   */
  generateDocumentation() {
    const documentation = {
      endpoints: [],
      schemas: {},
      examples: {}
    };

    // This would analyze route files and generate documentation
    // For now, we'll use the pre-defined OpenAPI spec
    return documentation;
  }

  /**
   * Validate OpenAPI specification
   */
  validateSpec() {
    if (!this.swaggerSpec) {
      throw new Error('Swagger spec not initialized');
    }

    const errors = [];

    // Basic validation
    if (!this.swaggerSpec.info) {
      errors.push('Missing info section');
    }

    if (!this.swaggerSpec.paths) {
      errors.push('Missing paths section');
    }

    if (!this.swaggerSpec.components) {
      errors.push('Missing components section');
    }

    // Validate paths
    if (this.swaggerSpec.paths) {
      for (const [path, methods] of Object.entries(this.swaggerSpec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (!operation.summary) {
            errors.push(`Missing summary for ${method.toUpperCase()} ${path}`);
          }
          
          if (!operation.responses) {
            errors.push(`Missing responses for ${method.toUpperCase()} ${path}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.warn('⚠️  OpenAPI spec validation warnings:');
      errors.forEach(error => console.warn(`  - ${error}`));
    } else {
      console.log('✅ OpenAPI spec validation passed');
    }

    return errors;
  }

  /**
   * Generate Postman collection from OpenAPI spec
   */
  generatePostmanCollection() {
    if (!this.swaggerSpec) {
      throw new Error('Swagger spec not initialized');
    }

    const collection = {
      info: {
        name: this.swaggerSpec.info.title,
        description: this.swaggerSpec.info.description,
        version: this.swaggerSpec.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{jwt_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3000/api/v1',
          type: 'string'
        },
        {
          key: 'jwt_token',
          value: '',
          type: 'string'
        }
      ],
      item: []
    };

    // Convert OpenAPI paths to Postman requests
    if (this.swaggerSpec.paths) {
      for (const [path, methods] of Object.entries(this.swaggerSpec.paths)) {
        const folder = {
          name: this.getPathFolder(path),
          item: []
        };

        for (const [method, operation] of Object.entries(methods)) {
          const request = {
            name: operation.summary || `${method.toUpperCase()} ${path}`,
            request: {
              method: method.toUpperCase(),
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text'
                }
              ],
              url: {
                raw: `{{base_url}}${path}`,
                host: ['{{base_url}}'],
                path: path.split('/').filter(p => p)
              }
            }
          };

          // Add request body for POST/PUT requests
          if (['post', 'put', 'patch'].includes(method) && operation.requestBody) {
            request.request.body = {
              mode: 'raw',
              raw: JSON.stringify(this.generateExampleFromSchema(operation.requestBody), null, 2)
            };
          }

          // Add query parameters
          if (operation.parameters) {
            const queryParams = operation.parameters
              .filter(param => param.in === 'query')
              .map(param => ({
                key: param.name,
                value: param.example || '',
                description: param.description
              }));
            
            if (queryParams.length > 0) {
              request.request.url.query = queryParams;
            }
          }

          folder.item.push(request);
        }

        collection.item.push(folder);
      }
    }

    return collection;
  }

  /**
   * Get folder name for path
   */
  getPathFolder(path) {
    const segments = path.split('/').filter(p => p);
    if (segments.length > 0) {
      return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
    }
    return 'API';
  }

  /**
   * Generate example from schema
   */
  generateExampleFromSchema(requestBody) {
    // This is a simplified example generator
    // In a real implementation, you'd parse the schema more thoroughly
    return {
      "example": "data"
    };
  }

  /**
   * Export documentation files
   */
  async exportDocumentation() {
    if (!this.swaggerSpec) {
      this.initialize();
    }

    const exportDir = path.join(__dirname, 'docs/exports');
    
    try {
      // Ensure export directory exists
      await fs.promises.mkdir(exportDir, { recursive: true });

      // Export OpenAPI JSON
      const jsonPath = path.join(exportDir, 'openapi.json');
      await fs.promises.writeFile(jsonPath, JSON.stringify(this.swaggerSpec, null, 2));
      console.log(`✅ Exported OpenAPI JSON to: ${jsonPath}`);

      // Export OpenAPI YAML
      const yamlPath = path.join(exportDir, 'openapi.yaml');
      await fs.promises.writeFile(yamlPath, YAML.stringify(this.swaggerSpec, 4));
      console.log(`✅ Exported OpenAPI YAML to: ${yamlPath}`);

      // Export Postman collection
      const postmanCollection = this.generatePostmanCollection();
      const postmanPath = path.join(exportDir, 'postman-collection.json');
      await fs.promises.writeFile(postmanPath, JSON.stringify(postmanCollection, null, 2));
      console.log(`✅ Exported Postman collection to: ${postmanPath}`);

      // Generate HTML documentation
      const htmlDoc = this.generateHTMLDocumentation();
      const htmlPath = path.join(exportDir, 'api-documentation.html');
      await fs.promises.writeFile(htmlPath, htmlDoc);
      console.log(`✅ Exported HTML documentation to: ${htmlPath}`);

      return {
        openapi: {
          json: jsonPath,
          yaml: yamlPath
        },
        postman: postmanPath,
        html: htmlPath
      };

    } catch (error) {
      console.error('❌ Failed to export documentation:', error);
      throw error;
    }
  }

  /**
   * Generate HTML documentation
   */
  generateHTMLDocumentation() {
    const spec = this.swaggerSpec;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${spec.info.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header p { color: #7f8c8d; font-size: 18px; }
        .section { margin: 30px 0; }
        .section h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .endpoint { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #3498db; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 3px; color: white; font-weight: bold; margin-right: 10px; }
        .method.get { background-color: #28a745; }
        .method.post { background-color: #007bff; }
        .method.put { background-color: #ffc107; color: #212529; }
        .method.delete { background-color: #dc3545; }
        .path { font-family: monospace; font-size: 16px; }
        .description { margin: 10px 0; color: #6c757d; }
        .auth-info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .server-info { background: #f0f8f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${spec.info.title}</h1>
            <p>Version ${spec.info.version}</p>
            <p>${spec.info.description?.split('\\n')[0] || ''}</p>
        </div>

        <div class="section">
            <h2>Servers</h2>
            ${spec.servers?.map(server => `
                <div class="server-info">
                    <strong>${server.url}</strong> - ${server.description}
                </div>
            `).join('') || ''}
        </div>

        <div class="section">
            <h2>Authentication</h2>
            <div class="auth-info">
                <p>This API uses JWT (JSON Web Tokens) for authentication.</p>
                <p>Include the token in the Authorization header: <code>Bearer &lt;token&gt;</code></p>
            </div>
        </div>

        <div class="section">
            <h2>Endpoints</h2>
            ${Object.entries(spec.paths || {}).map(([path, methods]) => 
                Object.entries(methods).map(([method, operation]) => `
                    <div class="endpoint">
                        <div>
                            <span class="method ${method}">${method.toUpperCase()}</span>
                            <span class="path">${path}</span>
                        </div>
                        <div class="description">
                            <strong>${operation.summary || ''}</strong>
                            <p>${operation.description || ''}</p>
                        </div>
                    </div>
                `).join('')
            ).join('')}
        </div>

        <div class="section">
            <h2>Contact</h2>
            <p>For API support: ${spec.info.contact?.email || 'N/A'}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Setup complete documentation system
   */
  async setup(app) {
    console.log('📚 Setting up API documentation...');
    
    try {
      // Initialize Swagger spec
      this.initialize();
      
      // Validate specification
      this.validateSpec();
      
      // Setup Swagger UI
      this.setupSwaggerUI(app);
      
      // Export documentation files
      const exports = await this.exportDocumentation();
      
      console.log('✅ API documentation setup complete!');
      console.log('📖 Available documentation:');
      console.log('  - Swagger UI: http://localhost:3000/api-docs');
      console.log('  - OpenAPI JSON: http://localhost:3000/api-docs.json');
      console.log('  - OpenAPI YAML: http://localhost:3000/api-docs.yaml');
      console.log('  - Exported files:', exports);
      
      return exports;
      
    } catch (error) {
      console.error('❌ Failed to setup API documentation:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const express = require('express');
  const app = express();
  
  const swaggerSetup = new SwaggerSetup();
  
  swaggerSetup.setup(app)
    .then((exports) => {
      console.log('🎉 Documentation setup completed successfully!');
      console.log('Exported files:', exports);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = SwaggerSetup;