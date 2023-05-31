import { Api, Jellyfin } from '@jellyfin/sdk';
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api';
import { PlayQueue } from '../shared/PlayQueue';

export class GuildPlayBack {
  id: string;
  queue: PlayQueue;
  playing: boolean;
  pause: boolean;

  constructor(id: string = '') {
    this.id = id;
    this.queue = new PlayQueue();
    this.playing = false;
    this.pause = false;
  }

  destroy(): void {}
}
