/**
 * Winnipeg Folk Festival Presented Events Scraper
 * Source: https://winnipegfolkfestival.ca (WordPress + Tribe Events API)
 * Presents events at various Winnipeg venues year-round
 */

const { spawnSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function curlFetch(url) {
  const result = spawnSync('curl', [
    '-sL', '-m', '15',
    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    url
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result.stdout || '';
}

function decodeHtml(str) {
  return (str || '').replace(/&amp;/g, '&').replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&#8217;/g, "'").replace(/&#8211;/g, '–')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

async function scrapeWinnipegFolkFestival(city = 'Winnipeg') {
  console.log('🎸 Scraping Winnipeg Folk Festival events...');

  try {
    let page = 1;
    const allEvents = [];
    const seenUrls = new Set();

    while (page <= 5) {
      const url = `https://winnipegfolkfestival.ca/wp-json/tribe/events/v1/events?per_page=20&page=${page}&status=publish`;
      const raw = curlFetch(url);
      if (!raw) break;

      let data;
      try { data = JSON.parse(raw); } catch { break; }

      const items = data.events || [];
      if (items.length === 0) break;

      for (const item of items) {
        const title = decodeHtml(item.title);
        if (!title || title.length < 3) continue;

        const eventUrl = item.url || '';
        if (!eventUrl || seenUrls.has(eventUrl)) continue;
        seenUrls.add(eventUrl);

        const dateStr = item.start_date?.slice(0, 10);
        if (!dateStr) continue;

        const venue = item.venue || {};
        const address = [venue.address, venue.city, venue.province]
          .filter(Boolean).join(', ');
        if (!address || !venue.city) continue;

        // Only include Winnipeg events
        if (!/winnipeg/i.test(venue.city)) continue;

        const imageUrl = item.image?.url || null;
        const description = (item.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);

        allEvents.push({
          id: uuidv4(),
          title: title.replace(/\s*[–\-]\s*SOLD\s*OUT\s*$/i, '').trim(),
          url: eventUrl,
          date: dateStr,
          description,
          imageUrl: imageUrl && !/logo|placeholder/i.test(imageUrl) ? imageUrl : null,
          venue: {
            name: venue.venue || 'Winnipeg Venue',
            address,
            city: 'Winnipeg',
          },
          city,
          source: 'winnipeg-folk-festival',
        });
      }

      if (page >= (data.total_pages || 1)) break;
      page++;
    }

    console.log(`✅ Winnipeg Folk Festival: ${allEvents.length} events`);
    return filterEvents(allEvents);

  } catch (error) {
    console.error('Error scraping Winnipeg Folk Festival:', error.message);
    return [];
  }
}

module.exports = scrapeWinnipegFolkFestival;
