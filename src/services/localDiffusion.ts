import axios from 'axios';
import { GenerateData } from './types';
import { RequestContext } from '../middleware/context';
import { ImageGenAPIError } from '../tools/exceptions';
import fs from 'fs/promises';
import { Character } from '../types/types';
import path from 'path';

export const ImageGenBestPractices = `To create a visual description for Stability AI effectively, follow these best practices:
1. Be specific and concise: Use specific terms and keep the description under 20 words. Enhance specificity by adding details related to the desired outcome, such as artists, styles, emotions, or physical characteristics.
2. Use correct terminology: Employ appropriate terms for objects, colors, actions, and artistic styles. Incorporate references to known artists, artworks, or styles that align with the desired outcome.
3. Quality Mention: Ensure to mention the desired quality, resolution, and any important characteristics of the image.
5. Negative Prompt Generation: Identify and mention elements that are commonly undesired or misinterpreted in generated images. For the negative prompt, remove filler words and focus on a list of descriptive words. Do not include negations; instead, mention the undesired elements directly. Example: "blurry, grainy, watermark".
6. Specific Avoidances: Mention any specific features, styles, or elements that should be avoided in the generated image. This includes undesired qualities or characteristics (only for negative prompts).
Prompt Generation:
Enhance Specificity: Add specific details related to the desired outcome, such as artists, styles, emotions, or physical characteristics.
Quality Mention: Ensure to mention the desired quality and resolution.
Incorporate Known References: If possible, incorporate references to known artists, artworks, or styles that align with the desired outcome.
Negative Prompt Generation:
Identify Common Undesired Elements: Identify elements that are commonly undesired or misinterpreted in generated images and mention them in the negative prompt.
Quality Mention: Mention any undesired qualities or characteristics that should be avoided in the generated image.
Specific Avoidances: Mention any specific features, styles, or elements that should be avoided in the generated image.
By default, prompts are assumed to be 'positive' prompts, so only include the negative prompt words/undesireable traits in fields that say 'neg' or 'negative' in them.
Example: For a seed prompt like "A fantasy warrior with a mystical sword", the LLM might generate:
Prompt: "A high-resolution 4k fantasy warrior, adorned in intricate armor, wielding a mystical sword enveloped in a glowing aura, in a style reminiscent of artists like H.R. Giger and Yoshitaka Amano, with a dark, ethereal background."
Negative Prompt: "flower, Facial Marking, nude, bad art, low detail, pencil drawing, plain background, grainy, low quality, watermark, signature, extra limbs, missing fingers, cropped."`;

export async function GenerateXL(data: GenerateData) {
  const start = performance.now();
  const response = await axios.post(
    `http://${process.env.IMAGE_AI_SERVER}:8000/generate`,
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
  negativePrompt: string,
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

    const finalPrompt = `${transformedPrompt} in the style of ${theme}. background setting: ${setting}`;

    const response = await axios.post(
      `http://${process.env.IMAGE_AI_SERVER}:8000/generate`,
      {
        prompt: finalPrompt,
        negPrompt: negativePrompt,
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
    RequestContext.getStore()?.logger.error(e);
    throw new ImageGenAPIError();
  }
}
