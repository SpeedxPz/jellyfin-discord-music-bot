import { Choice, Param, ParamType } from '@discord-nestjs/core';

export enum Position {
  EndOfQueue = 0,
  PlayNext = 1,
}

export class PlayYoutubeCommandParams {
  @Param({
    required: true,
    description: 'Item name on Youtube',
    autocomplete: true,
  })
  name: string;

  @Choice(Position)
  @Param({
    description: 'Position in the queue where the track should be add',
    type: ParamType.INTEGER,
  })
  position: Position | undefined;
}
