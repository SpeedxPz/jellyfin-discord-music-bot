import { PlaystateApi } from '@jellyfin/sdk/lib/generated-client/api/playstate-api';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';
import { Track } from '../shared/Track';

export class GuildJellyfinPlayState {
  id: string;
  playstateApi: PlaystateApi;
  sessionApi: SessionApi;
  track: Track;
  progress: number;
  initialized: boolean;
  nextUpdate: Date;
}
