export class DiscordProgressEvent {
  guildId: string;
  progress: number;

  constructor(guildId: string, progress: number) {
    this.guildId = guildId;
    this.progress = progress;
  }
}
