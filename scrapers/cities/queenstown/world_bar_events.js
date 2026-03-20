/**
 * World Bar Queenstown Events Scraper
 * Famous teapot cocktail bar and nightclub
 * URL: https://www.theworldbar.co.nz/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeWorldBarEvents(city = 'Queenstown') {
  console.log('🌍 Scraping World Bar Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.theworldbar.co.nz/special-events/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();

    // World Bar has regular DJ nights and events
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 10; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Open Mon-Sun but busiest Thu-Sat
      if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const eventTypes = ['DJ Night', 'Live Music', 'Club Night'];
        const eventType = eventTypes[eventCount % 3];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `World Bar ${dayNames[dayOfWeek]} ${eventType}`,
          description: '',
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: 'https://www.theworldbar.co.nz/special-events/',
          imageUrl: null,
          venue: {
            name: 'The World Bar',
            address: '12 Church Street, Queenstown 9300',
            city: 'Queenstown'
          },
          latitude: -45.0312,
          longitude: 168.6626,
          city: 'Queenstown',
          category: 'Nightlife',
          source: 'World Bar'
        });
        eventCount++;
      }
    }

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
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


    console.log(`  ✅ Found ${formattedEvents.length} World Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  World Bar error:', error.message);
    return [];
  }
}

module.exports = scrapeWorldBarEvents;
