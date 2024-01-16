import { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
import { verifyIdToken } from './verifyIdToken';

const apiUsers = {
  KwisatzHaderach: process.env.API_TOKEN || '',
  // Add more users and their secrets as needed
};

export const authenticate = [
  (req: Request, res: Response, next: NextFunction) => {
    const authType = req.header('Authorization')?.split(' ')[0];

    // Let them through if they are hitting the static endpoint, or  videos with no authType
    // We want to flow through the auth for signed-in reqeusts so we can get the userId later.
    if (
      req.path.startsWith('/static') ||
      (req.path.startsWith('/content') && !authType) ||
      (req.path.startsWith('/video') && !authType) ||
      (req.path.startsWith('/picture') && !authType)
    ) {
      return next();
    }

    if (authType === 'Basic') {
      basicAuth({
        users: apiUsers,
        unauthorizedResponse: { message: 'Unauthorized' },
      })(req, res, () => {
        // Set the userId to the authenticated user
        (req as any).userId = req.auth?.user || 'UNKNOWN  API USER';
        next();
      });
    } else {
      verifyIdToken()(req, res, next);
    }
  },
];
