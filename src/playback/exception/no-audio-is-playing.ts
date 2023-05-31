export class NoAudioIsPlaying extends Error {
  constructor() {
    super('There is no audio currently playing');
  }
}
