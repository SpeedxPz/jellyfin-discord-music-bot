import { Choice, Param, ParamType } from '@discord-nestjs/core';

import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { MediaKind } from 'src/models/search/MediaKind.enum';

export enum SearchType {
  Audio = 0,
  AudioAlbum = 1,
  Playlist = 2,
}

export enum Mode {
  Normal = 0,
  Shuffle = 1,
}

export enum Position {
  EndOfQueue = 0,
  PlayNext = 1,
}

export class PlayCommandParams {
  @Param({
    required: true,
    description: 'Item name on Jellyfin',
    autocomplete: true,
  })
  name: string;

  @Choice(SearchType)
  @Param({ description: 'Desired item type', type: ParamType.INTEGER })
  type: SearchType | undefined;

  @Choice(Mode)
  @Param({
    description: 'How the track should be add',
    type: ParamType.INTEGER,
  })
  mode: Mode | undefined;

  @Choice(Position)
  @Param({
    description: 'Position in the queue where the track should be add',
    type: ParamType.INTEGER,
  })
  position: Position | undefined;

  static getBaseItemKinds(type: SearchType | undefined) {
    switch (type) {
      case SearchType.Audio:
        return [BaseItemKind.Audio];
      case SearchType.Playlist:
        return [BaseItemKind.Playlist];
      case SearchType.AudioAlbum:
        return [BaseItemKind.MusicAlbum];
      default:
        return [
          BaseItemKind.Audio,
          BaseItemKind.Playlist,
          BaseItemKind.MusicAlbum,
        ];
    }
  }

  static getMediaKinds(type: SearchType | undefined): MediaKind[] {
    switch (type) {
      case SearchType.Audio:
        return [MediaKind.Audio];
      case SearchType.Playlist:
        return [MediaKind.Playlist];
      case SearchType.AudioAlbum:
        return [MediaKind.AudioAlbum];
      default:
        return [MediaKind.Audio, MediaKind.Playlist, MediaKind.AudioAlbum];
    }
  }
}
