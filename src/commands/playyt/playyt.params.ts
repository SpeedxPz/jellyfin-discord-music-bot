import { Choice, Param, ParamType } from '@discord-nestjs/core';

export enum Position {
  EndOfQueue = 0,
  PlayNext = 1,
}

export enum Mode {
  Normal = 0,
  Shuffle = 1,
}

export enum SearchType {
  Audio = 0,
  Playlist = 1,
}

export class PlayYoutubeCommandParams {
  @Param({
    required: true,
    description: 'Item name on Youtube',
    autocomplete: true,
  })
  name: string;

  @Choice(SearchType)
  @Param({
    description: 'Desire the link type (only works with youtube link)',
    type: ParamType.INTEGER,
  })
  type: SearchType | undefined;

  @Choice(Mode)
  @Param({
    description:
      'How the track should be add (Only works with youtube playlist)',
    type: ParamType.INTEGER,
  })
  mode: Mode | undefined;

  @Choice(Position)
  @Param({
    description: 'Position in the queue where the track should be add',
    type: ParamType.INTEGER,
  })
  position: Position | undefined;
}
