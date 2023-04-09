import { PrimaryStoryboardResponse } from './types';

export function validlateMainPrompt(object: PrimaryStoryboardResponse) {
  const emptyDialogFrames = [];
  const dialogExceededFrames = [];
  const imageWordsExceededFrames = [];

  for (let i = 0; i < object.frames.length; i++) {
    const dialogCharacterCount = object.frames[i].dialog.length;

    let transformedImagePrompt = object.frames[i].frame_desc;
    object.speakers.forEach((obj) => {
      const placeholder = `{${obj.id}}`;
      transformedImagePrompt = transformedImagePrompt.replace(
        placeholder,
        obj.description
      );
    });
    const final_prompt = `HD picture of ${transformedImagePrompt} in the style of ${object.theme}. background setting: ${object.setting}`;
    const imageWordCount = final_prompt.trim().split(/\s+/).length;

    // coqui audio lengths
    if (dialogCharacterCount == 0) {
      emptyDialogFrames.push(i);
    } else if (dialogCharacterCount > 250) {
      dialogExceededFrames.push(i);
    }

    // stabilityAI prompt length
    if (imageWordCount > 77) {
      imageWordsExceededFrames.push(i);
    }
  }

  const errors = [];

  if (emptyDialogFrames.length > 0) {
    errors.push(
      `Frame indices with no dialog: ${emptyDialogFrames.join(', ')}`
    );
  } else if (dialogExceededFrames.length > 0) {
    errors.push(
      `Frame indices with dialog exceeding 250 characters: ${dialogExceededFrames.join(
        ', '
      )}`
    );
  } else if (imageWordsExceededFrames.length > 0) {
    errors.push(
      `Frame indices with combined descriptions (theme, setting, frame_desc (with speaker.description substitution)) over 75 words: ${imageWordsExceededFrames.join(
        ', '
      )}`
    );
  }

  return errors;
}
