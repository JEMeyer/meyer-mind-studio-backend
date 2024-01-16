import { Request } from 'express';

export type Character = {
  id: number;
  voiceName: string;
  description: string;
};

export type Transcript = {
  duration: number;
  text: string;
};

type StoryboardSpeaker = {
  id: number;
  visualDescription: string;
  gender: 'male' | 'female';
};
type StoryboardFrame = {
  speakerId: number;
  dialog: string;
  visualDescription: string;
};
export type PrimaryStoryboardResponse = {
  name: string;
  settingDescription: string;
  themeVisuals: string;
  negativePrompt: string;
  speakers: StoryboardSpeaker[];
  frames: StoryboardFrame[];
};

export interface CustomRequest extends Request {
  userId?: string;
}
