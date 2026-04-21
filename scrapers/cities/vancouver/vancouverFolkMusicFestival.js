/**
 * Vancouver Folk Music Festival (VFMF) Scraper
 * Scrapes artists/events from the annual folk festival at Jericho Beach Park
 * Runs July 17-19, 2026 (dates extracted dynamically from homepage)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BASE = 'https://thefestival.bc.ca';
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                 july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

async function getFestivalStartDate() {
  const res = await axios.get(BASE + '/', { headers: HDR, timeout: 12000 });
  const body = cheerio.load(res.data)('body').text().replace(/\s+/g, ' ');
  // "Folk Music FestivalJuly 17, 18, 19 2026"
  const m = body.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:[,\s]+\d{1,2})*\s+(\d{4})/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    const d = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

const VFMFEvents = {
  async scrape(city) {
    console.log('🎵 Scraping Vancouver Folk Music Festival...');
    const events = [];

    try {
      const festDate = await getFestivalStartDate();
      if (!festDate) {
        console.log('  ⚠️ Could not determine festival date');
        return [];
      }
      console.log(`  Festival start date: ${festDate}`);

      // Find the current year's artist lineup URL dynamically
      const homeRes = await axios.get(BASE + '/', { headers: HDR, timeout: 12000 });
      const $home = cheerio.load(homeRes.data);
      let artistsUrl = null;
      $home('a[href*="/artists/"], a[href*="-artists"]').each((i, el) => {
        if (artistsUrl) return;
        const href = $home(el).attr('href') || '';
        if (href.match(/\d{4}-artists/) || href.includes('/artists')) {
          artistsUrl = href.startsWith('http') ? href : BASE + href;
        }
      });
      // Fallback: find from nav
      if (!artistsUrl) {
        $home('a[href]').each((i, el) => {
          if (artistsUrl) return;
          const href = $home(el).attr('href') || '';
          const text = $home(el).text().toLowerCase();
          if (text.includes('artist lineup') || text.includes('lineup')) {
            artistsUrl = href.startsWith('http') ? href : BASE + href;
          }
        });
      }
      if (!artistsUrl) {
        console.log('  ⚠️ Could not find artist lineup URL');
        return [];
      }
      console.log(`  Artist lineup URL: ${artistsUrl}`);

      // Fetch artist listing
      const listRes = await axios.get(artistsUrl, { headers: HDR, timeout: 12000 });
      const $list = cheerio.load(listRes.data);

      // Collect unique artist page URLs
      const artistUrls = new Set();
      $list('a[href*="/artists/"]').each((i, el) => {
        const href = $list(el).attr('href') || '';
        if (href.match(/\/artists\/[a-z0-9-]+\/?$/)) {
          artistUrls.add(href.startsWith('http') ? href : BASE + href);
        }
      });

      console.log(`  Found ${artistUrls.size} artist pages`);

      // Fetch artist pages in batches of 5
      const BATCH = 5;
      const urlArray = Array.from(artistUrls);
      for (let i = 0; i < urlArray.length; i += BATCH) {
        const batch = urlArray.slice(i, i + BATCH);
        await Promise.all(batch.map(async (url) => {
          try {
            const res = await axios.get(url, { headers: HDR, timeout: 10000 });
            const $p = cheerio.load(res.data);

            // Title from h1 or og:title
            let title = $p('h1').first().text().trim() ||
                        ($p('meta[property="og:title"]').attr('content') || '').replace(/\s*[|–-].*$/, '').trim();
            if (!title || title.length < 2) return;

            // Image from og:image only (VFMF pages have real og:image)
            const imageUrl = $p('meta[property="og:image"]').attr('content') || null;
            if (!imageUrl) return;

            events.push({
              id: uuidv4(),
              title,
              date: festDate,
              url,
              imageUrl,
              venue: {
                name: 'Jericho Beach Park',
                address: '3941 Point Grey Road, Vancouver, BC V6R 1B5',
                city: 'Vancouver'
              },
              city: 'Vancouver',
              source: 'Vancouver Folk Music Festival',
              description: ''
            });
          } catch (_) {}
        }));
      }

      // Also add the festival itself as a single event with the festival image
      const festImg = $home('meta[property="og:image"]').attr('content') || null;
      if (festImg) {
        events.unshift({
          id: uuidv4(),
          title: 'Vancouver Folk Music Festival 2026',
          date: festDate,
          url: BASE + '/',
          imageUrl: festImg,
          venue: {
            name: 'Jericho Beach Park',
            address: '3941 Point Grey Road, Vancouver, BC V6R 1B5',
            city: 'Vancouver'
          },
          city: 'Vancouver',
          source: 'Vancouver Folk Music Festival',
          description: ''
        });
      }

      const filtered = filterEvents(events);
      console.log(`✅ VFMF: ${filtered.length} events (festival + ${filtered.length - 1} artists)`);
      return filtered;
    } catch (err) {
      console.error('VFMF scraper error:', err.message);
      return [];
    }
  }
};

module.exports = VFMFEvents.scrape;
