import { Track } from '../shared/Track';

export class DiscordPlayEvent {
  guild_id: string;
  track: Track;
  streamURL: string;

  constructor(guild_id: string, track: Track, streamURL: string) {
    this.guild_id = guild_id;
    this.track = track;
    this.streamURL = streamURL;
  }
}
