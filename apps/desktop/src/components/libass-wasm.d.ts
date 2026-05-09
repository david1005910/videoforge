declare module 'libass-wasm' {
  interface SubtitlesOctopusOptions {
    canvas: HTMLCanvasElement;
    subUrl?: string;
    subContent?: string;
    workerUrl?: string;
    legacyWorkerUrl?: string;
    fonts?: string[];
    availableFonts?: Record<string, string>;
  }

  class SubtitlesOctopus {
    constructor(options: SubtitlesOctopusOptions);
    setCurrentTime(time: number): void;
    dispose(): void;
  }

  export default SubtitlesOctopus;
}
