/**
 * Swagger UI Server (JavaScript, CommonJS)
 * Serves the OpenAPI documentation with interactive UI
 */

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = process.env.SWAGGER_PORT || 3333;

// Load the OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger-api-docs.yaml'));

// Swagger UI options
const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
        urls: [
            {
                url: '/api-docs.json',
                name: 'AI Coding Platform API',
            },
        ],
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
    },
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b4151; }
  `,
    customSiteTitle: 'AI Coding Platform API Documentation',
    customfavIcon: '/favicon.ico',
};

// Serve the OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
});

// Serve Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Redirect root to docs
app.get('/', (req, res) => {
    res.redirect('/docs');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'swagger-docs' });
});

// Start server
app.listen(PORT, () => {
    console.log(`📚 Swagger UI available at: http://localhost:${PORT}/docs`);
    console.log(`📄 OpenAPI JSON available at: http://localhost:${PORT}/api-docs.json`);
});

module.exports = app;
