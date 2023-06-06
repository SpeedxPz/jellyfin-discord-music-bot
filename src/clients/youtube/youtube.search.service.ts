import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { MediaKind } from 'src/models/search/MediaKind.enum';
import { SearchHint } from 'src/models/search/SearchHint';
import { Track } from 'src/models/shared/Track';
import { YoutubeTrack } from 'src/models/shared/YoutubeTrack';
import { getEnvironmentVariables } from 'src/utils/environment';
import { trimStringToFixedLength } from 'src/utils/stringUtils/stringUtils';
import { YoutubeNotFound } from './exception/youtube-not-found.exception';
import { convertISO8601ToSeconds } from 'src/utils/timeUtils';
import { InvalidYoutubeLink } from './exception/invalid.youtube.link.exception';
import { join } from 'path';
import { spawn } from 'child_process';
import { YoutubeGetAudioError } from './exception/youtube.audio.get.error.exception';
import * as fs from 'fs';

@Injectable()
export class YoutubeSearchService {
  private readonly logger = new Logger(YoutubeSearchService.name);
  private apiKey: string;
  private api: AxiosInstance;

  constructor() {
    this.apiKey = getEnvironmentVariables().YOUTUBE_SEARCH_API_KEY;
    this.api = axios.create({
      baseURL: 'https://www.googleapis.com/youtube/v3/',
    });
  }

  async searchItem(searchTerm: string, limit = 20): Promise<SearchHint[]> {
    const result: AxiosResponse = await this.api.get('/search', {
      params: {
        q: searchTerm,
        part: 'snippet',
        type: 'video',
        maxResults: limit,
        fields: 'items(snippet/title,snippet/channelTitle,id/videoId)',
        key: this.apiKey,
      },
    });

    const hints: SearchHint[] = result.data.items.map(
      (item: any) =>
        new SearchHint(
          item.id.videoId,
          `${trimStringToFixedLength(
            item.snippet.title,
            40,
          )} by ${trimStringToFixedLength(item.snippet.channelTitle, 30)}`,
          MediaKind.Audio,
          0,
        ),
    );

    return hints;
  }

  async getTracksById(id: string): Promise<Track[]> {
    const result: AxiosResponse = await this.api.get('/videos', {
      params: {
        id: id,
        part: 'snippet,contentDetails',
        key: this.apiKey,
      },
    });

    if (result.data.items.length <= 0) {
      throw new YoutubeNotFound();
    }

    const item = result.data.items[0];
    const track = new YoutubeTrack(
      id,
      item.snippet.title,
      item.snippet.description,
      item.snippet.channelTitle,
      convertISO8601ToSeconds(item.contentDetails.duration) * 1000,
      item.snippet.thumbnails.maxres.url,
      `https://www.youtube.com/watch?v=${id}`,
    );

    return [track];
  }

  async downloadTrack(track: YoutubeTrack): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const filePath = `./cache/yt_${track.id}.mp3`;

      if (fs.existsSync(filePath)) {
        return resolve(filePath);
      }
      const isWin = process.platform === 'win32';
      const toolPath: string = join('./bin', isWin ? 'yt-dlp.exe' : 'yt-dlp');
      const toolFlags: string[] = [
        `${track.playURL}`,
        `-x`,
        '--audio-format',
        'mp3',
        '--audio-quality',
        '256K',
        '-f',
        'bestaudio',
        '-o',
        `./cache/yt_%(id)s.%(ext)s`,
      ];

      const child = spawn(toolPath, toolFlags);
      child.stdout.on('data', (data: string) => console.log(`${data}`));
      child.stderr.on('data', (data: string) => console.log(`${data}`));
      child.once('exit', (code: number) => {
        if (code !== 0) {
          return reject(new YoutubeGetAudioError());
        } else {
          return resolve(filePath);
        }
      });
    });
  }

  youtubeURLToId(url: string): string {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    const match = url.match(regExp);
    const result = match && match[7].length == 11 ? match[7] : '';
    if (result === '') {
      throw new InvalidYoutubeLink();
    }
    return result;
  }
}
