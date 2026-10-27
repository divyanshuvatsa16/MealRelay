import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './openapi.js';

const router = Router();

// Expose OpenAPI 3.0 specification in raw JSON format
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openapiSpec);
});

// Swagger UI configuration
const swaggerOptions = {
  customSiteTitle: 'MealRelay API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
};

// Serve Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerOptions));

export default router;
