import { OpenAI } from 'openai';
import { RequestContext } from '../middleware/context';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from 'openai/resources';

const openai = new OpenAI();

export async function callGPT(
  prompt: string,
  functions: ChatCompletionCreateParams.Function[],
  history?: ChatCompletionMessageParam[]
) {
  const start = performance.now();
  let payload: ChatCompletionMessageParam[] = [];
  payload = payload.concat(history || []);
  payload.push({ role: 'user', content: prompt });

  const params: ChatCompletionCreateParams = {
    model: 'gpt-3.5-turbo',
    messages: payload,
    functions: functions,
    // ... other parameters
  };
  const chatCompletion = await openai.chat.completions.create(params);

  const answer = chatCompletion.choices[0].message.content ?? '';
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI callGPT took ${(end - start) / 1000} seconds`
  );
  return answer;
}

export async function callGPT4(
  prompt: string,
  history?: ChatCompletionMessageParam[]
) {
  const start = performance.now();
  let payload: ChatCompletionMessageParam[] = [];
  payload = payload.concat(history || []);
  payload.push({ role: 'user', content: prompt });

  const params = {
    model: 'gpt-4',
    messages: payload,
    // ... other parameters
  };
  const chatCompletion = await openai.chat.completions.create(params);

  const answer = chatCompletion.choices[0].message.content;
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI callGPT4 took ${(end - start) / 1000} seconds`
  );
  return answer;
}

const upscalerInstructins = `You are a prompt upscaler. Given a seed prompt from a user, to generate an 'upscaled' prompt and a negative prompt:
Upscaled Prompt Generation:
Enhance Specificity: Add specific details related to the desired outcome, such as artists, styles, emotions, or physical characteristics.
Quality Mention: Ensure to mention the desired quality and resolution.
Incorporate Known References: If possible, incorporate references to known artists, artworks, or styles that align with the desired outcome.
Negative Prompt Generation:
Identify Common Undesired Elements: Identify elements that are commonly undesired or misinterpreted in generated images and mention them in the negative prompt.
Quality Mention: Mention any undesired qualities or characteristics that should be avoided in the generated image.
Specific Avoidances: Mention any specific features, styles, or elements that should be avoided in the generated image.
Example: If a user provides a seed prompt like "A fantasy warrior with a mystical sword", the LLM might generate:
Upscaled Prompt: "A high-resolution 4k fantasy warrior, adorned in intricate armor, wielding a mystical sword enveloped in a glowing aura, in a style reminiscent of artists like H.R. Giger and Yoshitaka Amano, with a dark, ethereal background."
Negative Prompt: "(flower:1.2), (Facial Marking:1.1), nude, (bad art, low detail, pencil drawing:1.4), (plain background, grainy, low quality:1.4), watermark, signature, extra limbs, missing fingers, cropped."
You will do all of this by using a function called "imageGeneratorFromUpscaler", returning data in JSON format matching the shape {
  upscaledPrompt: string;
  negativePrompt: string;
}.`;

interface UpscalerResponse {
  upscaledPrompt: string;
  negativePrompt: string;
}

export async function GenerateImagePrompt(prompt: string) {
  const start = performance.now();
  const functions: ChatCompletionCreateParams.Function[] = [
    {
      name: 'imageGeneratorPromptUpscaler',
      description:
        'Takes in a single prompt and generates an "upscaled" prompt and a negative prompt for image generation using a diffusion model.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'The seed prompt for generating the upscaled and negative prompts',
          },
        },
        required: ['prompt'],
      },
    },
  ];
  const response: UpscalerResponse = JSON.parse(
    await callGPT(`Prompt to upconvert:"""${prompt.trim()}"""`, functions, [
      { role: 'system', content: upscalerInstructins },
    ])
  );
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI GenerateImagePrompt took ${(end - start) / 1000} seconds`
  );
  return response;
}
