// Require express
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import basicAuth from 'express-basic-auth';
import fs from 'fs';
import multer from 'multer';
import * as Coqui from './coqui';
import {
  createVideoFromImagesAndAudio,
  deleteFolder,
  generateSRT,
  generateTranscripts,
} from './utilities';
import * as OpenAI from './openai';
import * as Stability from './stabilityai';
import * as LocalDiffusion from './localDiffusion';
import * as Storyboard from './storyboard';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Readable } from 'stream';
import { Character } from './types';
import {
  CoquiAPIError,
  FfmpegError,
  OpenAIAPIError,
  StabilityAPIError,
} from './exceptions';

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
    // Use object destructuring to get name and age
    const prompt = req.body.prompt;

    const gpt_output = await Storyboard.GenerateStoryboard(prompt);

    console.log(gpt_output);

    const currentWorkingDirectory = process.cwd();
    const uniqueFolder = path.join(currentWorkingDirectory, 'temp', uuidv4());
    await fs.promises.mkdir(uniqueFolder, { recursive: true });

    const characters: Character[] = [];
    for (const x in gpt_output.speakers) {
      const desc = gpt_output.speakers[x].visual_description;
      const voice_id = await Coqui.VoiceFromPrompt(
        gpt_output.speakers[x].voice_description
      );
      characters.push({
        id: gpt_output.speakers[x].id,
        voiceId: voice_id,
        description: desc,
      });
    }

    const imagePromises = [];
    const audioPromises = [];

    // Do all images at once
    for (const x in gpt_output.frames) {
      imagePromises.push(
        Stability.GenerateFrame(
          gpt_output.frames[x].visual_description,
          characters,
          gpt_output.theme_visuals,
          gpt_output.setting_description,
          uniqueFolder
        )
      );
      audioPromises.push(
        Coqui.CreateSoundSample(
          characters[gpt_output.frames[x].speakerId - 1].voiceId,
          gpt_output.frames[x]['dialog'],
          gpt_output.frames[x]['emotion'],
          uniqueFolder,
          x
        )
      );
    }

    const audioPaths = await Promise.all(audioPromises);

    const outputVideo = `${uniqueFolder}/${gpt_output.name}.mp4`;
    const transcripts = await generateTranscripts(
      audioPaths,
      gpt_output.frames.map((frame) => frame.dialog)
    );
    const srtPath = path.join(uniqueFolder, 'subtitles.srt');
    generateSRT(transcripts, srtPath);

    const imagePaths = await Promise.all(imagePromises);
    await createVideoFromImagesAndAudio(
      imagePaths,
      audioPaths,
      srtPath,
      outputVideo
    );

    const fileStream = fs.createReadStream(outputVideo);
    const fileName = `${gpt_output.name}.mp4`;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    fileStream.pipe(res);

    res.on('finish', () => {
      deleteFolder(uniqueFolder);
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

    const gpt_prompt = await Storyboard.GenerateImagePrompt(prompt);

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
