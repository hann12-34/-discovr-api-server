/**
 * Belly Up Tavern San Diego Events Scraper
 * Premier live music venue in Solana Beach
 * URL: https://bellyup.com/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeBellyUp(city = 'San Diego') {
  console.log('🎸 Scraping Belly Up Tavern San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://bellyup.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const imageMap = {};
      
      // First, try to get images from DOM elements
      document.querySelectorAll('.event-item, .event, article, [class*="event"], a[href*="/event/"]').forEach(el => {
        const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/event/"]');
        const url = linkEl?.href;
        if (!url) return;
        
        const imgEl = el.querySelector('img');
        let img = imgEl?.src || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src');
        
        if (!img) {
          const bgEl = el.querySelector('[style*="background"]') || el;
          const bgMatch = bgEl?.style?.backgroundImage?.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (bgMatch) img = bgMatch[1];
        }
        
        if (img && img.startsWith('http')) {
          imageMap[url] = img;
        }
      });
      
      // Then use EventData JavaScript object for event info
      if (typeof EventData !== 'undefined' && EventData.events) {
        EventData.events.forEach(e => {
          const title = e.value || e.display;
          const url = e.data?.url;
          if (title && url) {
            const dateMatch = title.match(/(\d{1,2})\/(\d{1,2})$/);
            let dateStr = dateMatch ? dateMatch[0] : '';
            const imageUrl = e.data?.image || imageMap[url] || null;
            results.push({ 
              title: title.replace(/\s*\d{1,2}\/\d{1,2}$/, '').trim(), 
              dateStr, 
              url, 
              imageUrl
            });
          }
        });
      }
      
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
        // Handle MM/DD format from Belly Up
        const mmddMatch = event.dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (mmddMatch) {
          const month = mmddMatch[1].padStart(2, '0');
          const day = mmddMatch[2].padStart(2, '0');
          let year = now.getFullYear().toString();
          if (parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        } else if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
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
          name: 'Belly Up Tavern',
          address: '143 S Cedros Ave, Solana Beach, CA 92075',
          city: 'San Diego'
        },
        latitude: 32.9912,
        longitude: -117.2698,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'Belly Up Tavern'
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


    console.log(`  ✅ Found ${formattedEvents.length} valid Belly Up events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Belly Up error:', error.message);
    return [];
  }
}

module.exports = scrapeBellyUp;
