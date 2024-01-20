// Require express
import dotenv from 'dotenv';
dotenv.config();
import express, { NextFunction, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';
import { createLoggerWithUserId } from './middleware/logger';
import morgan from 'morgan';

import { deleteFolder, isIdType } from './tools/utilities';
import * as OpenAi from './services/openai';
import * as LocalDiffusion from './services/localDiffusion';
import * as Storyboard from './storyboard';

import {
  CoquiAPIError,
  FfmpegError,
  OpenAIAPIError,
  ImageGenAPIError,
} from './tools/exceptions';
import { authenticate } from './middleware/authenticate';
import { RequestContext } from './middleware/context';
import { timerMiddleware } from './middleware/timer';
import path from 'path';
import { getItemsWithUpvotes, voteOnItem } from './services/voteService';
import { addVideo, getVideoById } from './services/videoService';
import { CustomRequest, IDType } from './types/types';
import { addPicture, getPictureById } from './services/picturesService';
import { Readable } from 'stream';

// Initialize express
const app = express();
const PORT = 8080;
const LONG_TIMEOUT = 300 * 1000; // 300 seconds in milliseconds - chatgpt said this was chrome max
const server = createServer(app);

// Optional Middlewares
const upload = multer({ storage: multer.memoryStorage() });
const setTimeoutMiddleware = (
  req: CustomRequest,
  _res: Response,
  next: NextFunction
) => {
  req.setTimeout(LONG_TIMEOUT);
  next();
};

// static can just  be served
app.use('/static', express.static('/usr/app/src/public'));

// Enable CORS for all routes
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // This is required for cookies, authorization headers, etc.
  })
);

// Add the authenticate middleware to the global middleware chain
app.use(authenticate);

// Middleware for logging all requests using the logger from the request context
app.use((req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.userId || 'unknown';
  const logger = createLoggerWithUserId(userId);

  RequestContext.run({ logger }, () => {
    morgan('combined', {
      stream: {
        write: (message: string) =>
          RequestContext.getStore()?.logger?.info(message.trim()),
      },
    })(req, res, next);
  });
});

// Error handling middleware using the logger from the request context
app.use((err: Error, req: CustomRequest, res: Response, next: NextFunction) => {
  const logger = RequestContext.getStore()?.logger;
  const userId = req.userId || 'unknown';

  logger?.error(
    `User ID: ${userId}, Error: ${err.message}, Request Body: ${JSON.stringify(
      req.body
    )}`
  );

  // Check if response headers have already been sent
  if (res.headersSent) {
    // If headers are already sent, delegate to the default Express error handler
    return next(err);
  }

  // Send an error response
  res.status(500).json({ error: 'Internal Server Error' });
});

// parse JSON
app.use(express.json());

// Set up the timer
app.use(timerMiddleware);

// parse URL encoded data
app.use(express.urlencoded({ extended: true }));

// Start the server
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing the server:', error);
  }
};

startServer();

app.post(
  '/promptToStoryboard',
  setTimeoutMiddleware,
  upload.none(),
  async (req: CustomRequest, res: Response) => {
    // Check if request body is empty
    if (!Object.keys(req.body).length) {
      return res.status(400).json({
        message: 'Request body cannot be empty',
      });
    }

    try {
      const prompt = req.body.prompt;

      const { outputVideo, gpt_output } =
        await Storyboard.GenerateStoryboard(prompt);
      // Extract the file name and parent directory using path.basename() and path.dirname()
      const uuid = path.basename(path.dirname(outputVideo));
      const fileName = path.basename(outputVideo);
      const tempDir = path.dirname(outputVideo);

      // TODO: update joebot to use  static routes too
      if (req.header('Authorization')?.split(' ')[0] === 'Basic') {
        const fileStream = fs.createReadStream(outputVideo);

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}`
        );

        fileStream.pipe(res);
      } else {
        // Move the video to publicly shared folder
        await fs.promises.copyFile(
          outputVideo,
          `/usr/app/src/public/${uuid}-${fileName}`
        );

        const publicPath = `/static/${uuid}-${fileName}`;

        // Add to database
        const video = await addVideo(
          publicPath,
          prompt,
          gpt_output,
          gpt_output.name,
          req.userId || 'unknown'
        );

        // Return the filename (to then use with /static route)
        res.json(video);
      }
      res.on('finish', () => {
        deleteFolder(tempDir);
      });
    } catch (err) {
      if (err instanceof ImageGenAPIError) {
        res.status(500).statusMessage =
          'Failed during image creation (invalid prompt detected).';
      } else if (err instanceof OpenAIAPIError) {
        res.status(500).statusMessage = 'Failed during GPT calls.';
      } else if (err instanceof CoquiAPIError) {
        res.status(500).statusMessage = 'Failed during voice creation.';
      } else if (err instanceof FfmpegError) {
        res.status(500).statusMessage = 'Failed during video creation.';
      } else {
        res.status(500).statusMessage = 'Failed with unknown error.';
      }
      RequestContext.getStore()?.logger.error(
        `Error caught in /promptToStoryboard with prompt '${req.body.prompt}': ${err}`
      );
      res.send();
    }
  }
);

app.post('/promptToImagePrompt', async (req: CustomRequest, res: Response) => {
  // Check if request body is empty
  if (!Object.keys(req.body).length) {
    return res.status(400).json({
      message: 'Request body cannot be empty. ',
    });
  }

  try {
    // Use object destructuring to get name and age
    const prompt = req.body.prompt;

    const gpt_prompt = await OpenAi.GenerateImagePrompt(prompt);

    if (gpt_prompt.negPrompt === '')
      RequestContext.getStore()?.logger.error(
        `Failed promptToImagePrompt with prompt '${req.body.prompt}' but recovered`
      );

    res.json(gpt_prompt);
  } catch (err) {
    if (err instanceof OpenAIAPIError) {
      res.status(500).statusMessage = 'Failed during GPT calls.';
    } else {
      res.status(500).statusMessage = 'Failed with unknown error.';
    }
    RequestContext.getStore()?.logger.error(
      `Failed promptToImagePrompt with prompt '${req.body.prompt}': ${err}`
    );
    res.send();
  }
});

app.post(
  '/promptToImage',
  setTimeoutMiddleware,
  async (req: CustomRequest, res: Response) => {
    // Check if requeest body is empty
    if (!Object.keys(req.body).length) {
      return res.status(400).json({
        message: 'Request body cannot be empty. ',
      });
    }

    try {
      const prompt = req.body.prompt;
      const negPrompt = req.body.negPrompt ?? '';
      const scale = req.body.scale ?? 7.5;
      const steps = req.body.steps ?? 20;
      const seed = req.body.seed ?? 3465383516;
      const name = req.body.name ?? '';

      const response = await LocalDiffusion.GenerateXL({
        prompt,
        negPrompt,
        scale,
        steps,
        seed,
      });

      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(response.data);

      // TODO: update joebot to use  static routes too
      if (req.header('Authorization')?.split(' ')[0] === 'Basic') {
        // Convert Buffer to Stream
        const stream = Readable.from(buffer);

        // Set the response headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${response.fileName}`
        );
        res.setHeader('Content-Length', buffer.length);

        // Pipe the stream to the response
        stream.pipe(res);
      } else {
        const pictureName = `${name}`;
        const filePath = `/usr/app/src/public/images/${response.fileName}`;

        // Save it to /static
        try {
          await fs.promises.writeFile(filePath, buffer);
          RequestContext.getStore()?.logger.info(`File saved: ${filePath}`);
        } catch (err) {
          RequestContext.getStore()?.logger.error(
            `Error caught in /promtToImage with prompt '${req.body.prompt}': ${err}`
          );
        }

        const publicPath = `/static/images/${response.fileName}`;

        // Add to database
        const picture = await addPicture(
          publicPath,
          `POS: ${prompt} / NEG: ${negPrompt}`,
          pictureName,
          req.userId || 'unknown'
        );

        // Return the filename (to then use with /static route)
        res.json(picture);
      }
    } catch (err) {
      if (err instanceof ImageGenAPIError) {
        res.status(500).statusMessage =
          'Failed during image creation (invalid prompt detected).';
      } else {
        res.status(500).statusMessage = 'Failed with unknown error.';
      }
      RequestContext.getStore()?.logger.error(
        `Error caught in /promtToImage with prompt '${req.body.prompt}': ${err}`
      );
      res.send();
    }
  }
);

app.put('/vote', async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({
        message: 'Unable to determine userId.',
      });
    }
    const idValue = req.body.idValue;
    const idType = req.body.idType;
    const value = parseInt(req.body.value, 10);

    await voteOnItem(userId, idValue, idType, value);
    res.sendStatus(204); // return a 'no content' response to indicate success
  } catch (error) {
    RequestContext.getStore()?.logger.error('Error voting on video:', error);
    res.status(500).send('An error occurred while voting on the video');
  }
});

app.get('/content', async (req: CustomRequest, res) => {
  try {
    const sorting =
      typeof req.query.sorting === 'string' ? req.query.sorting : 'top';
    const timeframe =
      typeof req.query.timeframe === 'string' ? req.query.timeframe : '';
    const filterByUser = req.query.userContentOnly === 'true';
    const likedItemsOnly = req.query.likedItems === 'true';
    const page = Number(req.query.page) || 1;
    let contentType: IDType | null = null;
    const contentTypeQuery = Number(req.query.contentType);
    if (!isNaN(contentTypeQuery) && isIdType(contentTypeQuery)) {
      contentType = contentTypeQuery;
    }

    const videos = await getItemsWithUpvotes(
      page,
      sorting,
      req.userId,
      timeframe,
      filterByUser,
      likedItemsOnly,
      contentType
    );

    res.json(videos);
  } catch (error) {
    RequestContext.getStore()?.logger.error('Error fetching videos:', error);
    res.status(500).send('An error occurred while fetching videos');
  }
});

app.get('/video/:id', async (req: CustomRequest, res) => {
  try {
    const videoId = req.params.id;

    if (!videoId) {
      res.status(400).send('Invalid video ID');
      return;
    }

    const video = await getVideoById(videoId, req.userId);

    if (!video) {
      res.status(404).send('Video not found');
      return;
    }

    res.json(video);
  } catch (error) {
    RequestContext.getStore()?.logger.error('Error fetching video:', error);
    res.status(500).send('An error occurred while fetching video');
  }
});

app.get('/picture/:id', async (req: CustomRequest, res) => {
  try {
    const pictureId = req.params.id;

    if (!pictureId) {
      res.status(400).send('Invalid picture ID');
      return;
    }

    const picture = await getPictureById(pictureId, req.userId);

    if (!picture) {
      res.status(404).send('Picture not found');
      return;
    }

    res.json(picture);
  } catch (error) {
    RequestContext.getStore()?.logger.error('Error fetching picture:', error);
    res.status(500).send('An error occurred while fetching picture');
  }
});
