/**
 * Royal Exchange Theatre - manchester Events Scraper (Puppeteer)
 * URL: https://www.royalexchange.co.uk/whats-on
 */
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function parseDate(raw) {
  if (!raw) return null;
  const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const yr = new Date().getFullYear();
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return iso[1] + '-' + iso[2].padStart(2,'0') + '-' + iso[3].padStart(2,'0');
  const mdy = raw.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:of\s+)?(?:(\d{4}))?/i);
  if (mdy) return (mdy[3]||yr) + '-' + months[mdy[1].toLowerCase().substring(0,3)] + '-' + mdy[2].padStart(2,'0');
  const dmy = raw.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*,?\s*(?:(\d{4}))?/i);
  if (dmy) return (dmy[3]||yr) + '-' + months[dmy[2].toLowerCase().substring(0,3)] + '-' + dmy[1].padStart(2,'0');
  const slash = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return slash[3] + '-' + slash[2].padStart(2,'0') + '-' + slash[1].padStart(2,'0');
  return null;
}

async function scrapeRoyalExchangeTheatre(city = 'manchester') {
  console.log('🎭 Scraping Royal Exchange Theatre (Puppeteer)...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.royalexchange.co.uk/whats-on', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Extract events from rendered DOM
    const rawEvents = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Try JSON-LD first (now available after JS execution)
      document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
        try {
          const json = JSON.parse(el.textContent);
          const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
          items.forEach(item => {
            if (!['Event','MusicEvent','TheaterEvent','DanceEvent'].includes(item['@type'])) return;
            if (!item.name || !item.startDate) return;
            const key = item.name.toLowerCase().trim();
            if (seen.has(key)) return;
            seen.add(key);
            let img = null;
            if (item.image) img = typeof item.image === 'string' ? item.image : (item.image.url || (Array.isArray(item.image) ? item.image[0] : null));
            if (img && typeof img === 'object') img = img.url || null;
            const loc = item.location || {};
            const addr = (loc.address && typeof loc.address === 'object') ? (loc.address.streetAddress || '') : (typeof loc.address === 'string' ? loc.address : '');
            results.push({
              title: item.name, dateRaw: item.startDate, url: item.url || '',
              image: img, description: item.description || '', address: addr, source: 'jsonld'
            });
          });
        } catch(e) {}
      });

      if (results.length > 0) return results;

      // CSS selector fallback on rendered DOM
      const eventSelectors = [
        'article', '.event-card', '.event-item', '.event-listing',
        '[class*="event-card"]', '[class*="event-item"]', '[class*="eventCard"]',
        '.show-card', '.show-item', '.performance-item', '.event',
        '.card', '.listing-item', '.grid-item', '.tribe-events-calendar-list__event',
        '.views-row', '.node--type-event', 'li[class*="event"]', '[class*="listing"]'
      ];
      let eventEls = [];
      for (const sel of eventSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 1) { eventEls = Array.from(found); break; }
      }

      eventEls.forEach(el => {
        try {
          const linkEl = el.querySelector('a[href]');
          const url = linkEl ? linkEl.href : '';
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"], .name, [class*="name"]');
          let title = titleEl ? titleEl.childNodes[0]?.textContent?.trim() || titleEl.textContent.trim() : (linkEl ? linkEl.textContent.trim() : '');
          if (!title || title.length < 3 || title.length > 300) return;
          if (/^(what's on|events|upcoming|home|loading|error|untitled|view all)$/i.test(title.trim())) return;
          title = title.replace(/\s+/g, ' ').replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*/i, '').trim().substring(0, 200);
          if (!title || title.length < 3) return;
          const key = title.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          const timeEl = el.querySelector('time[datetime]');
          const dateEl = el.querySelector('time, .date, [class*="date"], [datetime]');
          let dateRaw = '';
          if (timeEl) dateRaw = timeEl.getAttribute('datetime');
          else if (dateEl) dateRaw = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          if (!dateRaw) dateRaw = el.textContent.replace(/\s+/g, ' ');
          const imgEl = el.querySelector('img');
          let img = imgEl ? (imgEl.src || imgEl.dataset.src || imgEl.dataset.lazySrc || '') : '';
          if (img && /logo|icon|placeholder|default\.|default\/files\/styles|sprite/i.test(img)) img = '';
          results.push({ title, dateRaw, url, image: img || '', description: '', address: '', source: 'css' });
        } catch(e) {}
      });

      return results;
    });

    await browser.close();
    browser = null;

    // Process raw events
    const events = [];
    const seen2 = new Set();
    for (const raw of rawEvents) {
      const key = raw.title.toLowerCase().trim();
      if (seen2.has(key)) continue;
      seen2.add(key);
      const isoDate = parseDate(raw.dateRaw);
      if (!isoDate) continue;
      let eventUrl = raw.url || '';
      if (eventUrl && !eventUrl.startsWith('http')) {
        try { eventUrl = new URL(eventUrl, 'https://www.royalexchange.co.uk/whats-on').href; } catch(e) { eventUrl = ''; }
      }
      let img = raw.image || null;
      if (img && !img.startsWith('http')) img = null;
      let desc = raw.description || '';
      if (desc) {
        desc = desc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (desc.length > 500) desc = desc.substring(0, 500) + '...';
      }
      events.push({
        id: uuidv4(),
        title: raw.title.replace(/\s+/g, ' ').trim().substring(0, 200),
        description: desc,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: eventUrl,
        imageUrl: img,
        venue: { name: 'Royal Exchange Theatre', address: raw.address || 'jsonld', city: 'manchester' },
        latitude: 53.4828,
        longitude: -2.2437,
        city: 'manchester',
        category: 'Events',
        source: 'Royal Exchange Theatre'
      });
    }

    // Filter future events only (using local date string to avoid timezone issues)
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    const futureEvents = events.filter(e => e.date >= todayStr);
    console.log('  ✅ Royal Exchange Theatre:', futureEvents.length, 'events');
    return filterEvents(futureEvents);
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error('  ⚠️ Royal Exchange Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeRoyalExchangeTheatre;
