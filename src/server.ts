// Require express
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import basicAuth from 'express-basic-auth';
import fs from 'fs';
import multer from 'multer';

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

const apiUsers = {
  KwisatzHaderach: process.env.API_TOKEN || '',
  // Add more users and their secrets as needed
};

// Initialize express
const app = express();
const PORT = 8080;

const upload = multer({ storage: multer.memoryStorage() });

// Security
app.use(
  basicAuth({
    users: apiUsers,
    unauthorizedResponse: { message: 'Unauthorized' },
  })
);

// parse JSON
app.use(express.json());

// parse URL encoded data
app.use(express.urlencoded({ extended: true }));

// create a server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post('/promptToStoryboard', upload.none(), async (req, res) => {
  // Check if request body is empty
  if (!Object.keys(req.body).length) {
    return res.status(400).json({
      message: 'Request body cannot be empty',
    });
  }

  try {
    const prompt = req.body.prompt;

    const outputVideo = await Storyboard.GenerateStoryboard(prompt);

    const filePathComponents = outputVideo.split('/');

    const fileStream = fs.createReadStream(outputVideo);
    const fileName = outputVideo.split('/')[filePathComponents.length - 1];

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    fileStream.pipe(res);

    res.on('finish', () => {
      deleteFolder(`${filePathComponents[0]}${filePathComponents[1]}`);
    });
  } catch (err) {
    if (err instanceof StabilityAPIError) {
      console.log('StabilityAPIError error');
      res.status(500).statusMessage =
        'Failed during image creation (invalid prompt detected).';
      res.send();
    } else if (err instanceof OpenAIAPIError) {
      console.log('OpenAIAPIError error');
      res.status(500).statusMessage = 'Failed during GPT calls.';
      res.send();
    } else if (err instanceof CoquiAPIError) {
      console.log('CoquiAPIError error');
      res.status(500).statusMessage = 'Failed during voice creation.';
      res.send();
    } else if (err instanceof FfmpegError) {
      console.log('FfmpegError error');
      res.status(500).statusMessage = 'Failed during video creation.';
      res.send();
    } else {
      res.status(500).statusMessage = 'Failed with unknown error.';
      res.send();
    }

    console.error(err);
  }
});

app.post('/promptToImagePrompt', async (req, res) => {
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
      res.send();
    } else {
      res.status(500).statusMessage = 'Failed with unknown error.';
      res.send();
    }
  }
});

app.post('/promptToImage', async (req, res) => {
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
      console.log('StabilityAPIError error');
      res.status(500).statusMessage =
        'Failed during image creation (invalid prompt detected).';
      res.send();
    } else {
      res.status(500).statusMessage = 'Failed with unknown error.';
      res.send();
    }
  }
});
