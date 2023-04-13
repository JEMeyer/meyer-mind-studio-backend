import { Response, NextFunction } from 'express';
import { RequestContext } from './context'; 
import { CustomRequest } from '../types/types';

export const timerMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const { method, originalUrl, body } = req;
  res.on('finish', () => {
    const elapsed = process.hrtime(startTime);
    const elapsedSeconds = elapsed[0] + elapsed[1] / 1e9;
    const logger = RequestContext.getStore()?.logger;

    if (logger) {
      logger.info(`Request ${method} ${originalUrl} with body ${JSON.stringify(body)} took ${elapsedSeconds.toFixed(3)} seconds`);
    }
  });
  next();
};
