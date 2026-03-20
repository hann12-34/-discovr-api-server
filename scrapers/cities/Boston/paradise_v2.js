/**
 * Paradise Rock Club V2 Boston Events Scraper
 * URL: https://www.crossroadspresents.com/venues/paradise-rock-club
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeParadiseV2(city = 'Boston') {
  console.log('🎸 Scraping Paradise V2...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.crossroadspresents.com/venues/paradise-rock-club', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event"]').forEach(el => {
        const href = el.href;
        if (seen.has(href)) return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 5; i++) {
          container = container.parentElement;
          if (!container) break;
        }
        
        const title = container?.querySelector('h2, h3, h4, .title, .headliners')?.textContent?.trim()?.replace(/\s+/g, ' ');
        const allText = container?.textContent || '';
        const dateMatch = allText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        const dateStr = dateMatch ? dateMatch[0] : null;
        const img = container?.querySelector('img')?.src;
        
        if (title && title.length > 3 && title.length < 100) {
          results.push({ title, dateStr, url: href, imageUrl: img });
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const seenKeys = new Set();
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
          const day = dateMatch[2].padStart(2, '0');
          let year = now.getFullYear().toString();
          if (parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      const key = event.title + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Paradise Rock Club',
          address: '967 Commonwealth Ave, Boston, MA 02215',
          city: 'Boston'
        },
        latitude: 42.3500,
        longitude: -71.1136,
        city: 'Boston',
        category: 'Nightlife',
        source: 'Paradise V2'
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


    console.log(`  ✅ Found ${formattedEvents.length} Paradise V2 events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Paradise V2 error:', error.message);
    return [];
  }
}

module.exports = scrapeParadiseV2;
