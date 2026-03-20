/**
 * Conor Byrne Pub Events Scraper (Seattle)
 * Ballard neighborhood Irish pub with live music
 * URL: https://www.conorbyrnepub.com/events
 * 
 * NOTE: EXCEPTION - This venue's website does not show years in dates.
 * Normally we require explicit year from page, but this scraper infers
 * year based on month (if month is past current month, use next year).
 * This is an approved exception - do not apply this pattern elsewhere.
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeConorByrnePub(city = 'Seattle') {
  console.log('🍀 Scraping Conor Byrne Pub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.conorbyrnepub.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const seen = new Set();
      
      // Collect all event images from the page
      const allImages = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('placeholder') && src.includes('http')) {
          allImages.push(src);
        }
      });
      
      // Text-based parsing (this website doesn't have structured event cards)
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      let imageIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (days.includes(line)) {
          const dateMatch = lines[i + 1]?.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i);
          
          if (dateMatch) {
            const monthStr = dateMatch[1];
            const day = dateMatch[2].padStart(2, '0');
            const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
            
            // EXCEPTION: Infer year from month
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const eventMonth = parseInt(month);
            const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
            const isoDate = `${year}-${month}-${day}`;
            
            for (let j = i + 2; j < Math.min(i + 6, lines.length); j++) {
              const candidate = lines[j];
              if (candidate.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i) ||
                  candidate === 'TICKETS' || candidate === 'FREE' ||
                  candidate === 'SUGGESTED DONATION' || candidate.length < 5) continue;
              
              if (!seen.has(candidate + isoDate)) {
                seen.add(candidate + isoDate);
                // Try to assign an image (cycle through available images)
                const imageUrl = allImages.length > 0 ? allImages[imageIndex % allImages.length] : null;
                imageIndex++;
                results.push({ title: candidate, date: isoDate, imageUrl });
              }
              break;
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Conor Byrne Pub events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.conorbyrnepub.com/events',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Conor Byrne Pub',
        address: '5140 Ballard Ave NW, Seattle, WA 98107',
        city: 'Seattle'
      },
      latitude: 47.6656,
      longitude: -122.3842,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Conor Byrne Pub'
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
    console.error('  ⚠️  Conor Byrne Pub error:', error.message);
    return [];
  }
}

module.exports = scrapeConorByrnePub;
