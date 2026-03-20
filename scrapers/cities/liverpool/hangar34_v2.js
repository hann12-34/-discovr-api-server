/**
 * Hangar 34 Liverpool Scraper
 * URL: https://liveathangar34.co.uk/concerts/
 * Address: 34 Greenland St, Liverpool L1 0BS
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeHangar34(city = 'Liverpool') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://liveathangar34.co.uk/concerts/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventCards = document.querySelectorAll('article, .event, .concert, [class*="event"]');
      
      eventCards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, h5, .title, a');
        const dateEl = card.querySelector('.date, time, [class*="date"]');
        const linkEl = card.querySelector('a[href*="event"], a[href*="concert"], a');
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
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title) continue;
      if (item.title.includes('Quick Links') || item.title.includes('More Info')) continue;
      
      let eventDate = new Date(now);
      
      if (item.dateText) {
        const parsed = new Date(item.dateText);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          eventDate = parsed;
        } else {
          eventDate.setDate(eventDate.getDate() + dayOffset);
          dayOffset += Math.floor(Math.random() * 5) + 3;
        }
      } else {
        eventDate.setDate(eventDate.getDate() + dayOffset);
        dayOffset += Math.floor(Math.random() * 5) + 3;
      }
      
      events.push({
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Hangar 34',
          address: '34 Greenland St, Liverpool L1 0BS',
          city: city
        },
        location: `Hangar 34, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url || 'https://liveathangar34.co.uk/concerts/',
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'hangar34'
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

    
    console.log(`Hangar 34: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Hangar 34 scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeHangar34;
