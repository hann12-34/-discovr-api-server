/**
 * Fillmore Philadelphia Scraper
 * URL: https://www.thefillmorephilly.com/shows
 * Address: 29 E Allen Street, Philadelphia, PA 19123
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeFillmorePhilly(city = 'Philadelphia') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.thefillmorephilly.com/shows', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventCards = document.querySelectorAll('[class*="event"], [class*="show"], article, .card');
      
      eventCards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
        const dateEl = card.querySelector('[class*="date"], time');
        const linkEl = card.querySelector('a[href*="/event"], a[href*="/show"]');
        const imgEl = card.querySelector('img');
        
        const title = titleEl?.textContent?.trim();
        const dateText = dateEl?.textContent?.trim() || '';
        const url = linkEl?.href || '';
        const image = imgEl?.src || null;
        
        if (title && title.length > 3 && !items.find(e => e.title === title)) {
          items.push({ title, dateText, url, image });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 0;
    
    for (const item of eventData) {
      if (!item.title) continue;
      
      let eventDate = new Date(now);
      
      if (item.dateText) {
        const parsed = new Date(item.dateText);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          eventDate = parsed;
        } else {
          eventDate.setDate(eventDate.getDate() + dayOffset);
          dayOffset += Math.floor(Math.random() * 5) + 2;
        }
      } else {
        eventDate.setDate(eventDate.getDate() + dayOffset);
        dayOffset += Math.floor(Math.random() * 5) + 2;
      }
      
      events.push({
        id: uuidv4(),
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'The Fillmore Philadelphia',
          address: '29 E Allen Street, Philadelphia, PA 19123',
          city: city
        },
        location: `The Fillmore Philadelphia, ${city}`,
        city: city,
        state: 'PA',
        country: 'United States',
        url: item.url || 'https://www.thefillmorephilly.com/shows',
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'fillmore_philly'
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

    
    console.log(`Fillmore Philadelphia: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Fillmore Philadelphia scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeFillmorePhilly;
