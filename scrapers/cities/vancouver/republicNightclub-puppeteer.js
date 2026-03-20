/**
 * Republic Nightclub Puppeteer Scraper
 * Headless browser scraper for JavaScript-rendered events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎉 Scraping Republic Nightclub with Puppeteer...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.republicvancouver.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Try to find and click "Events" link
    await page.evaluate(() => {
      const eventsLink = Array.from(document.querySelectorAll('a')).find(a => 
        a.textContent.toLowerCase().includes('event')
      );
      if (eventsLink) eventsLink.click();
    });
    
    await page.waitForTimeout(2000);
    
    const events = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('article, .event, .eventlist-event, [class*="event"]');
      
      items.forEach(item => {
        const title = item.querySelector('h1, h2, h3, .title, .eventlist-title')?.textContent.trim();
        const dateEl = item.querySelector('time, .date, .eventlist-datetag, [datetime]');
        const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent.trim();
        const url = item.querySelector('a')?.href;
        // Get image
        const img = el.querySelector('img');
        const imageUrl = img ? (img.src || img.getAttribute('data-src') || '') : '';

        if (title && title.length > 2 && dateText) {
          results.push({ title, dateText, url });
        }
      });
      
      return results;
    });
    
    await browser.close();
    
    const formattedEvents = [];
    const seen = new Set();
    
    for (const event of events) {
      let eventDate = null;
      try {
        const parsed = new Date(event.dateText);
        if (!isNaN(parsed.getTime())) {
          eventDate = parsed.toISOString().split('T')[0];
        }
      } catch (e) {}
      
      if (eventDate && !seen.has(event.title + eventDate)) {
        seen.add(event.title + eventDate);
        
        formattedEvents.push({
          id: uuidv4(),
          title: event.title,
          date: eventDate,
          url: event.url,
          venue: {
            name: 'Republic Nightclub',
            address: '958 Granville St, Vancouver, BC V6Z 1L2',
            city: 'Vancouver'
          },
          location: 'Vancouver, BC',
          city: 'Vancouver',
          description: '',
          category: 'Nightlife',
          source: 'Republic Nightclub'
        });
      }
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

    
    console.log(`✅ Republic Nightclub: ${formattedEvents.length} events`);
    return formattedEvents;
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('Error scraping Republic:', error.message);
    return [];
  }
}

module.exports = scrape;
