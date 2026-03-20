/**
 * Chop Suey Events Scraper (Seattle)
 * Capitol Hill nightclub and live music venue
 * URL: https://chopsuey.com/calendar
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeChopSuey(city = 'Seattle') {
  console.log('🍜 Scraping Chop Suey...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://chopsuey.com/calendar', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Get current month/year from page
      const monthYearMatch = bodyText.match(/(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/i);
      
      const months = {
        'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04',
        'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
        'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
      };
      
      // No fallback - must have real month/year from page
      if (!monthYearMatch) return [];
      let currentMonth = months[monthYearMatch[1].toUpperCase()];
      let currentYear = monthYearMatch[2];
      
      const seen = new Set();
      
      // Look for day numbers followed by event titles
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is a day number (1-31)
        if (/^\d{1,2}$/.test(line)) {
          const day = line.padStart(2, '0');
          const isoDate = `${currentYear}-${currentMonth}-${day}`;
          
          // Look for event title after the day number
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const candidate = lines[j];
            
            // Skip time/door lines
            if (candidate.match(/^(DOORS|SHOW):/i) ||
                candidate.match(/^\d+:\d+\s*(AM|PM)$/i) ||
                candidate === 'SUN' || candidate === 'MON' || candidate === 'TUE' ||
                candidate === 'WED' || candidate === 'THU' || candidate === 'FRI' ||
                candidate === 'SAT' || /^\d{1,2}$/.test(candidate)) {
              continue;
            }
            
            // Found a potential event title
            if (candidate.length > 5 && !seen.has(candidate + isoDate)) {
              seen.add(candidate + isoDate);
              results.push({
                title: candidate,
                date: isoDate
              });
              break;
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Chop Suey events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://chopsuey.com/calendar',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Chop Suey',
        address: '1325 E Madison St, Seattle, WA 98122',
        city: 'Seattle'
      },
      latitude: 47.6152,
      longitude: -122.3132,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Chop Suey'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title.substring(0, 50)} | ${e.date}`));

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
    console.error('  ⚠️  Chop Suey error:', error.message);
    return [];
  }
}

module.exports = scrapeChopSuey;
