/**
 * Schubas Tavern Chicago Events Scraper
 * Live music venue in Lakeview
 * URL: https://lh-st.com/shows/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeSchubas(city = 'Chicago') {
  console.log('🎸 Scraping Schubas Tavern Chicago...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://lh-st.com/shows/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // lh-st.com uses links with date in URL format: /shows/MM-DD-YYYY-title/
      document.querySelectorAll('a[href*="/shows/"]').forEach(link => {
        try {
          const href = link.href;
          if (seen.has(href) || !href.includes('/shows/') || href.endsWith('/shows/')) return;
          seen.add(href);

          const title = link.textContent.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          // Extract date from URL: /shows/MM-DD-YYYY-title/
          const urlMatch = href.match(/\/shows\/(\d{2})-(\d{2})-(\d{4})-/);
          let dateStr = null;
          if (urlMatch) {
            dateStr = `${urlMatch[3]}-${urlMatch[1]}-${urlMatch[2]}`;
          }

          const container = link.closest('article, div, li');
          const img = container?.querySelector('img');
          const imageUrl = img?.src || null;

          results.push({ title, url: href, imageUrl, dateStr });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Schubas events`);

    const formattedEvents = [];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (const event of events) {
      let isoDate = event.dateStr; // Already in YYYY-MM-DD format from URL parsing
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Schubas Tavern', address: '3159 N Southport Ave, Chicago IL 60657', city: 'Chicago' },
        latitude: 41.9396,
        longitude: -87.6636,
        city: 'Chicago',
        category: 'Nightlife',
        source: 'Schubas Tavern'
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


    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Schubas error:', error.message);
    return [];
  }
}

module.exports = scrapeSchubas;
