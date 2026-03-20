/**
 * Sound Nightclub LA Scraper
 * Premier underground dance music venue in Hollywood
 * URL: https://www.soundnightclub.com/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeSoundNightclub(city = 'Los Angeles') {
  console.log('🔊 Scraping Sound Nightclub LA...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.soundnightclub.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Find all event links with date patterns like "Fri12/19" or "Sat01/03"
      const links = document.querySelectorAll('a[href*="dice.fm"]');
      
      links.forEach(link => {
        const text = link.textContent.trim();
        // Match patterns like "Fri12/19 Artist Name" or "Sat01/03"
        const dateMatch = text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d{2})\/(\d{2})/i);
        
        if (dateMatch) {
          const month = dateMatch[2];
          const day = dateMatch[3];
          // Determine year based on month
          let year = currentYear;
          if (parseInt(month) < currentMonth) {
            year = currentYear + 1;
          }
          const date = `${year}-${month}-${day}`;
          
          // Extract artist name - everything after the date
          let title = text.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\d{2}\/\d{2}\s*/i, '').trim();
          // Clean up extra text
          title = title.replace(/\s*(Sold Out|Low Ticket.*|Extended Set)$/i, '').trim();
          title = title.split('\n')[0].trim();
          
          if (title && title.length > 2) {
            const key = title.substring(0, 30) + date;
            if (!seen.has(key)) {
              seen.add(key);
              results.push({
                title: title.substring(0, 100),
                date,
                url: link.href
              });
            }
          }
        }
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Sound Nightclub events`);

    const formattedEvents = events.map(event => {
      console.log(`  ✓ ${event.title} | ${event.date}`);
      return {
        id: uuidv4(),
        title: event.title,
        description: '',
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T22:00:00') : null,
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'Sound Nightclub',
          address: '1642 N Las Palmas Ave, Los Angeles, CA 90028',
          city: 'Los Angeles'
        },
        latitude: 34.1019,
        longitude: -118.3355,
        city: 'Los Angeles',
        category: 'Nightlife',
        source: 'SoundNightclub'
      };
    });

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

    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Sound Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeSoundNightclub;
