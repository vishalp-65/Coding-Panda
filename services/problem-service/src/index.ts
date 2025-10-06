import express from 'express';
import { connectToDatabase } from './config/database';
import { problemRoutes } from './routes/problemRoutes';
import { errorHandler } from '@ai-platform/common';
import { logger } from '@ai-platform/common';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', problemRoutes);

// Error handling
app.use(errorHandler);

async function startServer() {
  try {
    await connectToDatabase();
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`Problem Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
