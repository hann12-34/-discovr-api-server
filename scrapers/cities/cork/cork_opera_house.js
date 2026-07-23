/**
 * Cork Opera House Events Scraper
 * URL: https://www.corkoperahouse.ie/whats-on
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

function parseOperaDate(dateStr, now = new Date()) {
  if (!dateStr) return null;
  // "Thurs 23 Jul - Sun 23 Aug, Various Times"
  // "Fri 28 - Sat 29 Aug, 8pm"
  // "Thurs 3 Sep, 8pm"
  // "Fri 28 - Sat 29 Aug, 8pm" (day range without month on first)
  let m = dateStr.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)?[a-z]*\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i
  );
  if (!m) {
    // "Fri 28 - Sat 29 Aug" — month only on end
    m = dateStr.match(
      /(\d{1,2})\s*[-–—]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)?[a-z]*\s*\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i
    );
  }
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (!month) return null;
  let year = now.getFullYear();
  const yearMatch = dateStr.match(/\b(20\d{2})\b/);
  if (yearMatch) year = parseInt(yearMatch[1], 10);
  else if (parseInt(month, 10) < now.getMonth() + 1 - 1) year += 1;
  // if month already passed this year (and no explicit year), roll forward
  const iso = `${year}-${month}-${day}`;
  if (!yearMatch && new Date(iso) < new Date(now.toDateString())) {
    return `${year + 1}-${month}-${day}`;
  }
  if (new Date(iso) < new Date(now.toDateString())) return null;
  return iso;
}

async function scrapeCorkOperaHouse(city = 'Cork') {
  console.log('🎭 Scraping Cork Opera House...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.corkoperahouse.ie/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      document.querySelectorAll('a[href*="/whats-on/"]').forEach(a => {
        let href = a.href.split('#')[0].split('?')[0];
        href = href.replace(/\/+$/, '/');
        if (!href || href.endsWith('/whats-on/') || seen.has(href)) return;
        const title = (a.innerText || '').replace(/\s+/g, ' ').trim();
        if (!title || title.length < 3 || title.length > 150) return;
        if (/^(BOOK|SOLD OUT|MORE|TICKETS)$/i.test(title)) return;
        seen.add(href);

        let dateStr = '';
        let node = a.parentElement;
        for (let i = 0; i < 8 && node; i++) {
          const blob = (node.innerText || '').replace(/\s+/g, ' ').trim();
          const m = blob.match(
            /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)[a-z]*\s+\d{1,2}(?:\s*[-–—]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)?[a-z]*\s*\d{1,2})?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s*[-–—]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)?[a-z]*\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)?/i
          ) || blob.match(
            /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)[a-z]*\s+\d{1,2}\s*[-–—]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs|Tues)?[a-z]*\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i
          );
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
      const isoDate = parseOperaDate(event.dateStr, now);
      if (!isoDate) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'Cork Opera House',
          address: 'Emmet Pl, Centre, Cork',
          city: 'Cork'
        },
        latitude: 51.8980,
        longitude: -8.4705,
        city: 'Cork',
        category: 'Arts',
        source: 'Cork Opera House'
      });
    }

    // Fetch real og:image / description from detail pages (listing uses blankImg placeholders)
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

    console.log(`  ✅ Found ${formattedEvents.length} Cork Opera House events`);
    return formattedEvents;
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Cork Opera House error:', error.message);
    return [];
  }
}

module.exports = scrapeCorkOperaHouse;
