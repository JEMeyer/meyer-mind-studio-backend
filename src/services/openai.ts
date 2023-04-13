import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { RequestContext } from '../middleware/context';
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

const image_prompt_upscaler_prompt =
  'Given a basic prompt, upscale it into a visually engaging description for an image generation model, focusing on key elements and impactful details while avoiding excessive verbosity. The description should be concise yet impressive, capturing the essence of the scene. Limit your response to a maximum of 70 words. If you feel anything is inappropriate in the prompt, rephrase it so it adheres to your content policy. Here is the prompt:';
export async function GenerateImagePrompt(prompt: string) {
  const start = performance.now();
  const response = await callGPT(image_prompt_upscaler_prompt + prompt.trim());
  let end = performance.now();
  RequestContext.getStore()?.logger.info(`OpenAI GenerateImagePrompt took ${(end - start ) / 1000} seconds`);
  return response;
}
