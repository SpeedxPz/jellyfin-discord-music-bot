// import {
//   BaseItemDto,
//   SearchHint as JellyfinSearchHint,
// } from '@jellyfin/sdk/lib/generated-client/models';

// import { Track } from '../shared/Track';
// import { JellyfinSearchService } from '../../clients/jellyfin/jellyfin.search.service';

// import { SearchHint } from './SearchHint';
// import { convertToTracks } from 'src/utils/trackConverter';

// export class PlaylistSearchHint extends SearchHint {
//   override toString(): string {
//     return `🎧 ${this.name}`;
//   }

//   static constructFromHint(hint: JellyfinSearchHint) {
//     if (hint.Id === undefined || !hint.Name || !hint.RunTimeTicks) {
//       throw new Error(
//         'Unable to construct playlist search hint, required properties were undefined',
//       );
//     }

//     return new PlaylistSearchHint(
//       hint.Id,
//       hint.Name,
//       hint.RunTimeTicks / 10000,
//     );
//   }

//   static constructFromBaseItem(baseItem: BaseItemDto) {
//     if (baseItem.Id === undefined || !baseItem.Name || !baseItem.RunTimeTicks) {
//       throw new Error(
//         'Unable to construct search hint from base item, required properties were undefined',
//       );
//     }
//     return new PlaylistSearchHint(
//       baseItem.Id,
//       baseItem.Name,
//       baseItem.RunTimeTicks / 10000,
//     );
//   }

//   override async toTracks(
//     searchService: JellyfinSearchService,
//   ): Promise<Track[]> {
//     const playlistItems = await searchService.getPlaylistitems(this.id);
//     return convertToTracks(playlistItems, searchService);
//   }
// }
