import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function callGPT(
  prompt: string,
  history?: ChatCompletionRequestMessage[],
) {
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
  console.log('GPT Response', answer);
  return answer;
}
