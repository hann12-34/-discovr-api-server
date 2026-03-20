/**
 * Wellington NZ Events - wellington Events Scraper
 * URL: https://www.wellingtonnz.com/experience/events
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function parseDate(raw) {
  if (!raw) return null;
  const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const yr = new Date().getFullYear();
  // ISO format
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return iso[1] + '-' + iso[2].padStart(2,'0') + '-' + iso[3].padStart(2,'0');
  // "March 15, 2026" or "Mar 15 2026" or "March 15" (no year)
  const mdy = raw.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:of\s+)?(?:(\d{4}))?/i);
  if (mdy) return (mdy[3]||yr) + '-' + months[mdy[1].toLowerCase().substring(0,3)] + '-' + mdy[2].padStart(2,'0');
  // "15 March 2026" or "15th March" or "1st of March"
  const dmy = raw.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*,?\s*(?:(\d{4}))?/i);
  if (dmy) return (dmy[3]||yr) + '-' + months[dmy[2].toLowerCase().substring(0,3)] + '-' + dmy[1].padStart(2,'0');
  // DD/MM/YYYY or MM/DD/YYYY
  const slash = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return slash[3] + '-' + slash[2].padStart(2,'0') + '-' + slash[1].padStart(2,'0');
  return null;
}

async function scrapeWellingtonNZEvents(city = 'wellington') {
  console.log('🎭 Scraping Wellington NZ Events...');
  try {
    const resp = await axios.get('https://www.wellingtonnz.com/experience/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });
    const $ = cheerio.load(resp.data);
    const events = [];
    const seen = new Set();

    // Try JSON-LD structured data first
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
        for (const item of items) {
          if (item['@type'] !== 'Event' && item['@type'] !== 'MusicEvent' && item['@type'] !== 'TheaterEvent' && item['@type'] !== 'DanceEvent') continue;
          const title = item.name;
          const dateRaw = item.startDate;
          const url = item.url || '';
          if (!title || !dateRaw) continue;
          const key = title.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          const isoDate = parseDate(dateRaw);
          if (!isoDate) continue;
          const loc = item.location || {};
          const addr = (loc.address && typeof loc.address === 'object') ? (loc.address.streetAddress || '') : (typeof loc.address === 'string' ? loc.address : '');
          let img = null;
          if (item.image) {
            img = typeof item.image === 'string' ? item.image : (item.image.url || (Array.isArray(item.image) ? item.image[0] : null));
          }
          if (img && typeof img === 'object') img = img.url || null;
          if (img && !img.startsWith('http')) img = null;
          let desc = item.description || '';
          if (desc) {
            desc = desc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            if (desc.length > 500) desc = desc.substring(0, 500) + '...';
          }
          events.push({
            id: uuidv4(),
            title: title.replace(/\s+/g, ' ').trim().substring(0, 200),
            description: desc || '',
            date: isoDate,
            startDate: new Date(isoDate + 'T00:00:00.000Z'),
            url: url.startsWith('http') ? url : '',
            imageUrl: img,
            venue: { name: 'Wellington NZ Events', address: addr || 'Wellington, NZ', city: 'wellington' },
            latitude: -41.2865,
            longitude: 174.7762,
            city: 'wellington',
            category: 'Events',
            source: 'Wellington NZ Events'
          });
        }
      } catch (e) {}
    });

    // CSS selector fallback if JSON-LD found nothing
    if (events.length === 0) {
      const eventSelectors = [
        'article', '.event-card', '.event-item', '.event-listing',
        '[class*="event-card"]', '[class*="event-item"]', '[class*="eventCard"]',
        '.show-card', '.show-item', '.performance-item', '.event',
        '.card', '.listing-item', '.grid-item', '.tribe-events-calendar-list__event',
        '.views-row', '.node--type-event', 'li[class*="event"]', '[class*="listing"]'
      ];
      let $events = $([]);
      for (const sel of eventSelectors) {
        const found = $(sel);
        if (found.length >= 1) { $events = found; break; }
      }
      $events.each((_, el) => {
        try {
          const $e = $(el);
          const $link = $e.find('a[href]').first();
          let eventUrl = $link.attr('href') || '';
          if (eventUrl && !eventUrl.startsWith('http')) {
            const base = new URL('https://www.wellingtonnz.com/experience/events');
            eventUrl = new URL(eventUrl, base.origin).href;
          }
          const titleEl = $e.find('h1, h2, h3, h4, .title, [class*="title"], .name, [class*="name"]').first();
          let title = titleEl.text().trim() || $link.text().trim();
          if (!title || title.length < 3 || title.length > 300) return;
          if (/^(what's on|events|upcoming|home|loading|error|untitled|view all)$/i.test(title.trim())) return;
          title = title.replace(/\s+/g, ' ').trim().substring(0, 200);
          const key = title.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);

          // Search for dates: first in dedicated date elements, then FULL card text
          const dateEl = $e.find('time, .date, [class*="date"], [datetime]').first();
          let dateRaw = dateEl.attr('datetime') || dateEl.text().trim() || '';
          let isoDate = parseDate(dateRaw);
          if (!isoDate) {
            // Search the entire card text for date patterns
            const fullText = $e.text().replace(/\s+/g, ' ');
            isoDate = parseDate(fullText);
          }
          if (!isoDate) return;
          const imgEl = $e.find('img').first();
          let img = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || null;
          if (img && !img.startsWith('http')) {
            try { img = new URL(img, 'https://www.wellingtonnz.com/experience/events').href; } catch(e) { img = null; }
          }
          if (img && (/logo|icon|placeholder|default\./i.test(img))) img = null;
          events.push({
            id: uuidv4(),
            title,
            description: '',
            date: isoDate,
            startDate: new Date(isoDate + 'T00:00:00.000Z'),
            url: eventUrl,
            imageUrl: img,
            venue: { name: 'Wellington NZ Events', address: 'Wellington, NZ', city: 'wellington' },
            latitude: -41.2865,
            longitude: 174.7762,
            city: 'wellington',
            category: 'Events',
            source: 'Wellington NZ Events'
          });
        } catch (e) {}
      });
    }

    // Fetch descriptions from detail pages
    for (const event of events) {
      if (event.description || !event.url || !event.url.startsWith('http')) continue;
      try {
        const dr = await axios.get(event.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          timeout: 8000
        });
        const d$ = cheerio.load(dr.data);
        let desc = d$('meta[property="og:description"]').attr('content') || '';
        if (!desc || desc.length < 20) desc = d$('meta[name="description"]').attr('content') || '';
        if (!desc || desc.length < 20) {
          for (const s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p']) {
            const t = d$(s).first().text().trim();
            if (t && t.length > 30) { desc = t; break; }
          }
        }
        if (desc) {
          desc = desc.replace(/\s+/g, ' ').trim();
          if (desc.length > 500) desc = desc.substring(0, 500) + '...';
          event.description = desc;
        }
        if (!event.imageUrl) {
          const ogi = d$('meta[property="og:image"]').attr('content');
          if (ogi && ogi.startsWith('http') && !/logo|icon|placeholder/i.test(ogi)) event.imageUrl = ogi;
        }
      } catch (e) {}
    }

    // Filter future events only (using local date string to avoid timezone issues)
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    const futureEvents = events.filter(e => e.date >= todayStr);
    console.log('  ✅ Wellington NZ Events:', futureEvents.length, 'events');
    return filterEvents(futureEvents);
  } catch (error) {
    console.error('  ⚠️ Wellington NZ Events error:', error.message);
    return [];
  }
}

module.exports = scrapeWellingtonNZEvents;
