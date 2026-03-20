/**
 * Basement 45 Bristol Events Scraper
 * Popular nightclub in Bristol
 * URL: https://basement45.co.uk/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeBasement45Bristol(city = 'Bristol') {
  console.log('🎵 Scraping Basement 45 Bristol...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://basement45.co.uk/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.event-item, .event-card, article, [class*="event"], a[href*="event"]').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = link?.href; if (!url) return;

          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl?.textContent?.trim() || link?.textContent?.trim()?.substring(0, 100);
          if (!title || title.length < 3 || title.length > 150) return;
          if (/^(View|More|Read|Click|Book|Buy)/i.test(title)) return;

          const key = title.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);

          const dateEl = el.querySelector('time, [class*="date"]');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || el.textContent || '';

          const img = el.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({ title, url, dateText, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;
      if (event.dateText) {
        const isoMatch = event.dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        } else {
          const match = event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (match) {
            const month = months[match[1].toLowerCase().substring(0, 3)];
            const day = match[2].padStart(2, '0');
            const year = match[3] || now.getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Basement 45',
          address: '8 Frogmore Street, Bristol BS1 5NA',
          city: 'Bristol'
        },
        city: 'Bristol',
        category: 'Nightlife',
        source: 'Basement 45'
      });
    }

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }


    console.log(`  ✅ Found ${formattedEvents.length} Basement 45 events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Basement 45 error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeBasement45Bristol;
