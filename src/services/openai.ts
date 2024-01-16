import { OpenAI } from 'openai';
import { RequestContext } from '../middleware/context';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
} from 'openai/resources';
import { ImageGenBestPractices } from './localDiffusion';

const openai = new OpenAI();

export async function callGPT(
  prompt: string,
  tools?: ChatCompletionTool[],
  history?: ChatCompletionMessageParam[]
) {
  const start = performance.now();
  let payload: ChatCompletionMessageParam[] = [];
  payload = payload.concat(history || []);
  payload.push({ role: 'user', content: prompt });

  let toolChoice: ChatCompletionToolChoiceOption | undefined;
  if (tools?.length === 1) {
    toolChoice = {
      type: 'function',
      function: { name: tools[0].function.name },
    };
  } else if ((tools?.length ?? 0) > 1) {
    toolChoice = 'auto';
  }

  const params: ChatCompletionCreateParams = {
    model: 'gpt-3.5-turbo-1106',
    messages: payload,
    tools,
    tool_choice: toolChoice,
  };
  const chatCompletion = await openai.chat.completions.create(params);

  const response = chatCompletion.choices[0].message;
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI callGPT took ${(end - start) / 1000} seconds`
  );
  return response;
}

export async function callGPT4(
  prompt: string,
  tools?: ChatCompletionTool[],
  history?: ChatCompletionMessageParam[]
) {
  const start = performance.now();
  let payload: ChatCompletionMessageParam[] = [];
  payload = payload.concat(history || []);
  payload.push({ role: 'user', content: prompt });

  let toolChoice: ChatCompletionToolChoiceOption | undefined;
  if (tools?.length === 1) {
    toolChoice = {
      type: 'function',
      function: { name: tools[0].function.name },
    };
  } else if ((tools?.length ?? 0) > 1) {
    toolChoice = 'auto';
  }

  const params = {
    model: 'gpt-4-1106-preview',
    messages: payload,
    tools,
    tool_choice: toolChoice,
  };
  const chatCompletion = await openai.chat.completions.create(params);

  const answer = chatCompletion.choices[0].message;
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI callGPT4 took ${(end - start) / 1000} seconds`
  );
  return answer;
}

const upscalerInstructions = `${ImageGenBestPractices} Use the function "imageGeneratorFromUpscaler" to return data in JSON format matching the specified shape. The output should have a prompt and a negative prompt, adhering to these best practices.`;

interface UpscalerResponse {
  prompt: string;
  negPrompt: string;
}

export async function GenerateImagePrompt(prompt: string) {
  const start = performance.now();
  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
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
    },
  ];
  const response = await callGPT4(
    `Prompt to upconvert:"""${prompt.trim()}"""`,
    tools,
    [{ role: 'system', content: upscalerInstructions }]
  );
  const end = performance.now();
  RequestContext.getStore()?.logger.info(
    `OpenAI GenerateImagePrompt took ${(end - start) / 1000} seconds`
  );
  const results: UpscalerResponse = JSON.parse(
    (response.tool_calls && response.tool_calls[0].function.arguments) ??
      `{prompt:'${prompt}',negPrompt:''}`
  );
  return results;
}
