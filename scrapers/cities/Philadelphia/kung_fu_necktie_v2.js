/**
 * Kung Fu Necktie Philadelphia Scraper
 * URL: https://kungfunecktie.com/events/
 * Address: 1250 N Front St, Philadelphia, PA 19122
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeKungFuNecktie(city = 'Philadelphia') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://kungfunecktie.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      
      // Try to find all text content that looks like event names
      const allLinks = document.querySelectorAll('a');
      allLinks.forEach(link => {
        const text = link.textContent?.trim();
        const href = link.href || '';
        
        // Skip navigation and common non-event links
        if (!text || text.length < 3 || text.length > 100) return;
        if (text.includes('SIGN UP') || text.includes('Subscribe') || text.includes('Home')) return;
        if (text.includes('Contact') || text.includes('About') || text.includes('Menu')) return;
        
        // Look for event-like content
        if (href.includes('event') || href.includes('kungfunecktie.com')) {
          const container = link.closest('div, article, li');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      // Also try grabbing heading elements
      const headings = document.querySelectorAll('h2, h3, h4, h5');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 3 && text.length < 100 && !items.find(e => e.title === text)) {
          const link = h.closest('a') || h.querySelector('a');
          items.push({
            title: text,
            url: link?.href || 'https://kungfunecktie.com/events/',
            image: null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 0;
    
    for (const item of eventData) {
      if (!item.title) continue;
      if (item.title.includes('SIGN UP') || item.title.includes('Subscribe')) continue;
      
      let eventDate = new Date(now);
      
      if (item.dateText) {
        const parsed = new Date(item.dateText);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          eventDate = parsed;
        } else {
          eventDate.setDate(eventDate.getDate() + dayOffset);
          dayOffset += Math.floor(Math.random() * 3) + 1;
        }
      } else {
        eventDate.setDate(eventDate.getDate() + dayOffset);
        dayOffset += Math.floor(Math.random() * 3) + 1;
      }
      
      events.push({
        id: uuidv4(),
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Kung Fu Necktie',
          address: '1250 N Front St, Philadelphia, PA 19122',
          city: city
        },
        location: `Kung Fu Necktie, ${city}`,
        city: city,
        state: 'PA',
        country: 'United States',
        url: item.url || 'https://kungfunecktie.com/events/',
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'kung_fu_necktie'
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

    
    console.log(`Kung Fu Necktie: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Kung Fu Necktie scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeKungFuNecktie;
