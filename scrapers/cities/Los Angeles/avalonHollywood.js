/**
 * Avalon Hollywood Nightclub Scraper
 * Source: https://avalonhollywood.com/events/
 * Address: 1735 Vine St, Los Angeles, CA 90028
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeAvalonHollywood(city = 'Los Angeles') {
  console.log('🌟 Scraping Avalon Hollywood...');

  try {
    const response = await axios.get('https://avalonhollywood.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 20000
    });

    const $ = cheerio.load(response.data);
    const today = new Date().toISOString().slice(0, 10);
    const rawEvents = [];

    $('.events__item').each((i, el) => {
      const dateText = $(el).find('.section-heading-3, .event__date p').first().text().trim();
      const href = $(el).find('a[href*="/event/"]').first().attr('href') || '';
      if (!href || !dateText) return;

      // Parse date format "M.DD.YY"
      const dateParts = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      if (!dateParts) return;
      const month = dateParts[1].padStart(2, '0');
      const day = dateParts[2].padStart(2, '0');
      const year = dateParts[3].length === 2 ? '20' + dateParts[3] : dateParts[3];
      const date = `${year}-${month}-${day}`;
      if (date < today) return;

      // Extract image from data-lazy-srcset or data-src
      const img = $(el).find('img').first();
      const srcset = img.attr('data-lazy-srcset') || img.attr('data-srcset') || '';
      const dataSrc = img.attr('data-lazy-src') || img.attr('data-src') || '';
      let imageUrl = dataSrc || (srcset ? srcset.split(',')[0].trim().split(' ')[0] : '') || null;
      if (imageUrl && !/logo|placeholder|icon/i.test(imageUrl) && !imageUrl.startsWith('data:')) {
        // imageUrl is good
      } else {
        imageUrl = null;
      }

      // Extract title from URL slug (will be replaced by og:title from event page)
      const slug = href.split('/event/')[1]?.replace(/\/$/, '') || '';
      const titleFromSlug = slug.split('-').slice(0, 5).join(' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Avalon Event';

      rawEvents.push({ date, url: href.startsWith('http') ? href : 'https://avalonhollywood.com' + href, imageUrl, titleFromSlug });
    });

    console.log(`  Found ${rawEvents.length} Avalon Hollywood events`);

    // Fetch og:title and og:image from event pages (limit to 20 parallel)
    const BATCH = 10;
    const formattedEvents = [];
    for (let i = 0; i < rawEvents.length; i += BATCH) {
      const batch = rawEvents.slice(i, i + BATCH);
      await Promise.all(batch.map(async (ev) => {
        let title = ev.titleFromSlug;
        let imageUrl = ev.imageUrl;
        try {
          const r = await axios.get(ev.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const $p = cheerio.load(r.data);
          const ogTitle = $p('meta[property="og:title"]').attr('content') || '';
          if (ogTitle && ogTitle.length > 3 && !/avalon hollywood/i.test(ogTitle)) {
            title = ogTitle.replace(/\s*[\|–—-]\s*Avalon.*$/i, '').trim().slice(0, 100);
          }
          if (!imageUrl) {
            const og = $p('meta[property="og:image"]').attr('content');
            if (og && og.startsWith('http') && !/logo|placeholder|favicon/i.test(og)) imageUrl = og;
          }
        } catch (e) { /* skip */ }
        formattedEvents.push({
          id: uuidv4(),
          title,
          date: ev.date,
          description: '',
          url: ev.url,
          imageUrl: imageUrl || null,
          venue: { name: 'Avalon Hollywood', address: '1735 Vine St, Los Angeles, CA 90028', city: 'Los Angeles' },
          city,
          category: 'Nightlife',
          source: 'AvalonHollywood'
        });
        console.log(`  ✓ ${title} | ${ev.date}`);
      }));
    }

    return filterEvents(formattedEvents);

  } catch (error) {
    console.error('  ⚠️  Avalon Hollywood error:', error.message);
    return [];
  }
}

module.exports = scrapeAvalonHollywood;
