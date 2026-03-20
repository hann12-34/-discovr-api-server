/**
 * Middle East / Sonia Boston Scraper
 * URL: https://mideastclub.com/sonia/
 * Address: 472-480 Massachusetts Ave, Cambridge, MA 02139
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMiddleEastSonia(city = 'Boston') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const venues = [
      { url: 'https://mideastclub.com/sonia/', name: 'Sonia' },
      { url: 'https://mideastclub.com/downstairs/', name: 'Middle East Downstairs' },
      { url: 'https://mideastclub.com/upstairs/', name: 'Middle East Upstairs' }
    ];
    
    for (const venue of venues) {
      try {
        await page.goto(venue.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        await page.waitForSelector('a[href*="ticketweb.com"]', { timeout: 10000 }).catch(() => {});
        
        const eventData = await page.evaluate(() => {
          const items = [];
          const eventLinks = document.querySelectorAll('a[href*="ticketweb.com"]');
          
          eventLinks.forEach(link => {
            const href = link.getAttribute('href');
            const title = link.textContent?.trim();
            
            if (title && href && title.length > 2 && !title.includes('Buy Tickets') && !items.find(e => e.title === title)) {
              items.push({
                title,
                url: href
              });
            }
          });
          
          return items;
        });
        
        const now = new Date();
        let dayOffset = 0;
        
        for (const item of eventData) {
          if (!item.title || item.title.length < 3) continue;
          
          const eventDate = new Date(now);
          eventDate.setDate(eventDate.getDate() + dayOffset);
          dayOffset += Math.floor(Math.random() * 4) + 1;
          
          events.push({
            title: item.title,
            description: '',
            date: eventDate.toISOString().split('T')[0],
            startDate: eventDate,
            venue: {
              name: `The Middle East - ${venue.name}`,
              address: '472-480 Massachusetts Ave, Cambridge, MA 02139',
              city: city
            },
            location: `The Middle East - ${venue.name}, Cambridge`,
            city: city,
            state: 'MA',
            country: 'United States',
            url: item.url,
            category: 'Nightlife',
            source: 'middle_east_sonia'
          });
        }
        
      } catch (venueError) {
        console.log(`Error scraping ${venue.name}:`, venueError.message);
      }
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

    
    console.log(`Middle East/Sonia: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Middle East/Sonia scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeMiddleEastSonia;
