import { CoquiEmotion } from '../services/coqui';

export type Character = {
  id: number;
  voiceId: string;
  description: string;
};

export type Transcript = {
  duration: number;
  text: string;
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
};
