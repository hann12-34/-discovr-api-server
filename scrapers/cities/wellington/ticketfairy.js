/**
 * TicketFairy Wellington Events Scraper
 * Event ticketing platform
 * URL: https://www.ticketfairy.com/events-in-wellington
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTicketFairy(city = 'Wellington') {
  console.log('🎫 Scraping TicketFairy Wellington...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.ticketfairy.com/events-in-wellington', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(link => {
        if (seen.has(link.href)) return;
        seen.add(link.href);
        
        let container = link.closest('div, article, li');
        for (let i = 0; i < 5 && container; i++) {
          const text = container.textContent || '';
          if (text.length > 30 && text.length < 400) break;
          container = container.parentElement;
        }
        
        if (!container) return;
        
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        const img = container.querySelector('img');
        
        const titleMatch = text.match(/^([^0-9]+?)(?:\d{1,2}\s+\w+\s+\d{4}|\d{4})/);
        let title = titleMatch ? titleMatch[1].trim() : text.split(/\d{1,2}\s+\w+/)[0]?.trim();
        
        const dateMatch = text.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        
        const addressMatch = text.match(/(?:PM|AM)\s+(.+?)(?:Price|From|\$|$)/i);
        const address = addressMatch ? addressMatch[1].trim() : null;
        
        if (title && title.length > 3 && title.length < 100) {
          results.push({
            title: title,
            url: link.href,
            dateText: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}` : null,
            address: address,
            imageUrl: img?.src
          });
        }
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
        const dateMatch = event.dateText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase()];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const address = event.address || 'Wellington, New Zealand';

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: address.split(',')[0] || 'Wellington Venue',
          address: address,
          city: 'Wellington'
        },
        city: 'Wellington',
        category: 'Nightlife',
        source: 'TicketFairy'
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


    console.log(`  ✅ Found ${formattedEvents.length} TicketFairy events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  TicketFairy error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeTicketFairy;
