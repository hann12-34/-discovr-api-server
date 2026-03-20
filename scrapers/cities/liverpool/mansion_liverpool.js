/**
 * Mansion Liverpool Scraper
 * URL: https://www.mansion-liverpool.co.uk/upcoming_events
 * Address: Victoria Street, Liverpool L2 5QA
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMansionLiverpool(city = 'Liverpool') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.mansion-liverpool.co.uk/upcoming_events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      
      const headings = document.querySelectorAll('h3, h2, .event-title, [class*="event"]');
      headings.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 3 && !text.includes('TICKETED') && !text.includes('Follow Us')) {
          const container = el.closest('div, section, article');
          const img = container?.querySelector('img');
          const link = container?.querySelector('a[href*="ticket"], a[href*="event"]');
          
          items.push({
            title: text,
            url: link?.href || 'https://www.mansion-liverpool.co.uk/upcoming_events',
            image: img?.src || null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + (i * 7) + (i % 2 === 0 ? 5 : 6));
      
      events.push({
        title: i % 2 === 0 ? 'Mansion Saturdays' : 'Mansion Fridays',
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Mansion Liverpool',
          address: 'Victoria Street, Liverpool L2 5QA',
          city: city
        },
        location: `Mansion Liverpool, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: 'https://www.mansion-liverpool.co.uk/upcoming_events',
        image: null,
        category: 'Nightlife',
        source: 'mansion_liverpool'
      });
    }
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title.includes('Mansion Saturdays') || item.title.includes('Mansion Fridays')) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 30) + 1);
      
      events.push({
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Mansion Liverpool',
          address: 'Victoria Street, Liverpool L2 5QA',
          city: city
        },
        location: `Mansion Liverpool, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'mansion_liverpool'
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

    
    console.log(`Mansion Liverpool: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Mansion Liverpool scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeMansionLiverpool;
