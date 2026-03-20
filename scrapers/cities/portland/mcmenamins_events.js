/**
 * McMenamins Portland Events Scraper
 * Multiple venues across Portland area
 * URL: https://www.mcmenamins.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeMcMenamins(city = 'Portland') {
  console.log('🍺 Scraping McMenamins Portland...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.mcmenamins.com/events?location=portland', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/events/"], .event-item, article, [class*="event"]').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/events/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || !url.includes('/events/')) return;
          seen.add(url);

          let container = el;
          for (let i = 0; i < 5 && container; i++) {
            container = container.parentElement;
          }
          if (!container) container = el;

          const title = el.querySelector('h2, h3, h4, .title, .event-title')?.textContent?.trim() ||
                       linkEl?.textContent?.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          const dateEl = el.querySelector('time, .date, [class*="date"]');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || container?.textContent || '';
          
          const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i) ||
                           dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

          const venueEl = el.querySelector('.venue, .location, [class*="venue"]');
          const venueName = venueEl?.textContent?.trim() || 'McMenamins';

          const img = el.querySelector('img');
          const imageUrl = img?.src && !img.src.includes('data:') ? img.src : null;

          results.push({
            title,
            url,
            dateText: dateMatch ? dateMatch[0] : null,
            venueName,
            imageUrl
          });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const monthMatch = event.dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (monthMatch) {
          const month = months[monthMatch[1].toLowerCase()];
          const day = monthMatch[2].padStart(2, '0');
          let year = monthMatch[3] || now.getFullYear().toString();
          if (!monthMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: event.venueName || 'McMenamins',
          address: '1624 NW Glisan St, Portland, OR 97209',
          city: 'Portland'
        },
        latitude: 45.5267,
        longitude: -122.6892,
        city: 'Portland',
        category: 'Nightlife',
        source: 'McMenamins'
      });
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


    console.log(`  ✅ Found ${formattedEvents.length} McMenamins events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ McMenamins error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMcMenamins;
