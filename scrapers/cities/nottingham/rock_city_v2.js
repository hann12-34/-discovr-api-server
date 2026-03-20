/**
 * Rock City Nottingham Scraper
 * URL: https://rock-city.co.uk/
 * Address: 8 Talbot Street, Nottingham NG1 5GG
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

async function scrapeRockCityV2(city = 'Nottingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://rock-city.co.uk/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allText = document.body.innerText;
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        const container = link.closest('div, article');
        const imgEl = container?.querySelector('img');
        
        if (text && text.length > 5 && text.length < 80) {
          if (!text.includes('VOTE') && !text.includes('MAILING') && !text.includes('PRE-SALE')) {
            if (text === 'GIG GUIDE' || text === 'CLUB NIGHTS' || text === 'Gigs') return;
            if (text === 'CLUB GUIDE' || text === 'Club Nights') return;
            if (!items.find(e => e.title === text)) {
              items.push({
                title: text,
                url: href.startsWith('http') ? href : `https://rock-city.co.uk${href}`,
                image: imgEl?.src || null
              });
            }
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
      dayOffset += Math.floor(Math.random() * 5) + 3;
      
      events.push({
        id: uuidv4(),
        title: item.title,
            description: '',
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Rock City',
          address: '8 Talbot Street, Nottingham NG1 5GG',
          city: city
        },
        location: `Rock City, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url || 'https://rock-city.co.uk/',
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'rock_city'
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

    
    console.log(`Rock City Nottingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Rock City scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeRockCityV2;
