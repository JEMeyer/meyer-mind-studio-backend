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

  const response = chatCompletion.choices[0].message;
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI callGPT took ${(end - start) / 1000} seconds
    Question: ${JSON.stringify(params)}
    Answer: ${JSON.stringify(response)}`
  );
  return response;
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
  prompt: string;
  negPrompt: string;
}.`;

interface UpscalerResponse {
  prompt: string;
  negPrompt: string;
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
              'A detailed textual description that guides the creation of the image. It should be clear, specific, and descriptive, outlining what you want the generated image to include. This can range from the scene setting, objects, colors, mood, style, and any other relevant details. The more detailed and precise your prompt, the more accurately the generated image will reflect your intended concept.',
          },
          negPrompt: {
            type: 'string',
            description:
              'A negative prompt conditions the model to not include things in an image, and it can be used to improve image quality or modify an image. For example, you can improve image quality by including negative prompts like “poor details” or “blurry” to encourage the model to generate a higher quality image. Or you can modify an image by specifying things to exclude from an image.',
          },
        },
        required: ['prompt', 'negPrompt'],
      },
    },
  ];
  const response = await callGPT(
    `Prompt to upconvert:"""${prompt.trim()}"""`,
    functions,
    [{ role: 'system', content: upscalerInstructins }]
  );
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI GenerateImagePrompt took ${(end - start) / 1000} seconds`
  );
  const results: UpscalerResponse = JSON.parse(
    response.function_call?.arguments ?? `{prompt:'${prompt}',negPrompt:''}`
  );
  RequestContext.getStore()?.logger.info(JSON.stringify(results));
  return results;
}
