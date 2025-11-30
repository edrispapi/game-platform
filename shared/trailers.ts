// Mapping from game slug to official or high-quality YouTube gameplay / launch trailer.
// Slugs must match those generated in `database/generate-seed-data.ts`.
export const GAME_TRAILERS: Record<string, string> = {
  // NOTE: This list can be extended easily. Values must be full YouTube URLs.
  'cuphead': 'https://www.youtube.com/watch?v=NN-9SQXoi50',
  'ghost-of-tsushima': 'https://www.youtube.com/watch?v=MUz539AeC5Y',
  'titanfall-2': 'https://www.youtube.com/watch?v=HhDe315kKqY',
  'among-us': 'https://www.youtube.com/watch?v=Gb_iKpSX9-4',
  'counter-strike-2': 'https://www.youtube.com/watch?v=c80dVYcL69E',
  'elden-ring-2': 'https://www.youtube.com/watch?v=sNgER9MVNFs',
  'final-fantasy-xvi': 'https://www.youtube.com/watch?v=n8MiRIt09vc',
  'bloodborne': 'https://www.youtube.com/watch?v=akMQ9QceJO8',
  'fall-guys': 'https://www.youtube.com/watch?v=UrFRdDNGcQs',
  'final-fantasy-xiv': 'https://www.youtube.com/watch?v=bxJt3UOBhU8',
  'nioh-2': 'https://www.youtube.com/watch?v=ETWtvVGFNqU',
  'alan-wake-2': 'https://www.youtube.com/watch?v=wvlbgN2140g',
  'amnesia-the-bunker': 'https://www.youtube.com/watch?v=5V3Si-MbUao',
  'cyberpunk-2077': 'https://www.youtube.com/watch?v=CJkH6iFIQT0',
  'dark-souls-iii': 'https://www.youtube.com/watch?v=Pkw7JlFTrII',
  'death-stranding': 'https://www.youtube.com/watch?v=3i_gbwXHIPQ',
  'doom-2016': 'https://www.youtube.com/watch?v=RO90omga8D4',
  'dota-2': 'https://www.youtube.com/watch?v=f51sdbC-3DA',
  'fire-emblem-three-houses': 'https://www.youtube.com/watch?v=8OwUB8gf5Ac',
  'grim-dawn': 'https://www.youtube.com/watch?v=GU1ViHjUJF8',
  'hades': 'https://www.youtube.com/watch?v=1Vd39Qe8AFg',
  'marvels-guardians-of-the-galaxy': 'https://www.youtube.com/watch?v=BoaW6e3_ypg',
  'monster-hunter-world': 'https://www.youtube.com/watch?v=u8Qj5xO4Q2M',
  'nier-replicant': 'https://www.youtube.com/watch?v=1uYbDCAuG6g',
  'resident-evil-4': 'https://www.youtube.com/watch?v=H94wplk',
};

export function getYoutubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}


