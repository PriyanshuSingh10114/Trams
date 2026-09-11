import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../docs/swagger.json'), 'utf8')
);

export const docsRoutes = Router();

docsRoutes.use('/', swaggerUi.serve);
docsRoutes.get('/', swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Microservices API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}));

docsRoutes.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
