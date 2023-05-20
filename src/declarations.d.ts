declare module 'sox-audio' {
    export class SoxCommand {
        constructor();
        input(file: string): this;
        inputFileType(type: string): this;
        output(file: string): this;
        outputFileType(type: string): this;
        addEffect(effect: string, options: Array<number | string>): this;
        run(callback: (err: Error) => void): void;
    }
  }