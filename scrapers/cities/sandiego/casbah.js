/**
 * Casbah San Diego Events Scraper
 * Legendary live music venue in San Diego
 * URL: https://www.casbahmusic.com/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeCasbah(city = 'San Diego') {
  console.log('🎸 Scraping Casbah San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.casbahmusic.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.seetickets-list-event, [class*="event"], article, .event-item').forEach(el => {
        try {
          const dateEl = el.querySelector('.dates, .event-date, time, [class*="date"]');
          const dateStr = dateEl?.textContent?.trim();
          
          const linkEl = el.querySelector('a[href*="/event/"]');
          const url = linkEl?.href;
          
          const titleEl = el.querySelector('h2, h3, .event-title, .seetickets-list-event-title, a[href*="/event/"]');
          let title = titleEl?.textContent?.trim();
          if (title?.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/)) title = null;
          
          // Try multiple image sources
          const imgEl = el.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src');
          
          // Check for background image
          if (!imageUrl) {
            const bgEl = el.querySelector('[style*="background"]') || el;
            const bgMatch = bgEl?.style?.backgroundImage?.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch) imageUrl = bgMatch[1];
          }
          
          // Check picture/source elements
          if (!imageUrl) {
            const sourceEl = el.querySelector('picture source, source[srcset]');
            if (sourceEl) imageUrl = sourceEl.srcset?.split(',')[0]?.split(' ')[0];
          }
          
          if (title && title.length > 3 && url && !seen.has(url)) {
            seen.add(url);
            results.push({ title: title.substring(0, 80), dateStr, url, imageUrl });
          }
        } catch (e) {}
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
          name: 'Casbah',
          address: '2501 Kettner Blvd, San Diego, CA 92101',
          city: 'San Diego'
        },
        latitude: 32.7307,
        longitude: -117.1976,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'Casbah'
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


    console.log(`  ✅ Found ${formattedEvents.length} valid Casbah events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Casbah error:', error.message);
    return [];
  }
}

module.exports = scrapeCasbah;
