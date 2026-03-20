/**
 * Suncorp Stadium Brisbane Events Scraper
 * Major sports and concert venue
 * URL: https://www.suncorpstadium.com.au/what-s-on.aspx
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeSuncorpStadium(city = 'Brisbane') {
  console.log('🏟️ Scraping Suncorp Stadium Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.suncorpstadium.com.au/what-s-on.aspx', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="event"], .event, article, [class*="event"]').forEach(el => {
        const link = el.tagName === 'A' ? el : el.querySelector('a');
        if (!link || !link.href.includes('suncorp')) return;
        if (seen.has(link.href)) return;
        seen.add(link.href);
        
        const container = el.closest('div, article, li') || el;
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        const img = container.querySelector('img');
        
        const titleEl = container.querySelector('h2, h3, h4, .title, [class*="title"]');
        let title = titleEl?.textContent?.trim();
        if (!title) {
          title = text.split(/\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)[0]?.trim();
        }
        
        const dateMatch = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
        
        if (title && title.length > 3 && title.length < 100 && !/Filter|Sort|View|Select/i.test(title)) {
          results.push({
            title: title.replace(/TBC|Soccer|Concert|Rugby/gi, '').trim(),
            url: link.href,
            dateText: dateMatch ? dateMatch[0] : null,
            imageUrl: img?.src
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const dateMatch = event.dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          
          let year = currentYear;
          const eventDate = new Date(`${year}-${month}-${day}`);
          if (eventDate < now) {
            year = currentYear + 1;
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Suncorp Stadium',
          address: '40 Castlemaine St, Milton QLD 4064',
          city: 'Brisbane'
        },
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'Suncorp Stadium'
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


    console.log(`  ✅ Found ${formattedEvents.length} Suncorp Stadium events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Suncorp Stadium error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSuncorpStadium;
