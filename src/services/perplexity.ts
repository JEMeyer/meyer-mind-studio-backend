import axios from 'axios';
import { RequestContext } from '../middleware/context';

export async function perplexityChat({
  query,
  model = 'sonar-small-online',
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
      messages: [
        {
          role: 'system',
          content: `Provide relevant information for the user's question using the most up-to-date information available. This is the only time the user is able to get any information for this, so be sure to always return plenty of context, even if you have to guess the intent in order to do a more in depth search.`,
        },
        { role: 'user', content: query },
      ],
    },
  };

  const response = await axios.request(options);
  const answer = String(response.data.choices[0].message.content);

  RequestContext.getStore()?.logger.info(
    `Perplexity Question: ${query}\nPerplexity Answer: ${answer}`
  );

  return answer;
}
