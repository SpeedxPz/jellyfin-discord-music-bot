// import {
//   BaseItemDto,
//   SearchHint as JellySearchHint,
// } from '@jellyfin/sdk/lib/generated-client/models';
// import { z } from 'zod';


// export class JellyfinSearchHint {
//   constructor(
//     protected readonly id: string,
//     protected readonly name: string,
//     protected runtimeInMilliseconds: number,
//   ) {}

//   toString() {
//     return `🎵 ${this.name}`;
//   }

//   // async toTracks(searchService: JellyfinSearchService): Promise<Track[]> {
//   //   return [new Track(this.id, this.name, this.runtimeInMilliseconds, {})];
//   // }

//   getId(): string {
//     return this.id;
//   }

//   static constructFromHint(hint: JellySearchHint) {
//     const schema = z.object({
//       Id: z.string(),
//       Name: z.string(),
//       AlbumArtist: z.string(),
//       RunTimeTicks: z.number(),
//     });

//     const result = schema.safeParse(hint);

//     if (!result.success) {
//       throw new Error(
//         `Unable to construct search hint, required properties were undefined: ${JSON.stringify(
//           hint,
//         )}`,
//       );
//     }

//     let itemName = result.data.Name;
//     if (result.data.AlbumArtist != '') {
//       itemName = `${result.data.Name} (${result.data.AlbumArtist})`;
//     }
//     return new JellyfinSearchHint(
//       result.data.Id,
//       itemName,
//       result.data.RunTimeTicks / 10000,
//     );
//   }

//   static constructFromBaseItem(baseItem: BaseItemDto) {
//     if (baseItem.Id === undefined || !baseItem.Name || !baseItem.RunTimeTicks) {
//       throw new Error(
//         'Unable to construct search hint from base item, required properties were undefined',
//       );
//     }
//     return new JellyfinSearchHint(
//       baseItem.Id,
//       baseItem.Name,
//       baseItem.RunTimeTicks / 10000,
//     );
//   }
// }
