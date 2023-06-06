import { Track } from './Track';

export class YoutubeTrack extends Track {
  readonly description: string;
  readonly playURL: string;
  constructor(
    id: string,
    name: string,
    description: string,
    artist: string,
    duration: number,
    imageURL = '',
    playURL = '',
  ) {
    super(id, name, '', artist, duration, imageURL);
    this.description = description;
    this.playURL = playURL;
  }
}
