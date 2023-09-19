import axios from 'axios';
import { GenerateData } from './types';
import { RequestContext } from '../middleware/context';
import { StabilityAPIError } from '../tools/exceptions';
import fs from 'fs/promises';
import { Character } from '../types/types';
import path from 'path';

export async function Generate(data: GenerateData) {
  let start = performance.now()
  const response = await axios.post(
    `http://${process.env.LOCAL_AI_SERVER}:20020/generate`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const secondResponse = await axios.get(
    `http://${process.env.LOCAL_AI_SERVER}:20020/download/${response.data.download_id}`,
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

export async function GenerateFrame(
  prompt: string,
  characters: Character[],
  theme: string,
  setting: string,
  folder: string
) {
  try {
    let start = performance.now();
    let transformedPrompt = prompt;
    characters.forEach((obj) => {
      const placeholder = `{${obj.id}}`;
      transformedPrompt = transformedPrompt.replace(
        placeholder,
        obj.description
      );
    });

    const finalPrompt = `HD picture of ${transformedPrompt} in the style of ${theme}. background setting: ${setting}`;
    const scale = 7.5;
    const steps =  50;
    const seed = 3465383516;

    const response = await axios.post(
      `http://${process.env.LOCAL_AI_SERVER}:20020/generate`,
      {prompt: finalPrompt, scale, steps, seed},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const secondResponse = await axios.get(
      `http://${process.env.LOCAL_AI_SERVER}:20020/download/${response.data.download_id}`,
      {
        responseType: 'arraybuffer',
      }
    );
    
    const filename = secondResponse.headers['content-disposition']
      .split('filename=')[1]
      .replace(/"/g, '');
    
    // Construct the full file path
    const fullPath = path.join(folder, filename);
    
    // Save the image data to the file
    await fs.writeFile(fullPath, secondResponse.data);
    
    let end = performance.now();
    RequestContext.getStore()?.logger.info(`LocalSD GenerateFrame took ${(end - start ) / 1000} seconds`);
    return fullPath;
  } catch (e) {
    console.error(e);
    throw new StabilityAPIError();
  }
}
