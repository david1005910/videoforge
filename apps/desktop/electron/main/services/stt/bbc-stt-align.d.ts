declare module '@bbc/stt-align-node' {
  interface WordInput {
    word: string;
  }
  interface TimedWord {
    word: string;
    start: number;
    end: number;
  }
  interface AlignedResult {
    word: string;
    start?: number;
    end?: number;
    accuracy?: number;
  }
  function sttAlign(script: WordInput[], stt: TimedWord[]): AlignedResult[];
  export = sttAlign;
}
