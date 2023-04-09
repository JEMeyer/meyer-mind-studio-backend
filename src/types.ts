export type Character = {
    id: number,
    voiceId: string,
    description: string,
}

export type GenerateData = { prompt: string, scale: number, steps: number, seed: number };

export type Transcript = {
    duration: number,
    text: string
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
    images: ImageData[],
    res: ResponseData
}

type StoryboardSpeaker = {
    id: number,
    description: string,
    voice_prompt: string,
}
type StoryboardFrame = {
    speaker: number,
    dialog: string,
    emotion: string,
    frame_desc: string,
}
export type PrimaryStoryboardResponse = {
    name: string,
    setting: string,
    theme: string,
    speakers: StoryboardSpeaker[],
    frames: StoryboardFrame[],
}