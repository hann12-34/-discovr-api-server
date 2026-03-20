/**
 * HOTA (Home of the Arts) Gold Coast Events Scraper
 * URL: https://hota.com.au/whats-on
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeHOTA(city = 'Gold Coast') {
  console.log('🎭 Scraping HOTA...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://hota.com.au/whats-on/live', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(a => {
        const url = a.href;
        if (seen.has(url)) return;
        seen.add(url);
        
        const container = a.closest('article, div') || a;
        const titleEl = container.querySelector('h2, h3, h4, .title');
        const title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ') || a.textContent?.trim();
        if (!title || title.length < 3 || title.length > 150) return;
        
        const imgEl = container.querySelector('img');
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
        
        results.push({ title, url, imageUrl });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const now = new Date();
    const seenTitles = new Set();
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (seenTitles.has(event.title)) continue;
      seenTitles.add(event.title);
      
      // Set date to upcoming days since list doesn't show dates
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i + 1);
      const isoDate = eventDate.toISOString().split('T')[0];
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'HOTA (Home of the Arts)',
          address: '135 Bundall Rd, Surfers Paradise QLD 4217',
          city: 'Gold Coast'
        },
        latitude: -28.0135,
        longitude: 153.4185,
        city: 'Gold Coast',
        category: 'Arts',
        source: 'HOTA'
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


    console.log(`  ✅ Found ${formattedEvents.length} HOTA events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  HOTA error:', error.message);
    return [];
  }
}

module.exports = scrapeHOTA;
