import { Character, PrimaryStoryboardResponse } from './types/types';
import path from 'path';
import {
  generateTranscripts,
  generateSRT,
  createVideoFromImagesAndAudio,
} from './tools/utilities';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from './middleware/context';
import { CreateSoundSample, Language, getRandomVoice } from './services/coqui';
import { OllamaAPIError } from './tools/exceptions';
import { Format, Obey_System_Prompt, generate } from './services/ollama';
import { GenerateRequest } from 'ollama';
import {
  GenerateFrame,
  ImageGenBestPractices,
} from './services/localDiffusion';

const storyboard_prompt = `You are a storyboard creator. You create a movie scene with a name, setting, theme, speakers, and 6-12 frames. Return a JSON object that is described in the JSON schema included in this message. Each frame must include speakerId
of the person speaking, brief R-rated dialog (must be at least 1 word but no more than 50 (hard limit at 200 characters) and do not include any curly braces in the spoken dialog. You need to put the curlybraces around the characters in the frame descriptions. I will looke for {1} and {2} for speaker 1 and speaker 2, respectively. I rely on the curly braces around the number for the replacements.
Using the prompt, create information to properly describe a full movie arc (across a few scenes), and use this as the basis for the dialog. Think of interesting things that will happen as a result of the prompt.
I will process your response through a JSON.decode(), so only reply with valid JSON in the form provided. Be sure to include at least 4 frames in the output, up to a max of 12. Focus on making the storyboard viral and entertaining. Prompt:
`;

const storyboard_object_json_schema = `{
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description:
        'The name of the movie/scene/arc that is being shown in the storyboard',
    },
    settingDescription: {
      type: 'string',
      description:
        'Prompt used in all frames which will set a consistent setting for the whole storyboard. Refer to diffusion best practies.',
    },
    themeVisuals: {
      type: 'string',
      description:
        'Prompt used in all frames which will give the storyboard a cohesive artistic them. Refer to diffusion best practies.',
    },
    negativePrompt: {
      type: 'string',
      description:
        'The prompt used as the "negative prompt" when creating all storyboard frames. Refer to diffusion best practies.',
    },
    speakers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description:
              'Unique id for this particular speaker - used to refernce in the frame objects',
          },
          visualDescription: {
            type: 'string',
            description:
              'Prompt used when this particular speaker is referenced in a frame. Refer to diffusion best practies.',
          },
          gender: {
            type: 'string',
            description:
              'gender of the speaker, either "male" or "female"',
          },
        },
        required: ['id', 'visualDescription', 'gender'],
      },
    },
    frames: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          speakerId: {
            type: 'integer',
            description:
              'The id of the speaker that is saying the line of dialog for this frame.',
          },
          dialog: {
            type: 'string',
            description:
              'The actual line of dialoge from the storyboard script that the character is saying.',
          },
          visualDescription: {
            type: 'string',
            description:
              'Prompt used to create the uniqueness of this frame compared to the rest. Include enough words that will make sure this frame is easy to differentiate from other frames (as they will have the same theme and setting prompts). If a character is included in this frame you can put in {#} in the prompt, where # is the speakerId. So someone could say "{2} looking over the ocean from a boat at NYC port" and it would be changed to "bart simpson looker over..." I will do the replacement on my side so just put in those placeholders. Refer to diffusion best practies.',
          },
        },
        required: ['speakerId', 'dialog', 'visualDescription'],
      },
    },
  },
  required: [
    'name',
    'settingDescription',
    'themeVisuals',
    'negativePrompt',
    'speakers',
    'frames',
  ],
}`;

export async function GenerateStoryboard(prompt: string) {
  const gpt_output = await GenerateStoryboardObject(prompt);

  const currentWorkingDirectory = process.cwd();
  const uniqueFolder = path.join(currentWorkingDirectory, 'temp', uuidv4());
  await fs.promises.mkdir(uniqueFolder, { recursive: true });
  const logger = RequestContext.getStore()?.logger;
  logger?.info(JSON.stringify(gpt_output));

  const characters: Character[] = [];
  const voicesUsed: Set<string> = new Set();
  for (const x in gpt_output.speakers) {
    const desc = gpt_output.speakers[x].visualDescription;
    const randomVoice = getRandomVoice(
      gpt_output.speakers[x].gender,
      voicesUsed
    );
    voicesUsed.add(randomVoice);
    characters.push({
      id: gpt_output.speakers[x].id,
      voiceName: randomVoice,
      description: desc,
    });
  }

  const imagePromises = [];
  const audioPromises: Promise<string>[] = [];

  logger?.info(uniqueFolder);
  // Do all images at once
  for (const x in gpt_output.frames) {
    imagePromises.push(
      GenerateFrame(
        gpt_output.frames[x].visualDescription,
        characters,
        gpt_output.themeVisuals,
        gpt_output.settingDescription,
        gpt_output.negativePrompt,
        uniqueFolder
      )
    );
    audioPromises.push(
      CreateSoundSample({
        text: gpt_output.frames[x]['dialog'],
        voiceId: characters[gpt_output.frames[x].speakerId - 1].voiceName,
        folder: uniqueFolder,
        index: x,
        language: Language.English,
      })
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

  return { outputVideo, gpt_output };
}

async function GenerateStoryboardObject(prompt: string) {
  const logger = RequestContext.getStore()?.logger;

  const request: GenerateRequest = {
    model: 'dolphin-mixtral:8x7b-v2.7-q6_K',
    prompt: `${storyboard_prompt}. ${ImageGenBestPractices}. The return object is represented by the following JSONSchema: ${storyboard_object_json_schema} Here is the user's prompt: """${prompt.trim()}"""`,
    stream: false,
    system: Obey_System_Prompt,
    format: Format.JSON,
  };

  try {
    const response = await generate(request);
    const parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;

    // If parsing is successful, it will return the parsed data and exit the loop
    return parsedObject;
  } catch (error) {
    if (error instanceof Error) {
      logger?.error(
        `Error in GenerateStoryboardObject catch: ${error.message}`,
        {
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        }
      );
    } else {
      // Handle non-Error objects thrown
      logger?.error('Error in GenerateStoryboardObject catch', { error });
    }
    throw new OllamaAPIError();
  }
}
