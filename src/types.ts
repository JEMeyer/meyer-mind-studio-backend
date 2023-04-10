import { CoquiEmotion } from "./coqui";

export type Character = {
  id: number;
  voiceId: string;
  description: string;
};

export type GenerateData = {
  prompt: string;
  scale: number;
  steps: number;
  seed: number;
};

export type Transcript = {
  duration: number;
  text: string;
};

declare type ImageData = {
  buffer: Buffer;
  filePath: string;
  seed: number;
  mimeType: string;
  classifications: {
    realizedAction: number;
  };
};
declare type ResponseData = {
  isOk: boolean;
  status: string;
  code: string;
  message: string;
};
export type GenerateResponse = {
  images: ImageData[];
  res: ResponseData;
};

type StoryboardSpeaker = {
  id: number;
  visual_description: string;
  voice_description: string;
};
type StoryboardFrame = {
  speakerId: number;
  dialog: string;
  emotion: CoquiEmotion;
  visual_description: string;
};
export type PrimaryStoryboardResponse = {
  name: string;
  setting_description: string;
  theme_visuals: string;
  speakers: StoryboardSpeaker[];
  frames: StoryboardFrame[];
}
