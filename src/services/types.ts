export type GenerateData = {
  prompt: string;
  negPrompt: string;
  scale: number;
  steps: number;
  seed: number;
  secondaryServer?: boolean;
};

export type GenerateResponse = {
  images: ImageData[];
  res: ResponseData;
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
