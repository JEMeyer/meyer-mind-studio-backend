import { Request } from 'express';

declare module 'express' {
  export interface Request {
    auth?: {
      user: string;
      password: string;
    };
  }
}