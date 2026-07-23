/**
 * Tobacco Factory Theatres Bristol Events Scraper
 * URL: https://tobaccofactorytheatres.com/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { cleanImageUrl } = require('../../utils/eventFilter');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function parseTobaccoDate(text, now = new Date()) {
  if (!text) return null;
  // "22 OCT - 24 OCT 2026" or "13 SEP - 29 NOV 2026"
  const m = text.match(
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s*[-–—]\s*(?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)?\s+(\d{4})/i
  );
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  const year = m[3];
  if (!month) return null;
  const iso = `${year}-${month}-${day}`;
  if (new Date(iso) < new Date(now.toDateString())) return null;
  return iso;
}

async function scrapeTobaccoFactory(city = 'Bristol') {
  console.log('🎭 Scraping Tobacco Factory...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://tobaccofactorytheatres.com/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      document.querySelectorAll('div.block.show').forEach(card => {
        const link = card.querySelector('a[href*="/shows/"]');
        if (!link) return;
        const href = link.href.split('#')[0];
        if (seen.has(href)) return;
        seen.add(href);
        const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
        // Title is usually the first line before the date
        let title = text
          .replace(/^GET INVOLVED\s+/i, '')
          .replace(/\s+BOOK NOW.*$/i, '')
          .replace(/\s+MORE INFO.*$/i, '')
          .trim();
        const dateMatch = title.match(
          /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*.*\d{4})/i
        );
        if (dateMatch) {
          title = title.slice(0, dateMatch.index).trim();
        }
        title = title.replace(/\s+/g, ' ').trim();
        if (!title || title.length < 3 || title.length > 150) return;
        const img = card.querySelector('img')?.src || null;
        results.push({ title, text, url: href, imageUrl: img });
      });
      return results;
    });

    await browser.close();

    const now = new Date();
    const formattedEvents = [];
    for (const event of events) {
      const isoDate = parseTobaccoDate(event.text, now);
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
          name: 'Tobacco Factory Theatres',
          address: 'Raleigh Rd, Bristol BS3 1TF',
          city: 'Bristol'
        },
        latitude: 51.4420,
        longitude: -2.6020,
        city: 'Bristol',
        category: 'Arts',
        source: 'Tobacco Factory'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Tobacco Factory events`);
    return formattedEvents;
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Tobacco Factory error:', error.message);
    return [];
  }
}

module.exports = scrapeTobaccoFactory;
