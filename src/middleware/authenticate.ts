import { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
import { verifyIdToken } from './verifyIdToken';

type ApiUsersType = {
  [key: string]: string;
};

const apiUsers: ApiUsersType = {
  KwisatzHaderach: process.env.API_TOKEN || '',
  // Add more users and their secrets as needed
};

export const authenticate = [
    (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.header('Authorization');
      console.log('Authorization header received in server:', authHeader);
  
      const authType = authHeader?.split(' ')[0];
  
      if (authType === 'Basic') {
        basicAuth({
          authorizeAsync: true,
          authorizer: async (username, password, callback) => {
            console.log('Username from basicAuth:', username);
            console.log('Password from basicAuth:', password);
    
            const userPassword = apiUsers[username];
            callback(null, !!userPassword && userPassword === password);
          },
          unauthorizedResponse: { message: 'Unauthorized' },  
      })(req, res, next);
    } else {
      verifyIdToken()(req, res, next);
    }
  },
];
