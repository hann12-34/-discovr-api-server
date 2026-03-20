/**
 * Trinity Nightclub Events Scraper (Seattle)
 * Top 40, Hip-Hop nightclub in Pioneer Square
 * URL: https://www.trinitynightclub.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTrinityNightclub(city = 'Seattle') {
  console.log('🔥 Scraping Trinity Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.trinitynightclub.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04', 
        'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
        'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
      };
      
      // Pattern: "DECEMBER 31ST" or "MARCH 21ST"
      const datePattern = /(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(?:ST|ND|RD|TH)?/i;
      
      const seen = new Set();
      
      // Look for year on page - NO FALLBACK
      const yearMatch = bodyText.match(/\b(202[4-9])\b/);
      if (!yearMatch) return [];
      const year = yearMatch[1];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for event lines containing dates
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1].toUpperCase();
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Extract event name from the line (before the date part)
          let title = line.split('|')[0].trim();
          
          // Clean up title
          title = title.replace(/\s*\|\s*(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER).*/i, '').trim();
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({
              title: title,
              date: isoDate
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Trinity Nightclub events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.trinitynightclub.com',
      imageUrl: null,
      venue: {
        name: 'Trinity Nightclub',
        address: '111 Yesler Way, Seattle, WA 98104',
        city: 'Seattle'
      },
      latitude: 47.6021,
      longitude: -122.3343,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Trinity Nightclub'
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
    console.error('  ⚠️  Trinity Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeTrinityNightclub;
