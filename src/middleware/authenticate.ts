import { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
import { verifyIdToken } from './verifyIdToken';

const apiUsers = {
  KwisatzHaderach: process.env.API_TOKEN || '',
  // Add more users and their secrets as needed
};

export const authenticate = [
  (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/static')) {
      return next();
    }

    const authType = req.header('Authorization')?.split(' ')[0];

    if (authType === 'Basic') {
      basicAuth({
        users: apiUsers,
        unauthorizedResponse: { message: 'Unauthorized' },
      })(req, res, next);
    } else {
      verifyIdToken()(req, res, next);
    }
  },
];
