/**
 * Cyprus Avenue Cork Events Scraper
 * Live music venue
 * URL: https://www.cyprusavenue.ie/gigs
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { cleanImageUrl } = require('../../utils/eventFilter');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function parseCyprusDate(dateStr, now = new Date()) {
  if (!dateStr) return null;
  // "Thu 23 Jul" / "Sat 1 Aug"
  const m = dateStr.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i
  );
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (!month) return null;
  let year = now.getFullYear();
  let iso = `${year}-${month}-${day}`;
  if (new Date(iso) < new Date(now.toDateString())) {
    year += 1;
    iso = `${year}-${month}-${day}`;
  }
  return iso;
}

async function scrapeCyprusAvenue(city = 'Cork') {
  console.log('🎸 Scraping Cyprus Avenue Cork...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.cyprusavenue.ie/gigs', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      // Rows are typically date + event link
      document.querySelectorAll('a[href*="/gigs/"]').forEach(a => {
        const href = a.href.split('?')[0];
        if (!href || href.endsWith('/gigs') || href.endsWith('/gigs/') || seen.has(href)) return;
        if (/eventbrite|songkick|allevents|do604/i.test(href)) return;
        seen.add(href);

        let title = (a.innerText || '').replace(/\s+/g, ' ').trim();
        if (!title || title.length < 3) {
          // slug fallback: /gigs/cry-before-dawn-11194570
          const slug = href.split('/gigs/')[1] || '';
          title = slug
            .replace(/-\d+$/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim();
        }
        if (!title || title.length < 3 || /^(tickets|book)$/i.test(title)) return;

        let dateStr = '';
        let node = a.parentElement;
        for (let i = 0; i < 6 && node; i++) {
          const blob = (node.innerText || '').replace(/\s+/g, ' ').trim();
          const m = blob.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          if (m) { dateStr = m[0]; break; }
          node = node.parentElement;
        }
        results.push({ title, dateStr, url: href });
      });
      return results;
    });

    await browser.close();

    const now = new Date();
    const formattedEvents = [];
    for (const event of events) {
      const isoDate = parseCyprusDate(event.dateStr, now);
      if (!isoDate) continue;
      // Rule 7: never surface competitor aggregator links
      let eventUrl = event.url || '';
      if (eventUrl && /eventbrite|songkick|allevents|do604/i.test(eventUrl)) eventUrl = '';
      if (!eventUrl || !eventUrl.startsWith('http')) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: eventUrl,
        imageUrl: null,
        venue: {
          name: 'Cyprus Avenue',
          address: 'Caroline Street, Cork T12 XF62',
          city: 'Cork'
        },
        latitude: 51.8969,
        longitude: -8.4683,
        city: 'Cork',
        category: 'Nightlife',
        source: 'Cyprus Avenue'
      });
    }

    for (const event of formattedEvents) {
      if (!event.url || !event.url.startsWith('http')) continue;
      try {
        const _r = await axios.get(event.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          timeout: 8000
        });
        const _$ = cheerio.load(_r.data);
        const ogImg = cleanImageUrl(_$('meta[property="og:image"]').attr('content') || '');
        if (ogImg) event.imageUrl = ogImg;
        let _desc = _$('meta[property="og:description"]').attr('content') || '';
        if (!_desc || _desc.length < 20) {
          _desc = _$('meta[name="description"]').attr('content') || '';
        }
        if (_desc) {
          _desc = _desc.replace(/\s+/g, ' ').trim();
          if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
          event.description = _desc;
        }
      } catch (_e) { /* skip */ }
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Cyprus Avenue events`);
    return formattedEvents;
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Cyprus Avenue error:', error.message);
    return [];
  }
}

module.exports = scrapeCyprusAvenue;
