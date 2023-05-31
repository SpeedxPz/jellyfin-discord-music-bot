import { Param, ParamType } from '@discord-nestjs/core';

export class GoTrackCommandParams {
  @Param({
    required: true,
    description: 'Track number you want to jump into',
    type: ParamType.INTEGER,
    minValue: 0,
    maxValue: 10000,
  })
  track_no: number;
}
