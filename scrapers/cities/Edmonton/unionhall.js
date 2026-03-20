/**
 * Union Hall Edmonton Events Scraper
 * Major nightclub venue - Tribe Events calendar
 * URL: https://unionhall.ca/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeUnionHall(city = 'Edmonton') {
  console.log('🎧 Scraping Union Hall Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://unionhall.ca/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for day cells with events
      document.querySelectorAll('[id*="tribe-events-calendar-day-"]').forEach(dayCell => {
        // Extract date from ID (e.g., tribe-events-calendar-day-2025-12-05)
        const idMatch = dayCell.id.match(/(\d{4}-\d{2}-\d{2})/);
        const dateStr = idMatch ? idMatch[1] : null;
        if (!dateStr) return;
        
        // Find event links within this day cell
        dayCell.querySelectorAll('a[href*="/event/"]').forEach(link => {
          const href = link.href;
          if (seen.has(href) || href.includes('?ical') || href.includes('ticketweb')) return;
          seen.add(href);
          
          let title = link.textContent.trim().replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 200) return;
          
          // Find image
          let imageUrl = null;
          let parent = link.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const img = parent.querySelector('img:not([src*="logo"])');
            if (img && img.src) {
              imageUrl = img.src;
              break;
            }
            parent = parent.parentElement;
          }
          
          results.push({ title, url: href, dateStr, imageUrl });
        });
      });
      
      // Also try direct event links if calendar structure not found
      if (results.length === 0) {
        document.querySelectorAll('a[href*="/event/"]').forEach(link => {
          const href = link.href;
          if (seen.has(href) || href.includes('?ical') || href.includes('ticketweb')) return;
          seen.add(href);
          
          let title = link.textContent.trim().replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 200) return;
          
          // Try to find date from nearby time element
          let parent = link.parentElement;
          let dateStr = null;
          for (let i = 0; i < 8 && parent; i++) {
            const timeEl = parent.querySelector('time[datetime]');
            if (timeEl) {
              dateStr = timeEl.getAttribute('datetime');
              break;
            }
            const idMatch = parent.id?.match(/(\d{4}-\d{2}-\d{2})/);
            if (idMatch) {
              dateStr = idMatch[1];
              break;
            }
            parent = parent.parentElement;
          }
          
          results.push({ title, url: href, dateStr, imageUrl: null });
        });
      }
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const isoMatch = event.dateStr.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        }
      }
      
      // If no date, try to extract from URL slug
      if (!isoDate && event.url) {
        const urlMatch = event.url.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (urlMatch) {
          isoDate = `${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`;
        }
      }
      
      // Skip if no date or past event
      if (!isoDate) continue;
      if (new Date(isoDate) < today) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Union Hall',
          address: '10139 82 Avenue NW, Edmonton, AB T6E 1Z5',
          city: 'Edmonton'
        },
        latitude: 53.5185,
        longitude: -113.4912,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Union Hall'
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


    console.log(`  ✅ Found ${formattedEvents.length} Union Hall events`);
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Union Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeUnionHall;
