import { Track } from './Track';

export class PlayQueue {
  tracks: Track[];
  activeTrackIndex: number;

  constructor() {
    this.tracks = [];
    this.activeTrackIndex = -1;
  }

  /**
   * Add new track(-s) to the bottom of the queue
   * @param tracks the tracks that should be added
   * @returns the new length of the tracks in the playlist
   */
  enqueueTracks(tracks: Track[]): number {
    if (tracks.length === 0) {
      return 0;
    }

    const length = this.tracks.push(...tracks);
    return length;
  }

  /**
   * Add new track(-s) to the next of current playing in the queue
   * @param tracks the tracks that should be added
   * @returns the new length of the tracks in the playlist
   */
  enqueueNext(tracks: Track[]): number {
    if (tracks.length === 0) {
      return 0;
    }

    this.tracks.splice(this.activeTrackIndex + 1, 0, ...tracks);
    return this.tracks.length;
  }

  /**
   * remove a track from the queue
   * @param trackNo track number that should be remove
   * @returns true for success or false for failure
   */
  removeTrack(trackNo: number): boolean {
    if (this.tracks.length === 0) {
      return false;
    }

    const trackIndex = trackNo - 1;
    if (trackIndex >= this.tracks.length || trackIndex < 0) {
      return false;
    }

    if (trackIndex == this.activeTrackIndex) {
      return false;
    }

    this.tracks.splice(trackIndex, 1);
    return true;
  }

  private getMaxIndex() {
    return this.tracks.length - 1;
  }

  /**
   * get current active track in the queue
   * @returns if have active track will return the track otherwise undefined
   */
  getActiveTrack(): Track | undefined {
    if (this.tracks.length === 0) {
      return undefined;
    }

    if (this.activeTrackIndex >= this.tracks.length) {
      return undefined;
    }

    if (this.activeTrackIndex === -1) {
      return undefined;
    }

    return this.tracks[this.activeTrackIndex];
  }

  /**
   * get current active track number in queue
   * @returns active track number in the queue
   */
  getActiveTrackNo(): number {
    return this.activeTrackIndex + 1;
  }

  /**
   * clear all tracks in the queue
   * @returns void
   */
  clear(): void {
    this.activeTrackIndex = -1;
    this.tracks = [];
  }

  /**
   * set next track in the queue to be a active track
   * @returns true for success or false for failure
   */
  setNextTrackAsActiveTrack(): boolean {
    if (this.activeTrackIndex >= this.getMaxIndex()) {
      return false;
    }

    this.activeTrackIndex++;
    return true;
  }

  /**
   * set specific track in the queue to be a active track
   * @param trackNo track number
   * @returns true for success or false for failure
   */
  setTrackNoAsActiveTrack(trackNo: number): boolean {
    if (trackNo > this.tracks.length || trackNo < 1) {
      return false;
    }

    this.activeTrackIndex = trackNo - 1;
    return true;
  }

  /**
   * set previous track in the queue to be a active track
   * @returns true for success or false for failure
   */
  setPreviousTrackAsActiveTrack(): boolean {
    if (this.activeTrackIndex <= 0) {
      return false;
    }

    this.activeTrackIndex--;
    return true;
  }

  getLength() {
    return this.tracks.length;
  }
}
