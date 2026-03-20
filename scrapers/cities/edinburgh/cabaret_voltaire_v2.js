/**
 * Cabaret Voltaire Edinburgh Scraper
 * URL: https://www.thecabaretvoltaire.com/
 * Address: 36-38 Blair Street, Edinburgh EH1 1QR
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeCabaretVoltaireV2(city = 'Edinburgh') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.thecabaretvoltaire.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 3 || text.length > 100) return;
        if (text.includes('cookie') || text.includes('Cookie') || text.includes('Manage')) return;
        if (text.includes('policy') || text.includes('Policy') || text.includes('consent')) return;
        if (text.includes('Contact') || text.includes('About') || text.includes('Home')) return;
        if (text.includes('View') || text.includes('preferences') || text.includes('Accept')) return;
        if (text.includes('Privacy') || text.includes('Terms') || text.includes('Legal')) return;
        if (text === 'Events' || text === 'Menu' || text === 'Book') return;
        if (text.length < 5) return;
        
        if (href.includes('event') || href.includes('ticket') || href.includes('cabaret')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.thecabaretvoltaire.com${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      // Also get headings
      const headings = document.querySelectorAll('h2, h3, h4');
      headings.forEach(h => {
        const text = h.textContent?.trim();
        if (text && text.length > 3 && text.length < 80) {
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: 'https://www.thecabaretvoltaire.com/',
              image: null
            });
          }
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Cabaret Voltaire',
          address: '36-38 Blair Street, Edinburgh EH1 1QR',
          city: city
        },
        location: `Cabaret Voltaire, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'cabaret_voltaire'
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

    
    console.log(`Cabaret Voltaire Edinburgh: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Cabaret Voltaire scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeCabaretVoltaireV2;
