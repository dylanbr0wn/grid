import { Redis } from '@upstash/redis';
import 'server-only'

const SHARED_ALBUMS_KEY = 'shared:albums';

const redis = Redis.fromEnv();

export async function pushAlbumsToCache(
  albums: { album: string; artist: string; img: string; id: string }[]
) {
  const p = redis.multi();
  const images = albums.map(a => a.img);
  p.sadd(SHARED_ALBUMS_KEY, images[0], ...images.slice(1));
  p.scard(SHARED_ALBUMS_KEY);
  const [_, card] = await p.exec<[number,number]>();
  await redis.spop(SHARED_ALBUMS_KEY, card > 100 ? card - 100 : 0 ); // Keep only the latest 100 entries
}

export async function getCachedAlbums(): Promise<string[]> {
  const cached = await redis.smembers(SHARED_ALBUMS_KEY);
  return cached;
}