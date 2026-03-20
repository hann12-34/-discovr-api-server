/**
 * Tractor Tavern Events Scraper (Seattle)
 * Ballard neighborhood live music venue
 * URL: https://www.tractortavern.com/calendar/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTractorTavern(city = 'Seattle') {
  console.log('🚜 Scraping Tractor Tavern...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.tractortavern.com/calendar/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const allImages = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.includes('http') && !src.includes('logo') && !src.includes('icon')) allImages.push(src);
      });
      let imgIdx = 0;
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Pattern: "Dec 3 @ 08:00 PM"
      const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+@\s+\d{1,2}:\d{2}\s*(AM|PM)/i;
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          
          // Look for year on page - NO FALLBACK
          const yearMatch = bodyText.match(/\b(202[4-9])\b/);
          if (!yearMatch) continue; // Skip if no year found
          const year = yearMatch[1];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Skip navigation/status lines
          if (title && (
            title === 'Calendar' ||
            title === 'Skip to content' ||
            title.includes('SOLD OUT') ||
            title.includes('GET TICKETS') ||
            title.includes('ONLINE SALES') ||
            title.includes('Age Limit') ||
            title.match(/^\$[\d.]+/) ||
            title.length < 5
          )) {
            // Try line before that
            title = i > 1 ? lines[i - 2] : null;
          }
          
          // Clean up title
          if (title) {
            title = title.replace(/^(SOLD OUT!|Tractor Presents:\s*)/i, '').trim();
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

    console.log(`  ✅ Found ${events.length} Tractor Tavern events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.tractortavern.com/calendar/',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Tractor Tavern',
        address: '5213 Ballard Ave NW, Seattle, WA 98107',
        city: 'Seattle'
      },
      latitude: 47.6658,
      longitude: -122.3841,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Tractor Tavern'
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
    console.error('  ⚠️  Tractor Tavern error:', error.message);
    return [];
  }
}

module.exports = scrapeTractorTavern;
