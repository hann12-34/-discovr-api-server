/**
 * 99ten (9910) Edmonton Events Scraper
 * Nightclub & Event Venue on Whyte Ave
 * URL: https://www.99ten.ca/events
 * 
 * REBUILT: Fast single-page scrape, no individual page visits
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape99ten(city = 'Edmonton') {
  console.log('🎧 Scraping 99ten Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 30000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.99ten.ca/events', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const results = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const url = link.href;
        const urlMatch = url.match(/\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
        if (!urlMatch) return;
        
        const year = urlMatch[1];
        const month = urlMatch[2].padStart(2, '0');
        const day = urlMatch[3].padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        
        if (new Date(isoDate) < today) return;
        
        const container = link.closest('article, .eventlist-event, [class*="event"]') || link.parentElement;
        if (!container) return;
        
        const titleEl = container.querySelector('h1, h2, h3, .eventlist-title');
        const title = titleEl ? titleEl.textContent.trim() : null;
        if (!title || title.length < 3) return;
        
        const imgEl = container.querySelector('img');
        let imageUrl = null;
        if (imgEl && imgEl.src && imgEl.src.startsWith('http') && !imgEl.src.includes('logo')) {
          imageUrl = imgEl.src;
        }
        
        results.push({ title, isoDate, url, imageUrl });
      });
      
      return results;
    });

    await browser.close();

    const seen = new Set();
    const unique = [];
    
    for (const e of events) {
      const key = `${e.title}|${e.isoDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      
      unique.push({
        id: uuidv4(),
        title: e.title,
        date: e.isoDate,
        startDate: new Date(e.isoDate + 'T00:00:00.000Z'),
        url: e.url,
        imageUrl: e.imageUrl || null,
        venue: {
          name: '99ten',
          address: '9910 82 Avenue NW, Edmonton, AB T6E 2A3',
          city: 'Edmonton'
        },
        latitude: 53.5194,
        longitude: -113.4987,
        city: 'Edmonton',
        category: 'Nightlife',
        source: '99ten'
      });
    }

      // Fetch descriptions from event detail pages
      for (const event of events) {
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


    console.log(`  ✅ Found ${unique.length} 99ten events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ 99ten error:', error.message);
    try { if (browser) await browser.close(); } catch (e) {}
    return [];
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
  }
}

module.exports = scrape99ten;
