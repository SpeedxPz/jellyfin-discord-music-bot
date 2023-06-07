import { Track } from './Track';

export enum YoutubeTrackState {
  None = 0,
  Downloading = 1,
  Ready = 2,
  Error = 3,
}

export class YoutubeTrack extends Track {
  readonly description: string;
  readonly playURL: string;
  state: YoutubeTrackState;

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
    this.state = YoutubeTrackState.None;
  }
}
