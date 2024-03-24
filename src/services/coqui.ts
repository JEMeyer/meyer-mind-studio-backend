import axios from 'axios';
import { RequestContext } from '../middleware/context';
import { CoquiAPIError } from '../tools/exceptions';
import { downloadFile, isEnumKey } from '../tools/utilities';

type Speakers = {
  [name: string]: {
    speaker_embedding: number[];
    gpt_cond_latent: number[][];
  };
};

let SPEAKERS: Speakers = {};

enum Language {
  'English' = 'en',
  'Spanish' = 'es',
  'French' = 'fr',
  'German' = 'de',
  'Italian' = 'it',
  'Portuguese' = 'pt',
  'Polish' = 'pl',
  'Turkish' = 'tr',
  'Russian' = 'ru',
  'Dutch' = 'nl',
  'Czech' = 'cs',
  'Arabic' = 'ar',
  'Chinese' = 'zh-cn',
  'Hungarian' = 'hu',
  'Korean' = 'ko',
  'Japanese' = 'ja',
  'Hindi' = 'hi',
}

export function getRandomVoice(_gender: string, voicesUsed: Set<string>) {
  const voices = Object.keys(SPEAKERS).filter((name) => !voicesUsed.has(name));
  const randIndex = Math.floor(Math.random() * voices.length);
  return voices[randIndex];
}

function removeSpecialChars(str: string) {
  return str.replace(/[¿¡]/g, '');
}

type CreateSoundSampleProps = {
  folder: string;
  index: string;
  language: Language;
  text: string;
  voiceId: string;
};

export async function CreateSoundSample({
  folder,
  index,
  language,
  text,
  voiceId,
}: CreateSoundSampleProps) {
  const start = performance.now();
  const speaker = SPEAKERS[voiceId];
  const local_language = isEnumKey(Language, language)
    ? language
    : Language.English;

  const options = {
    method: 'POST',
    url: `https://${process.env.COQUI_URL}/tts`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
    },
    data: {
      speaker_embedding: speaker.speaker_embedding,
      gpt_cond_latent: speaker.gpt_cond_latent,
      text: removeSpecialChars(text),
      language: local_language,
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

export async function CreateSoundSampleStream({
  folder,
  index,
  language,
  text,
  voiceId,
}: CreateSoundSampleProps) {
  const start = performance.now();
  const speaker = SPEAKERS[voiceId];
  const local_language = isEnumKey(Language, language)
    ? language
    : Language.English;

  const options = {
    method: 'POST',
    url: `https://${process.env.COQUI_URL}/tts_stream`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
    },
    data: {
      speaker_embedding: speaker.speaker_embedding,
      gpt_cond_latent: speaker.gpt_cond_latent,
      text: removeSpecialChars(text),
      language: local_language,
      add_wav_header: true,
      stream_chunk_size: '20',
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

export async function PopulateSpeakerList() {
  const start = performance.now();

  const options = {
    method: 'GET',
    url: `https://${process.env.COQUI_URL}/studio_speakers`,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  try {
    const response = await axios.request(options);
    SPEAKERS = response.data as Speakers;

    const end = performance.now();
    RequestContext.getStore()?.logger.info(
      `Coqui PopulatSpeakerList took ${(end - start) / 1000} seconds`
    );
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}
