import { MediaKind } from './MediaKind.enum';

export class SearchHint {
  constructor(
    protected readonly id: string,
    protected readonly name: string,
    protected readonly type: MediaKind,
    protected runtimeInMilliseconds: number,
  ) {}

  toString() {
    switch (this.type) {
      case MediaKind.AudioAlbum:
        return `🎶 ${this.name}`;
      case MediaKind.Playlist:
        return `🎧 ${this.name}`;
      default:
        return `🎵 ${this.name}`;
    }
  }

  getId(): string {
    return this.id;
  }
}
