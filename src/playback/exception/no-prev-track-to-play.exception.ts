export class NoPreviousTrackToPlay extends Error {
  constructor() {
    super('The playback reach the start. No previous track to assigned');
  }
}
