// Require express
import dotenv from 'dotenv';
dotenv.config();
import express, { NextFunction, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';
import  { createLoggerWithUserId } from './middleware/logger';
import morgan from 'morgan';

import { deleteFolder } from './tools/utilities';
import * as OpenAi from './services/openai';
import * as Stability from './services/stabilityai';
import * as LocalDiffusion from './services/localDiffusion';
import * as Storyboard from './storyboard';

import { Readable } from 'stream';
import {
  CoquiAPIError,
  FfmpegError,
  OpenAIAPIError,
  StabilityAPIError,
} from './tools/exceptions';
import { authenticate } from './middleware/authenticate';
import { RequestContext } from './middleware/context';
import { timerMiddleware } from './middleware/timer';
import path from 'path';
import { migrate } from './database/database';
import { voteOnVideo } from './services/voteService';
import { addVideo, getVideosWithUpvotes } from './services/videoService';
import { CustomRequest } from './types/types';

// Initialize express
const app = express();
const PORT = 8080;

const upload = multer({ storage: multer.memoryStorage() });

// static can just  be served
app.use('/static',express.static('/usr/app/src/public'));

// Enable CORS for all routes
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified origin.';
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
        write: (message: string) => RequestContext.getStore()?.logger?.info(message.trim()),
      },
    })(req, res, next);
  });
});

// Error handling middleware using the logger from the request context
app.use((err: Error, req: CustomRequest, res: Response, next: NextFunction) => {
  const logger = RequestContext.getStore()?.logger;
  const userId = req.userId || 'unknown';
  
  logger?.error(`User ID: ${userId}, Error: ${err.message}, Request Body: ${JSON.stringify(req.body)}`);

  // Handle the error response here or call the next middleware
  res.status(500).json({ error: 'Internal Server Error' });
});

// parse JSON
app.use(express.json());

// Set up the timer
app.use(timerMiddleware);

// parse URL encoded data
app.use(express.urlencoded({ extended: true }));


// Initialize the database and start the server
const startServer = async () => {
  try {
    await migrate(); // Run the database migrations

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing the database:', error);
  }
};

startServer();

app.post('/promptToStoryboard', upload.none(),  async (req: CustomRequest, res: Response) => {
  // Check if request body is empty
  if (!Object.keys(req.body).length) {
    return res.status(400).json({
      message: 'Request body cannot be empty',
    });
  }

  try {
    const prompt = req.body.prompt;

    const  { outputVideo, gpt_output } = await Storyboard.GenerateStoryboard(prompt);
    // Extract the file name and parent directory using path.basename() and path.dirname()
    const uuid = path.basename(path.dirname(outputVideo));
    const fileName = path.basename(outputVideo);
    const tempDir = path.dirname(outputVideo);

    // TODO: update joebot to use  static routes too
    if (req.header('Authorization')?.split(' ')[0] === 'Basic') {
      const fileStream = fs.createReadStream(outputVideo);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      fileStream.pipe(res);
    } else {
      // Move the video to publicly shared folder
      await fs.promises.copyFile(outputVideo, `/usr/app/src/public/${uuid}-${fileName}`);

      const publicPath = `/static/${uuid}-${fileName}`;

      // Add to database
      await addVideo(publicPath, prompt, gpt_output,  gpt_output.name, req.userId || 'unknown')

      // Return the filename (to then use with /static route)
      res.json({filePath: publicPath});
    }
    res.on('finish', () => {
      deleteFolder(tempDir);
    });
  } catch (err) {
    if (err instanceof StabilityAPIError) {
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
    RequestContext.getStore()?.logger.error(`Error caught in /promptToStoryboard with prompt '${req.body.prompt}': ${err}`);
    res.send();
  }
});

app.post('/promptToImagePrompt',  async (req: CustomRequest, res: Response) => {
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

    res.json(gpt_prompt);
  } catch (err) {
    if (err instanceof OpenAIAPIError) {
      res.status(500).statusMessage = 'Failed during GPT calls.';
    } else {
      res.status(500).statusMessage = 'Failed with unknown error.';
    }
    RequestContext.getStore()?.logger.error(`Failed promptToImagePrompt with prompt '${req.body.prompt}': ${err}`)
    res.send()
  }
});

app.post('/promptToImage', async (req: CustomRequest, res: Response) => {
  // Check if requeest body is empty
  if (!Object.keys(req.body).length) {
    return res.status(400).json({
      message: 'Request body cannot be empty. ',
    });
  }

  try {
    const prompt = req.body.prompt;
    const scale = req.body.scale ?? 7.5;
    const steps = req.body.steps ?? 50;
    const seed = req.body.seed ?? 3465383516;
    const localDiffusion = req.body.localDiffusion;

    let response;

    if (localDiffusion) {
      response = await LocalDiffusion.Generate({ prompt, scale, steps, seed });
    } else {
      response = await Stability.Generate({ prompt, scale, steps, seed });
    }

    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(response.data);

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
  } catch (err) {
    if (err instanceof StabilityAPIError) {
      res.status(500).statusMessage =
        'Failed during image creation (invalid prompt detected).';
    } else {
      res.status(500).statusMessage = 'Failed with unknown error.';
    }
    RequestContext.getStore()?.logger.error(`Error caught in /promtToImage with prompt '${req.body.prompt}': ${err}`);
    res.send();
  }
});

app.put('/vote', async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.userId; // assuming the userId is stored in a 'user' property on the request object
    if (!userId) {
      return res.status(400).json({
        message: 'Unable to determine userId.',
      });
    }
    const videoId = req.body.videoId;
    const value = parseInt(req.body.value, 10); // assuming the 'value' parameter is passed in the request body as a string

    await voteOnVideo(userId, videoId, value);
    res.sendStatus(204); // return a 'no content' response to indicate success
  } catch (error) {
    RequestContext.getStore()?.logger.error('Error voting on video:', error);
    res.status(500).send('An error occurred while voting on the video');
  }
});

app.get('/videos', async (req: CustomRequest, res) => {
  try {
    const sorting = typeof req.query.sorting === 'string' ? req.query.sorting : 'top';;
    const timeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : '';;
    const page =  Number(req.query.page) || 1;
    
    const videos = await getVideosWithUpvotes(page, sorting, req.userId, timeframe);

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).send('An error occurred while fetching videos');
  }
});
