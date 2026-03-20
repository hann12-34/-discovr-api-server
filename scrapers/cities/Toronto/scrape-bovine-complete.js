/**
 * Bovine Sex Club Scraper (COMPLETE - ALL EVENTS)
 * SAFE & LEGAL: Official venue website
 * Extracts events from each pagination page
 * URL: https://www.bovinesexclub.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🐮 Scraping ALL Bovine Sex Club events...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.bovinesexclub.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('  ⏳ Waiting for calendar to load...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const allEvents = [];
    const seenKeys = new Set();
    let pageNum = 1;
    const maxPages = 20; // Safety limit (~20 events/page × 20 pages = 400 possible events)
    
    // Extract events from current page and all subsequent pages
    while (pageNum <= maxPages) {
      console.log(`  📄 Extracting page ${pageNum}...`);
      
      // Extract events from current page
      const pageEvents = await page.evaluate(() => {
        const events = [];
        
        // METHOD 1: Schema.org JSON-LD (most reliable)
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'Event' && data.name) {
              events.push({
                title: data.name,
            description: '',
                dateText: data.startDate || '',
                url: data.url || '',
                imageUrl: data.image || ''
              });
            }
          } catch (e) {}
        });
        
        // METHOD 2: DOM selectors (backup)
        if (events.length === 0) {
          const items = document.querySelectorAll('.eapp-events-calendar-grid-item');
          items.forEach(item => {
            const titleEl = item.querySelector('[aria-label]');
            let title = titleEl ? titleEl.getAttribute('aria-label') : '';
            if (title.startsWith('Event: ')) title = title.substring(7);
            
            const dateEl = item.querySelector('time[datetime], [datetime]');
            const dateText = dateEl ? dateEl.getAttribute('datetime') : '';
            
            const link = item.querySelector('a');
            const url = link ? link.href : '';
            
            // Extract image
            const img = item.querySelector('img');
            const imageUrl = img ? (img.src || img.getAttribute('data-src') || '') : '';
            
            if (title) {
              events.push({ title, dateText, url, imageUrl });
            }
          });
        }
        
        return events;
      });
      
      // Add events from this page
      let newEventsCount = 0;
      for (const event of pageEvents) {
        const key = `${event.title}|${event.dateText}`;
        if (!seenKeys.has(key) && event.title && event.title.length > 2) {
          seenKeys.add(key);
          allEvents.push(event);
          newEventsCount++;
        }
      }
      
      console.log(`    Found ${pageEvents.length} events (${newEventsCount} new)`);
      
      // If we got no events from this page, we're done
      if (pageEvents.length === 0) {
        console.log(`    No events on this page, stopping.`);
        break;
      }
      
      // Try to click "Next Events" to go to next page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const nextBtn = buttons.find(b => b.textContent.trim() === 'Next Events');
        if (nextBtn) {
          nextBtn.click();
          return true;
        }
        return false;
      });
      
      if (!clicked) {
        console.log(`    "Next Events" button not found, stopping.`);
        break;
      }
      
      // Wait for next page to load
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      pageNum++;
    }
    
    await browser.close();
    
    console.log(`\n  ✅ Extracted ${allEvents.length} total unique events from ${pageNum} pages`);
    
    // Process events
    const processedEvents = [];
    
    for (const event of allEvents) {
      // Skip junk titles
      const titleLower = event.title.toLowerCase();
      if (titleLower === 'events' || titleLower === 'upcoming' ||
          titleLower === 'event' || titleLower === 'untitled') {
        continue;
      }
      
      // Parse date
      let eventDate = null;
      if (event.dateText) {
        try {
          const parsed = new Date(event.dateText);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
            eventDate = parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      processedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: eventDate,
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: {
          name: 'Bovine Sex Club',
          address: '542 Queen St W, Toronto, ON M5V 2B5',
          city: 'Toronto'
        },
        city: city,
        category: 'Concert',
        source: 'Bovine Sex Club'
      });
    }

      // Fetch descriptions from event detail pages
      for (const event of events) {
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

    
    console.log(`✅ Bovine Sex Club: ${processedEvents.length} events`);
    return filterEvents(processedEvents);
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Bovine Sex Club error:', error.message);
    return [];
  }
}

module.exports = scrape;
