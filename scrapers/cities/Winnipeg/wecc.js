/**
 * West End Cultural Centre (WECC) Events Scraper - Winnipeg
 * Source: https://wecc.ca/events (Squarespace JSON API)
 * Address: 586 Ellice Ave, Winnipeg, MB R3B 1Z8
 */

const { spawnSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    '-H', 'Accept: application/json',
    url
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result.stdout || '';
}

function decodeHtml(str) {
  return (str || '').replace(/&amp;/g, '&').replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&#8217;/g, "'").replace(/&#8211;/g, '–')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

function msToISO(ms) {
  if (!ms) return null;
  try {
    const d = new Date(ms);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}

async function scrapeWECC(city = 'Winnipeg') {
  console.log('🎵 Scraping West End Cultural Centre (WECC)...');

  try {
    let page = 1;
    const allEvents = [];
    const seenIds = new Set();

    while (true) {
      const url = page === 1
        ? 'https://wecc.ca/events?format=json'
        : `https://wecc.ca/events?format=json&page=${page}`;

      const raw = curlFetch(url);
      if (!raw) break;

      let data;
      try { data = JSON.parse(raw); } catch { break; }

      const items = data.upcoming || [];
      if (items.length === 0) break;

      for (const item of items) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        const title = decodeHtml(item.title);
        if (!title || title.length < 3) continue;

        const dateStr = msToISO(item.startDate);
        if (!dateStr) continue;

        const eventUrl = item.fullUrl
          ? (item.fullUrl.startsWith('http') ? item.fullUrl : `https://wecc.ca${item.fullUrl}`)
          : null;
        if (!eventUrl) continue;

        const imageUrl = item.assetUrl || null;

        const excerptRaw = item.excerpt || '';
        const description = excerptRaw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);

        allEvents.push({
          id: uuidv4(),
          title,
          url: eventUrl,
          date: dateStr,
          description,
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: 'West End Cultural Centre',
            address: '586 Ellice Ave, Winnipeg, MB R3B 1Z8',
            city: 'Winnipeg',
          },
          city,
          source: 'wecc',
        });
      }

      if (!data.pagination?.nextPage) break;
      page++;
      if (page > 10) break;
    }

    console.log(`✅ WECC: ${allEvents.length} events`);
    return filterEvents(allEvents);

  } catch (error) {
    console.error('Error scraping WECC:', error.message);
    return [];
  }
}

module.exports = scrapeWECC;
