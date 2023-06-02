import { Track } from '../shared/Track';

export class PlaybackEnqueueEvent {
  guild_id: string;
  tracks: Track[];

  constructor(guild_id: string, tracks: Track[]) {
    this.guild_id = guild_id;
    this.tracks = tracks;
  }
}
