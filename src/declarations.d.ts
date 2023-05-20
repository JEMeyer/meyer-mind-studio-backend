declare module 'sox-audio' {
    interface SoxCommand {
        input(file: string): this;
        inputFileType(type: string): this;
        output(file: string): this;
        outputFileType(type: string): this;
        addEffect(effect: string, options: Array<number | string>): this;
        run(callback: (err: Error) => void): void;
    }

    export function create(): SoxCommand;
}