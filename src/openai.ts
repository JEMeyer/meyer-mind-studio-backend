import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
import { validlateMainPrompt } from './gptValidator';
import { PrimaryStoryboardResponse } from './types';

const storyboard_prompt = `Create a movie scene with a name, setting, theme, speakers, and 6-12 frames. Return a JSON object with a name (1-4 words), setting (brief description of what is in the background for all frames, such as the town or building they are in), theme (artistic style or painter, be verbose, similar to the sample JSON provided later), speakers (mapping a speaker number, a visual description of the speaker (avoid using 'kids', 'boy', or 'girl' for content filter reasons), and a description of the speakers voice (use singlar case (eg 'student' and not 'students'), for the description of the voice, be sure to include the gender of the speaker, as shown in the example. Do not include any curly braces ({ or }) in the dialog)), and an array of frames. Each frame must include speaker number, brief R-rated dialog (THIS FIELD IS REQUIRED, must be between 1-150 characters in length), emotion (only allowed values: 'Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull'), and a description of the visuals in the frame (only include words relevant to paint the frame and use present participle form, reference the speaker numbers as characters so I know which characters to draw in the scene. Be sure to always include at least 1 character, and mark the  characters with {}, so if you want to say that "character 1 looks at character 2", put in "{1} looks at {2}"). Using the prompt, create information to properly describe a full movie recap, and use this as the basis for the dialog. The combined length of each frame's frame_desc (including substituting {1} for character 1's description), the setting, and the theme should be less than 60 words. Each frame's dialog must be between 1 and 250 characters. Example:
{
  name: 'Jenga Battle',
  setting: 'luxurious living room with a Jenga set on the coffee table and expensive decor in the background.',
  theme: 'Modern, sleek and dark, focus, contrasting colors.',
  speakers: [
    {
      id: 1,
      description: 'Donald Trump, with a blue suit, red tie',
      voice_prompt: 'An older male with a brash, New York accent and a deep, gravelly voice.'
    },
    {
      id: 2,
      description: 'Snoop Dogg, with gold chains, sunglasses',
      voice_prompt: 'A middle-aged african-american male with a laid-back, West Coast drawl and a smooth, mellow voice.'
    }
  ],
  frames: [
    {
      speaker: 1,
      dialog: "Oops, looks like I slipped. Don't worry, I'll fix it.",
      emotion: 'Happy',
      frame_desc: '{1} adjusting a Jenga block, trying to prevent it from falling, while {2} looks on in suspicion.'
    },
    {
      speaker: 2,
      dialog: 'Come on, man. We playing fair or what?',
      emotion: 'Angry',
      frame_desc: '{2} reaching for a block that was moved out of place.'
    },
    {
      speaker: 1,
      dialog: "Hey, calm down. It's just a game.",
      emotion: 'Neutral',
      frame_desc: "{1} standing up from his chair to show that he didn't touch the Jenga tower."
    },
    {
      speaker: 2,
      dialog: "I see what you're doing, and it ain't cool. Nobody cheats on my watch.",
      emotion: 'Angry',
      frame_desc: '{2} confronting {1} face-to-face, pushing the table to the side to make a point.'
    },
    {
      speaker: 1,
      dialog: 'Relax, Snoop. Just having a little fun.',
      emotion: 'Happy',
      frame_desc: "{1} grining slyly and straighten=ing his tie, {2} looks mad."
    },
    {
      speaker: 2,
      dialog: "This ain't 'Little Fun', homie. It's Jenga!",
      emotion: 'Angry',
      frame_desc: '{2} grabbing a block from the middle of the wobbly tower, as {1} flinches in shock.'
    },
    {
      speaker: 1,
      dialog: 'Hey, be careful! You almost knocked it over.',
      emotion: 'Surprise',
      frame_desc: '{1} puting his hands up to steady the Jenga stack.'
    },
    {
      speaker: 2,
      dialog: 'My bad, dawg. Got a little carried away.',
      emotion: 'Sad',
      frame_desc: '{2} looking apologetic and reaching over to fist-bump {1}.'
    },
    {
      speaker: 1,
      dialog: "No worries, big guy. Let's just finish this round and call it a tie.",
      emotion: 'Neutral',
      frame_desc: "{1} points to the Jenga tower and smiles."
    }
  ]
}
ONLY return the valid JSON object, passing anything other than a valid JSON object will kill the application. It must be valid JSON.`;

export async function GenerateStoryboard(prompt: string) {
  let retries = 3;

  while (retries > 0) {
    try {
      let response =
        (await callGPT(storyboard_prompt, [], prompt.trim())) || '';
      let parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;
      let errors = validlateMainPrompt(parsedObject);

      // Retry once
      if (errors.length > 0) {
        const history: ChatCompletionRequestMessage[] = [];
        history.push({ role: 'user', content: prompt.trim() });
        history.push({ role: 'assistant', content: response });

        let correctingPrompt =
          'I noticed some issues with the JSON object you sent. I will list the things I noticed at the end of this message. Please return the JSON object you sent earlier, but with modifications to avoid thet issues specified. As before, only reply with the JSON object.\n';
        correctingPrompt += errors.join('\n');

        response =
          (await callGPT(storyboard_prompt, history, correctingPrompt)) || '';
        parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;
        errors = validlateMainPrompt(parsedObject);

        if (errors.length > 0) {
          const errorMsg =
            'Failed JSON validation upon re-request: ' + errors.join(',');
          console.error(errorMsg);
          throw new SyntaxError(errorMsg);
        }
      }
      // If parsing is successful, it will return the parsed data and exit the loop
      return parsedObject;
    } catch (error) {
      if (error instanceof SyntaxError) {
        retries--; // Decrement the retry counter if a SyntaxError is thrown
        if (retries === 0) {
          console.error('Failed openAI request ', error);
          throw new Error('All retries failed due to JSON parsing error');
        }
      } else {
        // If the error is not a SyntaxError, throw it immediately
        throw error;
      }
    }
  }
  throw new Error();
}

const image_prompt =
  'Given a basic prompt, upscale it into a visually engaging description for an image generation model, focusing on key elements and impactful details while avoiding excessive verbosity. The description should be concise yet impressive, capturing the essence of the scene. Limit your response to a maximum of 50 words.';
export async function GenerateImagePrompt(prompt: string) {
  const response = await callGPT(image_prompt, [], prompt.trim());
  console.log(response);
  return response;
}

// Assumes history in "user, assistant, user, assistant" ordering, with assistant being the last
export async function callGPT(
  seed: string,
  history: ChatCompletionRequestMessage[],
  prompt: string
) {
  let payload: ChatCompletionRequestMessage[] = [];
  payload.push({ role: 'user', content: seed });
  payload = payload.concat(history);
  payload.push({ role: 'user', content: prompt });

  const res = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: payload,
  });

  console.log('Payload: ', payload);
  console.log('Reply with history:', res);

  return res?.data?.choices[0]?.message?.content;
}
