/**
 * LIV Miami Events Scraper
 * Vegas-style megaclub at Fontainebleau Miami Beach
 * URL: https://www.livnightclub.com/miami/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeLivMiami(city = 'Miami') {
  console.log('💎 Scraping LIV Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.livnightclub.com/miami/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Look for pattern: "WED", "DEC", "3" followed by event title
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toUpperCase();
        
        // Check for month abbreviation
        if (months[line]) {
          // Look for day number after month
          const dayLine = lines[i + 1];
          if (dayLine && /^\d{1,2}$/.test(dayLine)) {
            const month = months[line];
            const day = dayLine.padStart(2, '0');
            
            // Determine year
            const eventMonth = parseInt(month);
            const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
            
            const isoDate = `${year}-${month}-${day}`;
            
            // Title is typically 2 lines after the day
            let title = lines[i + 2];
            
            // Skip if title looks like navigation
            if (title && (
              title === 'THU' || title === 'FRI' || title === 'SAT' || title === 'SUN' ||
              title === 'MON' || title === 'TUE' || title === 'WED' ||
              /^[A-Z]{3}$/.test(title) ||
              title.length < 5
            )) {
              title = null;
            }
            
            if (title && title.length > 3 && !seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({
                title: title,
                date: isoDate
              });
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} LIV Miami events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.livnightclub.com/miami/events/',
      imageUrl: null,
      venue: {
        name: 'LIV Miami',
        address: '4441 Collins Ave, Miami Beach, FL 33140',
        city: 'Miami'
      },
      latitude: 25.8195,
      longitude: -80.1225,
      city: 'Miami',
      category: 'Nightlife',
      source: 'LIV Miami'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

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
    console.error('  ⚠️  LIV Miami error:', error.message);
    return [];
  }
}

module.exports = scrapeLivMiami;
