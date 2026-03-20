/**
 * CODA Nightclub Events Scraper (Toronto)
 * Premier electronic music venue
 * URL: https://codatoronto.com/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');
const { sanitizeDescription } = require('../../utils/sanitizeDescription');

async function scrapeCodaNightclub(city = 'Toronto') {
  console.log('🎧 Scraping CODA Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://codatoronto.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Month mapping
      const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      // Find event cards with images
      document.querySelectorAll('a[href*="ra.co"], a[href*="ticket"], div[class*="event"]').forEach(el => {
        const container = el.closest('div') || el.parentElement?.parentElement;
        if (!container) return;
        
        const img = container.querySelector('img');
        const imgSrc = img?.src || img?.getAttribute('data-src');
        
        // Get text content
        const text = container.textContent?.trim();
        if (!text) return;
        
        // Extract date (format: "December 26, 2025")
        const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/);
        if (!dateMatch) return;
        
        const month = months[dateMatch[1]];
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        const isoDate = `${year}-${month}-${day}`;
        
        // Extract title - usually in uppercase after the date
        const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length > 2);
        let title = null;
        for (const line of lines) {
          if (line.match(/^[A-Z][A-Z\s\-&\.]+$/) && line.length > 3 && line !== 'UPCOMING EVENTS') {
            title = line;
            break;
          }
        }
        
        if (!title) {
          // Try to find title after date
          const dateIdx = text.indexOf(dateMatch[0]);
          if (dateIdx > -1) {
            const afterDate = text.substring(dateIdx + dateMatch[0].length).trim();
            const firstLine = afterDate.split('\n')[0]?.trim();
            if (firstLine && firstLine.length > 3) {
              title = firstLine;
            }
          }
        }
        
        if (title && !seen.has(title + isoDate)) {
          seen.add(title + isoDate);
          results.push({
            title: title,
            date: isoDate,
            imageUrl: imgSrc && !imgSrc.includes('logo') ? imgSrc : null
          });
        }
      });
      
      // Fallback: parse text for events without finding cards
      if (results.length === 0) {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
        const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/;
        
        // Collect all images
        const images = [];
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || img.getAttribute('data-src');
          if (src && !src.includes('logo') && img.width > 100) {
            images.push(src);
          }
        });
        
        let imgIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const dateMatch = line.match(datePattern);
          
          if (dateMatch) {
            const month = months[dateMatch[1]];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            const isoDate = `${year}-${month}-${day}`;
            
            let title = i + 1 < lines.length ? lines[i + 1] : null;
            if (title && (title.match(datePattern) || title === 'UPCOMING EVENTS' || title.length < 3)) {
              title = null;
            }
            
            if (title && !seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({
                title: title,
                date: isoDate,
                imageUrl: images[imgIdx] || null
              });
              imgIdx++;
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} CODA events`);

    const formattedEvents = events.map(event => {
      return {
        id: uuidv4(),
        title: event.title,
        description: '',
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T22:00:00') : null,
        url: 'https://codatoronto.com/events/',
        imageUrl: event.imageUrl,
        venue: {
          name: 'CODA',
          address: '794 Bathurst St, Toronto, ON M5R 3G1',
          city: 'Toronto'
        },
        latitude: 43.6651,
        longitude: -79.4114,
        city: 'Toronto',
        category: 'Nightlife',
        source: 'CODA'
      };
    });

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
    console.error('  ⚠️  CODA error:', error.message);
    return [];
  }
}

module.exports = scrapeCodaNightclub;
