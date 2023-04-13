import { Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { CustomRequest } from '../types/types';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

export const verifyIdToken = () => async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No ID token provided.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Unauthorized: Invalid ID token.' });
    }

    // Attach the verified user ID to the request object
    (req as any).userId = payload.sub;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized: ID token verification failed.' });
  }
};
