/**
 * Bristol Hippodrome Events Scraper
 * URL: https://www.atgtickets.com/venues/bristol-hippodrome/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { cleanImageUrl } = require('../../utils/eventFilter');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function parseAtgDate(text, now = new Date()) {
  if (!text) return null;
  // "Until Sat 1 Aug 2026" / "Fri 31 Jul 2026" / "Tue 4 Aug - Sat 8 Aug 2026"
  const range = text.match(
    /(?:Until\s+)?(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
  );
  if (!range) return null;
  const day = range[1].padStart(2, '0');
  const month = MONTHS[range[2].toLowerCase().slice(0, 3)];
  const year = range[3];
  if (!month) return null;
  const iso = `${year}-${month}-${day}`;
  if (new Date(iso) < new Date(now.toDateString())) return null;
  return iso;
}

async function scrapeHippodrome(city = 'Bristol') {
  console.log('🎭 Scraping Bristol Hippodrome...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.atgtickets.com/venues/bristol-hippodrome/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      document.querySelectorAll('[data-testid="showCard"]').forEach(card => {
        const link = card.querySelector('a[href*="/shows/"]');
        if (!link) return;
        const href = link.href.split('?')[0].replace(/\/calendar\/?$/, '/');
        if (seen.has(href) || /\/calendar\/?$/.test(link.href) && seen.has(href)) return;
        // Prefer non-calendar show URL
        const showUrl = href.includes('/calendar')
          ? href.replace(/\/calendar\/?$/, '/')
          : href;
        if (seen.has(showUrl)) return;
        seen.add(showUrl);
        const title = (card.querySelector('h2')?.textContent || '').trim();
        if (!title || title.length < 3) return;
        const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
        const img = card.querySelector('img')?.src || null;
        results.push({ title, text, url: showUrl, imageUrl: img });
      });
      return results;
    });

    await browser.close();

    const now = new Date();
    const formattedEvents = [];
    for (const event of events) {
      const isoDate = parseAtgDate(event.text, now);
      if (!isoDate) continue;
      const imageUrl = cleanImageUrl(event.imageUrl);
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: imageUrl || null,
        venue: {
          name: 'Bristol Hippodrome',
          address: 'St Augustines Parade, Bristol BS1 4UZ',
          city: 'Bristol'
        },
        latitude: 51.4540,
        longitude: -2.5940,
        city: 'Bristol',
        category: 'Arts',
        source: 'Bristol Hippodrome'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Hippodrome events`);
    return formattedEvents;
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Hippodrome error:', error.message);
    return [];
  }
}

module.exports = scrapeHippodrome;
