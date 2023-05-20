import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { RequestContext } from '../middleware/context';
import * as Stability from './stabilityai';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function callGPT(
  prompt: string,
  history?: ChatCompletionRequestMessage[]
) {
  const start = performance.now();
  let payload: ChatCompletionRequestMessage[] = [];
  payload = payload.concat(history || []);
  payload.push({ role: 'user', content: prompt });

  const res = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: payload,
    // top_p: .8,
    //presence_penalty: .5,
    //frequency_penalty: .5,
    // max_tokens: 1500
  });

  const answer = res?.data?.choices[0]?.message?.content;
  let end = performance.now();
  RequestContext.getStore()?.logger.info(`OpenAI callGPT took ${(end - start ) / 1000} seconds`);
  return answer;
}

export async function callGPT4(
  prompt: string,
  history?: ChatCompletionRequestMessage[]
) {
  const start = performance.now();
  let payload: ChatCompletionRequestMessage[] = [];
  payload = payload.concat(history || []);
  payload.push({ role: 'user', content: prompt });

  const res = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: payload,
    // top_p: .8,
    //presence_penalty: .5,
    //frequency_penalty: .5,
    // max_tokens: 1500
  });

  const answer = res?.data?.choices[0]?.message?.content;
  let end = performance.now();
  RequestContext.getStore()?.logger.info(`OpenAI callGPT4 took ${(end - start ) / 1000} seconds`);
  return answer;
}

const image_prompt_upscaler_prompt =
  'You are a prompt generator for Stability AI. Using the best practices described, I want you to take a prompt for an image as input, and output a better prompt that uses the best practices. If there are specific elements in the input prompt, keep them in the output. If the input is very vague and you think a prompt will be better with some details, create some details on your own. Limit your response to a maximum of 70 words. If you feel anything is inappropriate in the prompt, rephrase it so it adheres to your content policy. Use the best practices from the message previously sent. Make sure the description is concise, specific, uses correct terminology, and has balanced weights balanced weights. An example of a sentence using the weight is: "Homer Simpson, bald, overweight, white shirt, blue pants entering Simpsons house: 0.6 Simpsons gathered to welcome : 0.5". Return only the new prompt. Here is the seed prompt:';
export async function GenerateImagePrompt(prompt: string) {
  const start = performance.now();
  const response = await callGPT(`${image_prompt_upscaler_prompt}"""${prompt.trim()}"""`, [{role: 'user', content: Stability.StabilityBestPractices}]);
  let end = performance.now();
  RequestContext.getStore()?.logger.info(`OpenAI GenerateImagePrompt took ${(end - start ) / 1000} seconds`);
  return response;
}
