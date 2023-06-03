export class NotInVoiceException extends Error {
  constructor() {
    super('Unable to join a voice channel because the user not in the channel');
  }
}
