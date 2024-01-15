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
  visual_description: string;
  gender: string;
};
type StoryboardFrame = {
  speakerId: number;
  dialog: string;
  visual_description: string;
};
export type PrimaryStoryboardResponse = {
  name: string;
  setting_description: string;
  theme_visuals: string;
  speakers: StoryboardSpeaker[];
  frames: StoryboardFrame[];
};

export interface CustomRequest extends Request {
  userId?: string;
}
