import { Logger, createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

const customFormat = printf(({ level, message, timestamp, userId }) => {
  return `${timestamp} [${userId}] ${level}: ${message}`;
});

export function createLoggerWithUserId(userId: string): LoggerWithUserId {
  return createLogger({
    format: combine(colorize(), timestamp(), customFormat),
    transports: [
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' }),
      new transports.Console(),
    ],
    defaultMeta: { userId },
  }) as LoggerWithUserId;
}

export interface LoggerWithUserId extends Logger {
  defaultMeta: {
    userId: string;
  };
}
