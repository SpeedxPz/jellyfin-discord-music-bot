import { Param, ParamType } from '@discord-nestjs/core';

export class RemoveTrackCommandParams {
  @Param({
    required: true,
    description: 'Track Number from queue command',
    type: ParamType.INTEGER,
    minValue: 0,
    maxValue: 10000,
  })
  track_no = 0;
}
