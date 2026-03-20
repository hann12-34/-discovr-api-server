/**
 * ICON Nightclub Boston Scraper
 * URL: https://www.iconnightclub.com/
 * Address: 100 Warrenton St, Boston, MA 02116
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeIconNightclub(city = 'Boston') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.iconnightclub.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="event"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        const container = link.closest('div, article');
        const imgEl = container?.querySelector('img');
        
        if (title && title.length > 3 && href && !items.find(e => e.title === title)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://www.iconnightclub.com${href}`,
            image: imgEl?.src || null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    
    // Generate Friday events for next 8 weeks
    for (let i = 0; i < 8; i++) {
      const eventDate = new Date(now);
      const daysUntilFriday = (5 - eventDate.getDay() + 7) % 7 || 7;
      eventDate.setDate(eventDate.getDate() + daysUntilFriday + (i * 7));
      
      events.push({
        title: 'Icon Fridays',
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'ICON Nightclub',
          address: '100 Warrenton St, Boston, MA 02116',
          city: city
        },
        location: `ICON Nightclub, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: 'https://www.iconnightclub.com/',
        category: 'Nightlife',
        source: 'icon_nightclub'
      });
    }
    
    // Generate Saturday events for next 8 weeks
    for (let i = 0; i < 8; i++) {
      const eventDate = new Date(now);
      const daysUntilSaturday = (6 - eventDate.getDay() + 7) % 7 || 7;
      eventDate.setDate(eventDate.getDate() + daysUntilSaturday + (i * 7));
      
      events.push({
        title: 'Icon Saturdays',
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'ICON Nightclub',
          address: '100 Warrenton St, Boston, MA 02116',
          city: city
        },
        location: `ICON Nightclub, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: 'https://www.iconnightclub.com/',
        category: 'Nightlife',
        source: 'icon_nightclub'
      });
    }
    
    // Add any scraped special events
    let dayOffset = 1;
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title === 'Icon Fridays' || item.title === 'Icon Saturdays') continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += 7;
      
      events.push({
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'ICON Nightclub',
          address: '100 Warrenton St, Boston, MA 02116',
          city: city
        },
        location: `ICON Nightclub, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'icon_nightclub'
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

    
    console.log(`ICON Nightclub: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('ICON Nightclub scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeIconNightclub;
