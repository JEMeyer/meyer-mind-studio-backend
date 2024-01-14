import axios from 'axios';
import { GenerateData } from './types';
import { RequestContext } from '../middleware/context';
import { ImageGenAPIError } from '../tools/exceptions';
import fs from 'fs/promises';
import { Character } from '../types/types';
import path from 'path';

export const ImageGenBestPractices = `To create a visual description for Stability AI, follow these best practices:
1. Be specific and concise: Use specific terms and keep the description under 20 words.
2. Use correct terminology: Use appropriate terms for objects, colors, and actions.
3. Weighted terms: Include weights for important terms to influence the AI's focus. Example: "fujifilm: 1 | centered: .1".
4. Balance weights: Avoid using extreme weights. Keep them between 0.01 and 1.
`;

export async function Generate(data: GenerateData) {
  const start = performance.now();
  const response = await axios.post(
    data.secondaryServer
      ? `http://${process.env.LOCAL_SECONDARY_AI_SERVER}:8000/generate`
      : `http://${process.env.LOCAL_AI_SERVER}:8000/generate`,
    {
      prompt: data.prompt,
      negPrompt: data.negPrompt,
    },
    {
      responseType: 'arraybuffer',
    }
  );

  const filename = response.headers['content-disposition']
    .split('filename=')[1]
    .replace(/"/g, '');

  const end = performance.now();
  console.info(`Generate took ${(end - start) / 1000} seconds`);

  return {
    data: response.data,
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
    const start = performance.now();
    let transformedPrompt = prompt;
    characters.forEach((obj) => {
      const placeholder = `{${obj.id}}`;
      transformedPrompt = transformedPrompt.replace(
        placeholder,
        obj.description
      );
    });

    const finalPrompt = `HD picture of ${transformedPrompt} in the style of ${theme}. background setting: ${setting}`;
    // const scale = 7.5;
    // const steps =  50;
    // const seed = 3465383516;

    const response = await axios.post(
      `http://${process.env.LOCAL_AI_SERVER}:8000/generate`,
      {
        prompt: finalPrompt,
      },
      {
        responseType: 'arraybuffer',
      }
    );

    const filename = response.headers['content-disposition']
      .split('filename=')[1]
      .replace(/"/g, '');

    // Construct the full file path
    const fullPath = path.join(folder, filename);

    // Save the image data to the file
    await fs.writeFile(fullPath, response.data);

    const end = performance.now();
    RequestContext.getStore()?.logger.info(
      `LocalSD GenerateFrame took ${(end - start) / 1000} seconds`
    );
    return fullPath;
  } catch (e) {
    console.error(e);
    throw new ImageGenAPIError();
  }
}
