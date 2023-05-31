import { PlayQueue } from '../shared/PlayQueue';

export class GuildPlayBack {
  id: string;
  queue: PlayQueue;
  playing: boolean;
  pause: boolean;
  progress: number;

  constructor(id: string = '') {
    this.id = id;
    this.queue = new PlayQueue();
    this.playing = false;
    this.pause = false;
    this.progress = 0;
  }

  destroy(): void {}
}
