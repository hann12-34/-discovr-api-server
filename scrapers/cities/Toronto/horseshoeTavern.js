const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Toronto') {
  console.log('🐴 Scraping Horseshoe Tavern events...');
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.horseshoetavern.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(r => setTimeout(r, 3000));

    const rawEvents = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all links on the page
      document.querySelectorAll('a').forEach(a => {
        const href = a.href;
        if (!href || !href.includes('horseshoe') || !href.includes('event')) return;
        if (href === 'https://www.horseshoetavern.com/events' || href === 'https://www.horseshoetavern.com/events/') return;
        if (seen.has(href)) return;
        
        // Get title from link text
        let title = a.textContent?.trim();
        if (!title || title.length < 5 || title === 'Events' || title === 'List View' || title === 'Tickets') return;
        
        seen.add(href);
        
        // Find image - check parent and grandparent elements
        const parent = a.parentElement;
        const grandparent = parent?.parentElement;
        let imgSrc = null;
        const img = grandparent?.querySelector('img') || parent?.querySelector('img');
        if (img) {
          imgSrc = img.src || img.getAttribute('data-src');
        }
        
        // Extract date from title text (format: "TitleSat, Dec 28" or "TitleSaturday, Dec 28")
        let dateStr = null;
        const dateMatch = title.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        if (dateMatch) {
          const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const day = dateMatch[3].padStart(2, '0');
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const eventMonth = parseInt(month);
          const year = eventMonth < currentMonth ? now.getFullYear() + 1 : now.getFullYear();
          dateStr = `${year}-${month}-${day}`;
          
          // Clean title - remove date part
          title = title.replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}/i, '').trim();
        }
        
        // Clean title - remove trailing pipe
        title = title?.replace(/\s*\|\s*$/, '').trim();
        
        if (title && title.length > 3 && dateStr) {
          results.push({
            title: title.substring(0, 100),
            url: href,
            date: dateStr,
            imageUrl: imgSrc && !imgSrc.includes('logo') ? imgSrc : null
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const events = rawEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      url: event.url,
      date: event.date,
      startDate: new Date(event.date + 'T20:00:00'),
      imageUrl: event.imageUrl,
      venue: {
        name: 'Horseshoe Tavern',
        address: '370 Queen St W, Toronto, ON M5V 2A2',
        city: 'Toronto'
      },
      city: city,
      category: 'Nightlife',
      source: 'Horseshoe Tavern'
    }));

    console.log(`✅ Horseshoe Tavern: ${events.length} events, ${events.filter(e => e.imageUrl).length} with images`);

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

    return filterEvents(events);

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error scraping Horseshoe Tavern:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
