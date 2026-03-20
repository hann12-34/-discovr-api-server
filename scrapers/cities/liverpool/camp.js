/**
 * Camp and Furnace Liverpool Events Scraper
 * Multi-purpose venue in Baltic Triangle
 * URL: https://www.campandfurnace.com/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeCampAndFurnace(city = 'Liverpool') {
  console.log('🏕️ Scraping Camp and Furnace Liverpool...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://campandfurnace.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all event links
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url.includes('event-space-hire') || url === 'https://campandfurnace.com/events/') return;
        seen.add(url);
        
        // Find parent container
        let container = link.closest('div, article') || link.parentElement;
        for (let i = 0; i < 5 && container; i++) {
          const textContent = container.textContent || '';
          const dateMatch = textContent.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          
          // Get title from heading or URL
          let title = '';
          const headingEl = container.querySelector('h2, h3, h4, [class*="title"]');
          if (headingEl) {
            title = headingEl.textContent.trim();
          } else {
            const urlParts = url.split('/events/')[1];
            if (urlParts) {
              title = urlParts.replace(/\/$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
          }
          
          if (title && title.length > 3 && title.length < 150 && !title.includes('Buy Tickets') && !title.includes('Venue Hire')) {
            const imgEl = container.querySelector('img');
            const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
            
            results.push({
              title,
              dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || ''}`.trim() : '',
              url,
              imageUrl
            });
            break;
          }
          container = container.parentElement;
        }
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
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.\s]*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Event at Camp and Furnace`,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Camp and Furnace',
          address: '67 Greenland Street, Liverpool L1 0BY',
          city: 'Liverpool'
        },
        latitude: 53.3965,
        longitude: -2.9856,
        city: 'Liverpool',
        category: 'Nightlife',
        source: 'Camp and Furnace'
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


    console.log(`  ✅ Found ${formattedEvents.length} valid Camp and Furnace events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Camp and Furnace error:', error.message);
    return [];
  }
}

module.exports = scrapeCampAndFurnace;
