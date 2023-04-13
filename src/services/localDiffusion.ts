import axios from 'axios';
import { GenerateData } from './types';
import { RequestContext } from '../middleware/context';

export async function Generate(data: GenerateData) {
  let start = performance.now()
  const response = await axios.post(
    'http://192.168.1.99:20020/generate',
    data,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const secondResponse = await axios.get(
    `http://192.168.1.99:20020/download/${response.data.download_id}`,
    {
      responseType: 'arraybuffer',
    }
  );

  const filename = secondResponse.headers['content-disposition']
    .split('filename=')[1]
    .replace(/"/g, '');

  let end = performance.now();
  RequestContext.getStore()?.logger.info(`LocalSD Generate took ${(end - start ) / 1000} seconds`);
  return {
    data: secondResponse.data,
    fileName: `${data.seed}_____${filename}`,
  };
}
