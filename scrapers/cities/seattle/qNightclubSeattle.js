/**
 * Q Nightclub Seattle Scraper - REAL Puppeteer
 * Capitol Hill EDM nightclub
 * URL: https://www.qnightclub.com
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

async function scrapeQNightclub(city = 'Seattle') {
  console.log('🎧 Scraping Q Nightclub Seattle...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.qnightclub.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const allImages = [];
      document.querySelectorAll("img").forEach(img => {
        const src = img.src || img.getAttribute("data-src");
        if (src && src.includes("http") && !src.includes("logo") && !src.includes("icon")) allImages.push(src);
      });
      let imgIdx = 0;
      const seen = new Set();
      // EXCEPTION: This venue doesn't show years - infer from month
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      document.querySelectorAll('.event-card, article, [class*="event"]').forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        for (const line of lines) {
          if (line.length > 3 && line.length < 100 && 
              !line.match(/^(buy|tickets|more|view|\$|free|on sale|doors|pm|am)/i)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
        
        if (title && dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2];
          // Infer year: if month is before current month, use next year
          const eventMonth = parseInt(months[monthStr]);
          const year = dateMatch[3] || (eventMonth < currentMonth ? currentYear + 1 : currentYear);
          const month = months[monthStr];
          
          if (month) {
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              const imageUrl = allImages.length > 0 ? allImages[imgIdx++ % allImages.length] : null;
              results.push({ title: title.substring(0, 100), date: isoDate, imageUrl });
            }
          }
        }
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Q Nightclub events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T22:00:00') : null,
      url: 'https://www.qnightclub.com/events',
      imageUrl: event.imageUrl || null,
      venue: { name: 'Q Nightclub', address: '1426 2nd Ave, Seattle, WA 98101', city: 'Seattle' },
      latitude: 47.6085,
      longitude: -122.3402,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'QNightclub'
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
    console.error('  ⚠️  Q Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeQNightclub;
