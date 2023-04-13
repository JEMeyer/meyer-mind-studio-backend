import { OpenAIAPIError } from './tools/exceptions';
import { validlateMainPrompt } from './tools/gptValidator';
import { callGPT } from './services/openai';
import { Character, PrimaryStoryboardResponse } from './types/types';
import path from 'path';
import {
  generateTranscripts,
  generateSRT,
  createVideoFromImagesAndAudio,
} from './tools/utilities';
import * as Coqui from './services/coqui';
import * as Stability from './services/stabilityai';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from './middleware/context';

const response_prompt1 = `{
    name: 'Jenga Battle',
    setting: 'luxurious living room with a Jenga set on the coffee table',
    theme: 'Modern, sleek and dark, focus, contrasting colors.',
    speakers: [
      {
        id: 1,
        visual_description: 'Donald Trump, with a blue suit, red tie',
        voice_description: 'An older male with a brash, New York accent and a deep, gravelly voice.'
      },
      {
        id: 2,
        visual_description: 'Snoop Dogg, with gold chains, sunglasses',
        voice_description: 'A middle-aged african-american male with a laid-back, West Coast drawl and a smooth, mellow voice.'
      }
    ],
    frames: [
      {
        speakerId: 1,
        dialog: "Oops, looks like I slipped. Don't worry, I'll fix it.",
        emotion: 'Happy',
        visual_description: '{1} adjusting a Jenga block, trying to prevent it from falling, while {2} looks on in suspicion.'
      },
      {
        speakerId: 2,
        dialog: 'Come on, man. We playing fair or what?',
        emotion: 'Angry',
        visual_description: '{2} reaching for a block that was moved out of place.'
      },
      {
        speakerId: 1,
        dialog: "Hey, calm down. It's just a game.",
        emotion: 'Neutral',
        visual_description: "{1} standing up from his chair to show the Jenga tower."
      },
      {
        speakerId: 2,
        dialog: "I see what you're doing, and it ain't cool. Nobody cheats on my watch.",
        emotion: 'Dull',
        visual_description: '{2} confronting {1} face-to-face, pushing the table to the side.'
      },
      {
        speakerId: 1,
        dialog: 'Relax, Snoop. Just having a little fun.',
        emotion: 'Surprise',
        visual_description: "{1} grining slyly and straighten=ing his tie, {2} looks mad."
      },
      {
        speakerId: 2,
        dialog: "This ain't 'Little Fun', homie. It's Jenga!",
        emotion: 'Sad',
        visual_description: '{2} grabbing a block from the middle of the wobbly tower, as {1} flinches.'
      }
    ]
  }`;
const storyboard_prompt = `You are a storyboard creator. You create a movie scene with a name, setting, theme, speakers, and 6-12 frames. Return a JSON object with: a name (1-4 words), setting_description (5-15 words describing what is in the background for all frames, such as the town or building they are in), theme_visuals (5-15 words describing an artistic style or painter, be verbose, similar to the sample JSON provided later), speakers (mapping a speakerId, a visual_description of the speaker (5-10 words, avoid using 'kids', 'boy', or 'girl' for content filter reasons)), and a voice_description of the speakers voice (use singlar case (eg 'student' and not 'students'), for the description of the voice, be sure to include the gender of the speaker. Do not include any curly braces in the dialog)). You also return an array of frames. Each frame must include speakerId of the person speaking, brief R-rated dialog (THIS FIELD IS REQUIRED, must be at least 1 word but no more than 50 (hard limit at 250 characters) and do not include any curly braces in the dialog), emotion (pick from ['Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull'], any other  value is invalid), and a visual_description of the visuals in the frame (only include words relevant to paint the frame and use present participle form, reference the speaker numbers as characters so I know which characters to draw in the scene. If there are any characters that should be drawn in the image, mark them with {}, so if you want to say that "character 1 looks at character 2", put in "{1} looks at {2}". If you add a character to be drawn in a frame, the speaker is almost always one of the drawn characters. Only include a maximum of 2 speaker references per visual_description). Combined descriptions (theme_visuals, setting_description, frame.visual_description (with speaker.visual_description substitutions eg "{1} stands up" becomes "speaker1.visual_description stands up" but with the actual substitution done)) over 65 words. Using the prompt, create information to properly describe a full movie recap, and use this as the basis for the dialog. The combined length of each frame's frame_desc (including substituting {1} for character 1's visual_description), the setting, and the theme should be less than 70 words. Here is an example of the JSON I expect back:${response_prompt1}\nI will process your response through a JSON.decode(), so only reply with valid JSON in the form provided. Prompt:`;

export async function GenerateStoryboard(prompt: string) {
  const gpt_output = await GenerateStoryboardObject(prompt);

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

  return { outputVideo, gpt_output };
}

async function GenerateStoryboardObject(prompt: string) {
  let attempts = 2;
  let clarifications = 3;
  const logger = RequestContext.getStore()?.logger;

  while (attempts-- >= 0) {
    try {
      let response =
        (await callGPT(`${storyboard_prompt}"""${prompt.trim()}"""`)) || '';
      let parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;
      let errors = validlateMainPrompt(parsedObject);

      // Retry once
      if (errors.length > 0) {
        while (clarifications > 0) {
          const correctingPrompt = `I have a JSON object with some constraints I'd like you to help me resolve. I would like you to return to me a modified JSON object, based on the following feedback: ${errors.join(
            '\n'
          )} Do not modify any fields not mentioned in the feedback provided. The JSON object should be identical, but with modifications to avoid thet issues specified. Only reply with the JSON object, as I will do a JSON.decode() to parse the message and expect only that object. I will send the JSON object in the next chat message.`;

          response =
            (await callGPT(response, [
              { role: 'user', content: correctingPrompt },
            ])) || '';
          parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;
          errors = validlateMainPrompt(parsedObject);

          if (errors.length === 0) {
            return parsedObject;
          }
          clarifications--;
        }
        logger?.warn(`Max clarifications reached. Final error: ${errors.join(',')}`)
        throw new SyntaxError('Max clarifications reached.');
      }
      // If parsing is successful, it will return the parsed data and exit the loop
      return parsedObject;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger?.warn(`Syntax error: ${error}, retries left:${attempts}`);
      } else {
        // If the error is not a SyntaxError, throw it immediately
        logger?.error(`Non-syntax error in GenerateStoryboardObject catch: ${error}`)
        throw new OpenAIAPIError();
      }
    }
  }
  logger?.warn('Retry limit exceeded.');
          throw new OpenAIAPIError();
}
