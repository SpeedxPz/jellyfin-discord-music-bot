import { Track } from './Track';

export class PlayQueue {
  tracks: Track[];
  activeTrackIndex: number;

  constructor() {
    this.tracks = [];
    this.activeTrackIndex = -1;
  }

  /**
   * Add new track(-s) to the playlist
   * @param tracks the tracks that should be added
   * @returns the new lendth of the tracks in the playlist
   */
  enqueueTracks(tracks: Track[]) {
    if (tracks.length === 0) {
      return 0;
    }

    const length = this.tracks.push(...tracks);
    return length;
  }

  enqueueNext(tracks: Track[]) {
    if (tracks.length === 0) {
      return 0;
    }

    this.tracks.splice(this.activeTrackIndex + 1, 0, ...tracks);
  }

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

  getActiveTrackNo(): number {
    return this.activeTrackIndex + 1;
  }

  clear() {
    this.activeTrackIndex = -1;
    this.tracks = [];
  }

  setNextTrackAsActiveTrack(): boolean {
    if (this.activeTrackIndex >= this.getMaxIndex()) {
      return false;
    }

    this.activeTrackIndex++;
    return true;
  }

  setTrackNoAsActiveTrack(trackNo: number): boolean {
    if (trackNo > this.tracks.length || trackNo < 1) {
      return false;
    }

    this.activeTrackIndex = trackNo - 1;
    return true;
  }

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
