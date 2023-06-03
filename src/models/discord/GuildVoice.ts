import { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';

export class GuildVoice {
  id: string;
  audioPlayer: AudioPlayer | undefined;
  voiceConnection: VoiceConnection | undefined;
  audioResource: AudioResource | undefined;

  destroy(): void {
    this.audioPlayer = undefined;
    this.voiceConnection = undefined;
    this.audioResource = undefined;
  }
}
