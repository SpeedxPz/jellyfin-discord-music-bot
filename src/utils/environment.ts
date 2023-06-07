import { PermissionResolvable } from 'discord.js';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import * as env from 'dotenv';
env.config();

export const environmentVariablesSchema = z.object({
  DISCORD_CLIENT_TOKEN: z.string(),
  JELLYFIN_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  YOUTUBE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  JELLYFIN_SERVER_ADDRESS: z.string().default(''),
  JELLYFIN_INTERNAL_IMAGE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  JELLYFIN_AUTHENTICATION_USERNAME: z.string().default(''),
  JELLYFIN_AUTHENTICATION_PASSWORD: z.string().default(''),
  UPDATER_DISABLE_NOTIFICATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  LOG_LEVEL: z
    .enum(['ERROR', 'WARN', 'LOG', 'DEBUG', 'VERBOSE'])
    .default('LOG'),
  PORT: z.preprocess(
    (value) => (Number.isInteger(value) ? Number(value) : undefined),
    z.number().positive().max(9999).default(3000),
  ),
  ALLOW_EVERYONE_FOR_DEFAULT_PERMS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  YOUTUBE_SEARCH_API_KEY: z.string().default(''),
  YOUTUBE_APIS_BASE_URL: z
    .string()
    .default('https://www.googleapis.com/youtube/v3/'),
  CACHE_PATH: z.string().default('./cache'),
});

export const getEnvironmentVariables = () => {
  try {
    return environmentVariablesSchema.strip().parse(process.env);
  } catch (err) {
    throw fromZodError(err);
  }
};

export const defaultMemberPermissions: PermissionResolvable | undefined =
  getEnvironmentVariables().ALLOW_EVERYONE_FOR_DEFAULT_PERMS
    ? 'ViewChannel'
    : undefined;
