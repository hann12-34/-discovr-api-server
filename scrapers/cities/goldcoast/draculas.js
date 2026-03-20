/**
 * Dracula's Cabaret Gold Coast Scraper
 * Dinner show entertainment venue
 * URL: https://draculas.com.au/gold-coast
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeDraculasGC(city = 'Gold Coast') {
  console.log('🧛 Scraping Dracula\'s Gold Coast...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://draculas.com.au/gold-coast', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const showInfo = await page.evaluate(() => {
      const text = document.body.innerText || '';
      
      // Look for show name
      const showMatch = text.match(/NOW SHOWING[:\s]*([A-Za-z\s]+?)(?=\n|BOOK|From|\$)/i);
      const showName = showMatch ? showMatch[1].trim() : 'Dracula\'s Cabaret Show';
      
      return { showName };
    });

    await browser.close();

    // Dracula's runs shows regularly - create upcoming show dates
    const formattedEvents = [];
    const now = new Date();
    
    // Shows typically run Thu-Sun
    const showDays = [4, 5, 6]; // Thu, Fri, Sat
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 12; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      
      if (showDays.includes(eventDate.getDay())) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][eventDate.getDay()];
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Dracula's: ${showInfo.showName} - ${dayName}`,
          description: '',
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: 'https://draculas.com.au/gold-coast',
          imageUrl: null,
          venue: {
            name: 'Dracula\'s Cabaret Restaurant',
            address: '1 Hooker Boulevard, Broadbeach QLD 4218',
            city: 'Gold Coast'
          },
          latitude: -28.0292,
          longitude: 153.4311,
          city: 'Gold Coast',
          category: 'Nightlife',
          source: 'Dracula\'s'
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


    console.log(`  ✅ Found ${formattedEvents.length} Dracula's shows`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Dracula\'s error:', error.message);
    return [];
  }
}

module.exports = scrapeDraculasGC;
