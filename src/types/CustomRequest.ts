import { Request } from 'express';
import { LoggerWithUserId } from '../middleware/logger';

export interface CustomRequest extends Request {
  userId?: string;
}