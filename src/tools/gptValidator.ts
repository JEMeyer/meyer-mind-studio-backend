import { CoquiEmotion } from '../services/coqui';
import { PrimaryStoryboardResponse } from './types';

export function validlateMainPrompt(object: PrimaryStoryboardResponse) {
  const emptyDialogFrames = [];
  const dialogExceededFrames = [];
  const imageWordsExceededFrames = [];
  const invalidEmotionFrames = [];

  for (let i = 0; i < object.frames.length; i++) {
    const dialogCharacterCount = object.frames[i].dialog.length;

    let transformedImagePrompt = object.frames[i].visual_description;
    object.speakers.forEach((obj) => {
      const placeholder = `{${obj.id}}`;
      transformedImagePrompt = transformedImagePrompt.replace(
        placeholder,
        obj.visual_description
      );
    });
    const final_prompt = `HD picture of ${transformedImagePrompt} in the style of ${object.theme_visuals}. background setting: ${object.setting_description}`;
    const imageWordCount = final_prompt.trim().split(/\s+/).length;

    // coqui audio lengths and emotion
    if (dialogCharacterCount == 0) {
      emptyDialogFrames.push(i);
    } else if (dialogCharacterCount > 250) {
      dialogExceededFrames.push(i);
    }

    if (!Object.values(CoquiEmotion).includes(object.frames[i].emotion)) {
      invalidEmotionFrames.push(i);
    }

    // stabilityAI prompt length
    if (imageWordCount > 77) {
      imageWordsExceededFrames.push(i);
    }
  }

  const errors = [];

  if (emptyDialogFrames.length > 0) {
    errors.push(
      `Problem: No frame dialog (at least one word required, add interjection). Frame indices with issue: ${emptyDialogFrames.join(
        ', '
      )}`
    );
  } else if (dialogExceededFrames.length > 0) {
    errors.push(
      `Problem: Frame dialog exceeding 250 characters (make it more concise). Frame indices with issue: ${dialogExceededFrames.join(
        ', '
      )}`
    );
  } else if (imageWordsExceededFrames.length > 0) {
    errors.push(
      `Problem: Combined descriptions (theme_visuals, setting_description, frame.visual_description (with speaker.visual_description substitutions eg "{1} stands up" becomes "speaker1.visual_description stands up" but with the actual substitution done)) over 65 words. Removing excess character references from the frame.visual_description is likely a good way, as is making the object's setting_description and theme_visuals more concise. Frame indices with issue: ${imageWordsExceededFrames.join(
        ', '
      )}`
    );
  } else if (invalidEmotionFrames.length > 0) {
    errors.push(
      `Problem: Emotion is not one of the valid options of [${Object.values(
        CoquiEmotion
      ).join(
        ', '
      )}] - pick one that fits the dialog in the frame. Frame indices with issue: ${invalidEmotionFrames.join(
        ', '
      )}`
    );
  }

  return errors;
}
