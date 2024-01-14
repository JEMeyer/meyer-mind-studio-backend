import axios from 'axios';
import { downloadFile, isEnumKey } from '../tools/utilities';
import { CoquiAPIError } from '../tools/exceptions';
import { RequestContext } from '../middleware/context';

export enum CoquiEmotion {
  Neutral = 'Neutral',
  Happy = 'Happy',
  Sad = 'Sad',
  Surprise = 'Surprise',
  Angry = 'Angry',
  Dull = 'Dull',
}

function removeSpecialChars(str: string) {
  return str.replace(/[¿¡]/g, '');
}

export async function CreateSoundSample(
  voiceId: string,
  text: string,
  emotion: string,
  folder: string,
  index: string
) {
  const start = performance.now();
  const local_emotion = isEnumKey(CoquiEmotion, emotion) ? emotion : 'Neutral';

  const options = {
    method: 'POST',
    url: 'https://app.coqui.ai/api/v2/samples',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
    },
    data: {
      voice_id: voiceId,
      name: 'temp',
      text: removeSpecialChars(text),
      emotion: local_emotion,
    },
  };
  try {
    const response = await axios.request(options);
    const audio_url = response.data.audio_url;

    const audioPath = `${folder}/audio-${index}.wav`;
    await downloadFile(audio_url, audioPath);
    const end = performance.now();
    RequestContext.getStore()?.logger.info(
      `Coqui CreateSoundSample took ${(end - start) / 1000} seconds`
    );
    return audioPath;
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}

export async function CreateXTTSSoundSample(
  voiceId: string,
  text: string,
  folder: string,
  index: string
) {
  const start = performance.now();

  const options = {
    method: 'POST',
    url: 'https://app.coqui.ai/api/v2/samples/xtts/render/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
    },
    data: {
      voice_id: voiceId,
      text: removeSpecialChars(text),
    },
  };
  try {
    const response = await axios.request(options);
    const audio_url = response.data.audio_url;

    const audioPath = `${folder}/audio-${index}.wav`;
    await downloadFile(audio_url, audioPath);
    const end = performance.now();
    RequestContext.getStore()?.logger.info(
      `Coqui CreateSoundSample took ${(end - start) / 1000} seconds`
    );
    return audioPath;
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}

export async function VoiceFromPrompt(speaker_prompt: string) {
  const options = {
    method: 'POST',
    url: 'https://app.coqui.ai/api/v2/voices/from-prompt/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
    },
    data: {
      prompt: speaker_prompt,
      name: 'temp',
    },
  };

  try {
    const response = await axios.request(options);

    return response.data.id;
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}

export async function XTTSVoiceFromPrompt(speaker_prompt: string) {
  const options = {
    method: 'POST',
    url: 'https://app.coqui.ai/api/v2/voices/xtts/from-prompt/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
    },
    data: {
      prompt: speaker_prompt,
      name: 'temp',
    },
  };

  try {
    const response = await axios.request(options);

    return response.data.id;
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}
