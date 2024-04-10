export class ImageGenAPIError extends Error {
  constructor(msg = '') {
    super(msg);
    Object.setPrototypeOf(this, ImageGenAPIError.prototype);
    this.name = 'ImageGenAPIError';
  }
}
export class CoquiAPIError extends Error {
  constructor(msg = '') {
    super(msg);
    Object.setPrototypeOf(this, CoquiAPIError.prototype);
    this.name = 'CoquiAPIError';
  }
}
export class OpenAIAPIError extends Error {
  constructor(msg = '') {
    super(msg);
    Object.setPrototypeOf(this, OpenAIAPIError.prototype);
    this.name = 'OpenAIAPIError';
  }
}
export class OllamaAPIError extends Error {
  constructor(msg = '') {
    super(msg);
    Object.setPrototypeOf(this, OllamaAPIError.prototype);
    this.name = 'OllamaAPIError';
  }
}
export class FfmpegError extends Error {
  constructor(msg = '') {
    super(msg);
    Object.setPrototypeOf(this, FfmpegError.prototype);
    this.name = 'FfmpegError';
  }
}
