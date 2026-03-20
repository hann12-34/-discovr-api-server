/**
 * Jubilee Auditorium Edmonton Events Scraper
 * URL: https://jubileeauditorium.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeJubilee(city = 'Edmonton') {
  console.log('🎵 Scraping Jubilee Auditorium Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://jubileeauditorium.com/northern-alberta-jubilee-auditorium/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Jubilee uses event cards/list items
      document.querySelectorAll('.event-card, .event-item, .show-item, article, [class*="event"], .card, a[href*="event"]').forEach(item => {
        try {
          const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || url.endsWith('/events/')) return;
          seen.add(url);
          
          const titleEl = item.querySelector('h1, h2, h3, h4, .title, .event-title, [class*="title"]');
          const title = titleEl?.textContent?.trim() || linkEl?.textContent?.trim()?.substring(0, 100);
          if (!title || title.length < 3) return;
          
          const dateEl = item.querySelector('time, .date, [class*="date"], .event-date');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || item.textContent || '';
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          
          const imgEl = item.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          results.push({ 
            title, 
            dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || new Date().getFullYear().toString()}` : null, 
            url, 
            imageUrl 
          });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Jubilee Auditorium',
          address: '11455 87 Avenue NW, Edmonton, AB T6G 2T2',
          city: 'Edmonton'
        },
        latitude: 53.5171,
        longitude: -113.5213,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Jubilee Auditorium'
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


    console.log(`  ✅ Found ${formattedEvents.length} Jubilee Auditorium events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Jubilee Auditorium error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeJubilee;
