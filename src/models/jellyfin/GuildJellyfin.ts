import { Api, Jellyfin } from '@jellyfin/sdk';
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api';

export class GuildJellyfin {
  id: string;
  jellyfin: Jellyfin;
  api: Api;
  systemApi: SystemApi;
  userId: string;
  connected: boolean;

  constructor() {
    this.userId = '';
    this.connected = false;
  }

  destroy(): void {
    this.userId = "";
    this.connected = false;
  }
}
