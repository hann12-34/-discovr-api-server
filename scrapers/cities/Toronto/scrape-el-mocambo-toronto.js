/**
 * El Mocambo Toronto Events Scraper
 * Source: https://www.elmocambo.com
 * API: Tribe Events REST API (WordPress)
 * Address: 464 Spadina Ave, Toronto, ON M5T 2G8
 */

const { spawnSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = 'El Mocambo';
const VENUE_ADDRESS = '464 Spadina Ave, Toronto, ON M5T 2G8';
const BASE_URL = 'https://www.elmocambo.com/wp-json/tribe/events/v1/events';

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-m', '15',
    '-sL',
    '-H', 'User-Agent: Mozilla/5.0',
    '-H', 'Accept: application/json',
    url,
  ], { timeout: 20000, encoding: 'utf8' });
  if (result.error) throw result.error;
  return JSON.parse(result.stdout);
}

function decodeHtml(str) {
  return (str || '')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .trim();
}

async function scrapeElMocamboToronto(city = 'Toronto') {
  console.log('🎸 Scraping El Mocambo events...');
  const events = [];
  const seenUrls = new Set();
  let page = 1;
  const maxPages = 10;

  try {
    while (page <= maxPages) {
      const url = `${BASE_URL}?per_page=50&page=${page}&status=publish`;
      let data;
      try {
        data = curlFetch(url);
      } catch (err) {
        console.log(`  Page ${page} error: ${err.message}`);
        break;
      }

      if (!data.events || data.events.length === 0) break;

      for (const item of data.events) {
        const eventUrl = item.url || '';
        if (!eventUrl || seenUrls.has(eventUrl)) continue;
        seenUrls.add(eventUrl);

        const title = decodeHtml(item.title);
        if (!title || title.length < 3) continue;

        const startDate = item.start_date || item.utc_start_date || null;
        if (!startDate) continue;

        const imageUrl = (item.image || {}).url || null;

        const rawDesc = item.description || '';
        const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const description = cleanDesc.length >= 20
          ? cleanDesc.slice(0, 1000)
          : '';

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
          source: 'el-mocambo',
        });
      }

      if (page >= (data.total_pages || 1)) break;
      page++;
    }

    console.log(`  Found ${events.length} El Mocambo events`);
    const filtered = filterEvents(events);
    console.log(`  ✅ Returning ${filtered.length} valid El Mocambo events`);
    return filtered;

  } catch (error) {
    console.error('  ⚠️ El Mocambo error:', error.message);
    return [];
  }
}

module.exports = scrapeElMocamboToronto;
