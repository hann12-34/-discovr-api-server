/**
 * The Rex Hotel Jazz & Blues Bar Events Scraper
 * Source: https://www.therex.ca/events
 * API: Squarespace JSON API (?format=json)
 * Address: 194 Queen St W, Toronto, ON M5V 1Z1
 */

const { spawnSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'The Rex Hotel Jazz & Blues Bar';
const VENUE_ADDRESS = '194 Queen St W, Toronto, ON M5V 1Z1';
const EVENTS_URL = 'https://www.therex.ca/events?format=json';

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-m', '15',
    '-sL',
    '-H', 'User-Agent: Mozilla/5.0',
    '-H', 'Accept: application/json',
    url,
  ], { timeout: 20000, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;
  return JSON.parse(result.stdout);
}

function decodeHtml(str) {
  return (str || '')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

async function scrapeRexHotelToronto(city = 'Toronto') {
  console.log('🎷 Scraping The Rex Hotel events...');
  const events = [];
  const seenTitles = new Set();

  try {
    const data = curlFetch(EVENTS_URL);
    const upcoming = data.upcoming || [];

    console.log(`  Found ${upcoming.length} upcoming Rex events`);

    for (const item of upcoming) {
      const title = decodeHtml(item.title);
      if (!title || title.length < 3) continue;

      const titleKey = title.toLowerCase().trim();
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      // startDate is Unix timestamp in ms
      if (!item.startDate) continue;
      const dateObj = new Date(item.startDate);
      if (isNaN(dateObj.getTime())) continue;
      const startDate = dateObj.toISOString().replace('T', ' ').slice(0, 19);

      // Event URL: Squarespace full URL
      const eventUrl = item.fullUrl
        ? `https://www.therex.ca${item.fullUrl}`
        : 'https://www.therex.ca/events';

      // Image from Squarespace CDN
      const imageUrl = item.assetUrl
        ? `${item.assetUrl}?format=1500w`
        : null;

      // Description from body or excerpt
      const rawDesc = item.excerpt || item.body || '';
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const description = cleanDesc.length >= 20 ? cleanDesc.slice(0, 1000) : '';

      events.push({
        id: uuidv4(),
        title,
        url: eventUrl,
        date: startDate,
        venue: {
          name: VENUE_NAME,
          address: VENUE_ADDRESS,
          city: 'Toronto',
        },
        city: 'Toronto',
        description,
        imageUrl,
        source: 'rex-hotel-toronto',
      });
    }

    console.log(`  Parsed ${events.length} Rex events`);
    const filtered = filterEvents(events);
    console.log(`  ✅ Returning ${filtered.length} valid Rex Hotel events`);
    return filtered;

  } catch (error) {
    console.error('  ⚠️ Rex Hotel error:', error.message);
    return [];
  }
}

module.exports = scrapeRexHotelToronto;
