import axios from 'axios';
import { RequestContext } from '../middleware/context';

export async function perplexityChat({
  query,
  model = 'llama-3-sonar-small-32k-online',
}: {
  query: string;
  model?: string;
}) {
  const options = {
    method: 'POST',
    url: 'https://api.perplexity.ai/chat/completions',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.PPLX_API_KEY}`,
    },
    data: {
      model,
      messages: [{ role: 'user', content: query }],
    },
  };

  const response = await axios.request(options);
  const answer = String(response.data.choices[0].message.content);

  RequestContext.getStore()?.logger.info(
    `Perplexity Question: ${query}\nPerplexity Answer: ${answer}`
  );

  return answer;
}
