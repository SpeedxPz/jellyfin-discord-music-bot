export class NoVoiceToDisconnect extends Error {
  constructor() {
    super('Unable to disconnect due to not connected to any voice channels');
  }
}
