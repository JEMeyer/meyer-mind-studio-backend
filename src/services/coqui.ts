import axios from 'axios';
import fs from 'fs';
import { RequestContext } from '../middleware/context';
import { CoquiAPIError } from '../tools/exceptions';
import { isEnumKey } from '../tools/utilities';

const coquiUrlBase = process.env.COQUI_URL_BASE;
const coquiUrlPorts: string[] = process.env.COQUI_URL_PORTS?.split(',') ?? [];

// Initialize the current index for round-robin
let currentIndex = 0;

function getNextUrl(): string {
  // Return the next URL in the array and increment the current index
  const port = coquiUrlPorts[currentIndex];
  currentIndex = (currentIndex + 1) % coquiUrlPorts.length;
  return `${coquiUrlBase}:${port}`;
}

interface Speaker {
  speaker_embedding: number[];
  gpt_cond_latent: number[][];
}

let SPEAKERS: Record<string, Speaker> = {};

export enum Language {
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

const maleVoices = [
  'Andrew Chipper',
  'Badr Odhiambo',
  'Dionisio Schuyler',
  'Royston Min',
  'Viktor Eka',
  'Abrahan Mack',
  'Adde Michal',
  'Baldur Sanjin',
  'Craig Gutsy',
  'Damien Black',
  'Gilberto Mathias',
  'Ilkin Urbano',
  'Kazuhiko Atallah',
  'Ludvig Milivoj',
  'Suad Qasim',
  'Torcull Diarmuid',
  'Viktor Menelaos',
  'Zacharie Aimilios',
  'Nova Hogarth',
  'Filip Trauve',
  'Damjan Chapman',
  'Wulf Carlevaro',
  'Aaron Dreschner',
  'Kumar Dahl',
  'Eugenio Mataracı',
  'Ferran Simen',
  'Xavier Hayasaka',
  'Luis Moray',
  'Marcos Rudaski',
];

const femaleVoices = [
  'Claribel Dervla',
  'Daisy Studious',
  'Gracie Wise',
  'Tammie Ema',
  'Alison Dietlinde',
  'Ana Florence',
  'Annmarie Nele',
  'Asya Anara',
  'Brenda Stern',
  'Gitta Nikolina',
  'Henriette Usha',
  'Sofia Hellen',
  'Tammy Grit',
  'Tanja Adelina',
  'Vjollca Johnnie',
  'Maja Ruoho',
  'Uta Obando',
  'Lidiya Szekeres',
  'Chandra MacFarland',
  'Szofi Granger',
  'Camilla Holmström',
  'Lilya Stainthorpe',
  'Zofija Kendrick',
  'Narelle Moon',
  'Barbora MacLean',
  'Alexandra Hisakawa',
  'Alma María',
  'Rosemary Okafor',
  'Ige Behringer',
];

export function getRandomVoice(gender: string, voicesUsed: Set<string>) {
  const voices =
    gender.toLowerCase() === 'male'
      ? maleVoices.filter((name) => !voicesUsed.has(name))
      : femaleVoices.filter((name) => !voicesUsed.has(name));
  const randIndex = Math.floor(Math.random() * voices.length);
  return voices[randIndex];
}

function removeSpecialChars(str: string) {
  return str.replace(/[¿¡]/g, '');
}

type CreateSoundSampleProps = {
  folder?: string;
  index?: string;
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
    url: `${getNextUrl()}/tts`,
    headers: {
      'Content-Type': 'application/json',
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
    const audioPath = `${folder}/audio-${index}.wav`;
    await fs.promises.writeFile(
      audioPath,
      Buffer.from(response.data, 'base64')
    );
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
    url: `${getNextUrl()}/tts_stream`,
    headers: {
      'Content-Type': 'application/json',
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
    const end = performance.now();
    RequestContext.getStore()?.logger.info(
      `Coqui CreateSoundSampleStream first chunk took ${
        (end - start) / 1000
      } seconds`
    );
    return response.data.readablStream;
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}

async function fetchStudioSpeakers() {
  const start = performance.now();

  const options = {
    method: 'GET',
    url: `${getNextUrl()}/studio_speakers`,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await axios.request(options);
    const end = performance.now();
    RequestContext.getStore()?.logger.info(
      `Coqui PopulatSpeakerList took ${(end - start) / 1000} seconds`
    );

    return response.data as Record<string, Speaker>;
  } catch (e) {
    console.error(e);
    throw new CoquiAPIError();
  }
}

export async function PopulateSpeakerList() {
  SPEAKERS = await fetchStudioSpeakers();
}
