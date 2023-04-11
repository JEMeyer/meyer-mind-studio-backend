import { AsyncLocalStorage } from 'async_hooks';
import { LoggerWithUserId } from './logger';

interface RequestContextType {
  logger: LoggerWithUserId;
}

export const RequestContext = new AsyncLocalStorage<RequestContextType>();
