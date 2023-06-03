export class Track {
  /**
   * The identifier of this track, structured as a UID.
   * This id can be used to build a stream url and send more API requests to Jellyfin
   */
  readonly id: string;

  /**
   * The name of the track
   */
  readonly name: string;

  /**
   * The artist of the track
   */
  readonly artist: string;

  /**
   * The album of the track
   */
  readonly album: string;

  /**
   * The duration of the track
   */
  readonly duration: number;

  /**
   * The image url for this track
   */
  readonly imageURL: string;

  /**
   * Is this track playing
   */
  playing: boolean;

  constructor(
    id: string,
    name: string,
    album: string,
    artist: string,
    duration: number,
    imageURL = '',
  ) {
    this.id = id;
    this.name = name;
    this.album = album;
    this.artist = artist;
    this.duration = duration;
    this.imageURL = imageURL;
    this.playing = false;
  }

  getDuration() {
    return this.duration;
  }

  getImageURL(): string {
    return this.imageURL ? this.imageURL : '';
  }
}
