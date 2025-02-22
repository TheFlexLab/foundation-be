const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const { BACKEND_URL } = require('./config/env');

// Swagger options
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Foundation API with Swagger',
            version: '1.0.0',
            description: 'Foundation API with Swagger documentation',
        },
        servers: [
            {
                url: `${BACKEND_URL}`,
            },
        ],
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    apis: ['./routes/*.js'], // Path to the API routes file(s)
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
module.exports = swaggerSpec;