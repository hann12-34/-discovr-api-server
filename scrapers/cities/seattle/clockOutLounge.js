/**
 * Clock-Out Lounge Events Scraper (Seattle)
 * Beacon Hill bar, venue & pizzeria
 * URL: https://clockoutlounge.com/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeClockOutLounge(city = 'Seattle') {
  console.log('⏰ Scraping Clock-Out Lounge...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://clockoutlounge.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const allImages = [];
      document.querySelectorAll("img").forEach(img => {
        const src = img.src || img.getAttribute("data-src");
        if (src && src.includes("http") && !src.includes("logo") && !src.includes("icon")) allImages.push(src);
      });
      let imgIdx = 0;
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Pattern: "Wed Dec, 3 2025" or similar
      const datePattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+(\d{1,2})\s+(\d{4})$/i;
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[2];
          const day = dateMatch[3].padStart(2, '0');
          const year = dateMatch[4];
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Clean up title - remove "CLOCK-OUT LOUNGE PRESENTS:" prefix
          if (title) {
            title = title.replace(/^CLOCK-OUT LOUNGE PRESENTS:\s*/i, '').trim();
          }
          
          // Skip navigation and closure notices
          if (title && (
            title === 'BUY TICKETS' ||
            title === 'FREE' ||
            title.match(/^\$[\d.]+$/) ||
            title.includes('Doors:') ||
            title.length < 5 ||
            title.match(/closed|we are closed|we will be closed/i)
          )) {
            title = null;
          }
          
          if (title && title.length > 5 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            const imageUrl = allImages.length > 0 ? allImages[imgIdx++ % allImages.length] : null;
            results.push({
              title: title,
              date: isoDate,
              imageUrl: imageUrl
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Clock-Out Lounge events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://clockoutlounge.com/events/',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Clock-Out Lounge',
        address: '4864 Beacon Ave S, Seattle, WA 98108',
        city: 'Seattle'
      },
      latitude: 47.5632,
      longitude: -122.3101,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Clock-Out Lounge'
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
    console.error('  ⚠️  Clock-Out Lounge error:', error.message);
    return [];
  }
}

module.exports = scrapeClockOutLounge;
