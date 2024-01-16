import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { RequestContext } from '../middleware/context';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.SPEECH_KEY!,
  process.env.SPEECH_REGION!
);

const enUS_Voices = [
  { Name: 'en-US-JennyMultilingualNeural', Gender: 'Female' },
  { Name: 'en-US-JennyMultilingualV2Neural', Gender: 'Female' },
  { Name: 'en-US-RyanMultilingualNeural', Gender: 'Male' },
  { Name: 'en-US-JennyNeural', Gender: 'Female' },
  { Name: 'en-US-GuyNeural', Gender: 'Male' },
  { Name: 'en-US-AriaNeural', Gender: 'Female' },
  { Name: 'en-US-DavisNeural', Gender: 'Male' },
  { Name: 'en-US-AmberNeural', Gender: 'Female' },
  { Name: 'en-US-AnaNeural', Gender: 'Female' },
  { Name: 'en-US-AndrewNeural', Gender: 'Male' },
  { Name: 'en-US-AshleyNeural', Gender: 'Female' },
  { Name: 'en-US-BrandonNeural', Gender: 'Male' },
  { Name: 'en-US-BrianNeural', Gender: 'Male' },
  { Name: 'en-US-ChristopherNeural', Gender: 'Male' },
  { Name: 'en-US-CoraNeural', Gender: 'Female' },
  { Name: 'en-US-ElizabethNeural', Gender: 'Female' },
  { Name: 'en-US-EmmaNeural', Gender: 'Female' },
  { Name: 'en-US-EricNeural', Gender: 'Male' },
  { Name: 'en-US-JacobNeural', Gender: 'Male' },
  { Name: 'en-US-JaneNeural', Gender: 'Female' },
  { Name: 'en-US-JasonNeural', Gender: 'Male' },
  { Name: 'en-US-MichelleNeural', Gender: 'Female' },
  { Name: 'en-US-MonicaNeural', Gender: 'Female' },
  { Name: 'en-US-NancyNeural', Gender: 'Female' },
  { Name: 'en-US-RogerNeural', Gender: 'Male' },
  { Name: 'en-US-SaraNeural', Gender: 'Female' },
  { Name: 'en-US-SteffanNeural', Gender: 'Male' },
  { Name: 'en-US-TonyNeural', Gender: 'Male' },
  { Name: 'en-US-AIGenerate1Neural', Gender: 'Male' },
  { Name: 'en-US-AIGenerate2Neural', Gender: 'Female' },
  { Name: 'en-US-AndrewMultilingualNeural', Gender: 'Male' },
  { Name: 'en-US-AvaMultilingualNeural', Gender: 'Female' },
  { Name: 'en-US-AvaNeural', Gender: 'Female' },
  { Name: 'en-US-BrianMultilingualNeural', Gender: 'Male' },
  { Name: 'en-US-EmmaMultilingualNeural', Gender: 'Female' },
];

const genderlessVoice = { Name: 'en-US-BlueNeural', Gender: 'Neutral' };

const maleVoices = enUS_Voices
  .filter((voice) => voice.Gender === 'Male')
  .concat(genderlessVoice);
const femaleVoices = enUS_Voices
  .filter((voice) => voice.Gender === 'Female')
  .concat(genderlessVoice);

export function getRandomVoice(gender: string, voicesUsed: Set<string>) {
  const voices =
    gender.toLowerCase() === 'male'
      ? maleVoices.filter(({ Name }) => !voicesUsed.has(Name))
      : femaleVoices.filter(({ Name }) => !voicesUsed.has(Name));
  const randIndex = Math.floor(Math.random() * voices.length);
  return voices[randIndex].Name;
}

export async function generateAudio(
  text: string,
  voiceName: string,
  folder: string,
  index: string
) {
  const start = performance.now();
  const audioPath = `${folder}/audio-${index}.wav`;
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioPath);

  speechConfig.speechSynthesisVoiceName = voiceName;

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
  synthesizer?.speakTextAsync(
    text,
    (result) => {
      if (result) {
        RequestContext.getStore()?.logger.info(`Audio written to ${audioPath}`);
      }
      synthesizer?.close();
      const end = performance.now();
      RequestContext.getStore()?.logger.info(
        `MS STT took ${(end - start) / 1000} seconds`
      );
    },
    (err) => {
      RequestContext.getStore()?.logger.error(err);
      synthesizer?.close();
    }
  );
  return audioPath;
}
