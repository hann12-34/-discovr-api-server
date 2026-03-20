const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const OrpheumTheatreEvents = {
  async scrape(city) {
    console.log('🎭 Scraping Orpheum Theatre with headless browser...');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Navigate to main events page
      await page.goto('https://vancouvercivictheatres.com/events/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      // Wait for initial events to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Select Orpheum from venue dropdown to filter events
      try {
        await page.select('#event-venue', 'Orpheum');
        console.log('✓ Filtered for Orpheum venue');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.log('⚠️  Could not filter by venue, showing all events');
      }
      
      // Click "Load More" button repeatedly to load all events
      let clickCount = 0;
      const maxClicks = 30; // Increased to handle 100+ events
      
      for (let i = 0; i < maxClicks; i++) {
        try {
          // Scroll to bottom first
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Look for Load More button with specific class
          const loadMoreExists = await page.evaluate(() => {
            const button = document.querySelector('button.button--more');
            return button && button.offsetParent !== null; // Check if visible
          });
          
          if (loadMoreExists) {
            await page.click('button.button--more');
            clickCount++;
            console.log(`✓ Clicked Load More (${clickCount})`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for new events to load
          } else {
            console.log(`✓ No more Load More button (loaded all events after ${clickCount} clicks)`);
            break;
          }
        } catch (e) {
          console.log(`✓ Finished loading events (${clickCount} clicks)`);
          break;
        }
      }
      
      // Final wait for all events to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract events from the rendered page
      const events = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        
        // Look for event cards/items
        const eventElements = document.querySelectorAll('.featured__item');
        
        eventElements.forEach(el => {
          // Get title from .featured__title (h5)
          const titleEl = el.querySelector('.featured__title');
          if (!titleEl) return;
          
          const title = titleEl.textContent.trim();
          
          // Get venue to confirm it's Orpheum
          const venueEl = el.querySelector('.featured__venue');
          const venue = venueEl ? venueEl.textContent.trim() : '';
          
          // Skip if not at Orpheum (safety check)
          if (venue && !venue.toUpperCase().includes('ORPHEUM')) return;
          
          // Get URL from the Details link
          const linkEl = el.querySelector('a.featured__button--details');
          const url = linkEl ? linkEl.href : '';
          
          // Get REAL POSTER IMAGE
          const img = el.querySelector('img:not([src*="logo"]):not([alt*="logo"])');
          let imageUrl = null;
          if (img) {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
              imageUrl = src;
            }
          }

          if (!title || title.length < 3 || seen.has(url)) return;
          seen.add(url);
          
          // Get date from .featured__date (e.g., "JUN 2-25", "AUG 1-21", "NOV 2", "OCT 3-4")
          const dateEl = el.querySelector('.featured__date');
          let eventDate = null;
          
          if (dateEl) {
            const dateText = dateEl.textContent.trim();
            const dateMatch = dateText.match(/([A-Z]{3})\s+(\d{1,2})(?:-(\d{1,2}))?/);
            
            if (dateMatch) {
              const months = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
              const month = months[dateMatch[1]];
              const day = dateMatch[2].padStart(2, '0');
              const year = new Date().getFullYear();
              
              if (month) {
                eventDate = `${year}-${month}-${day}`;
              }
            }
          }
          
          results.push({
            title: title,
            date: eventDate,
            url: url,
            imageUrl: imageUrl  // Include real poster image!
          });
        });
        
        return results;
      });
      
      await browser.close();
      
      // Format events and fetch descriptions from detail pages
      const formattedEvents = [];
      for (const event of events) {
        let description = '';
        if (event.url && event.url.startsWith('http')) {
          try {
            const _r = await axios.get(event.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
              timeout: 8000
            });
            const _$ = cheerio.load(_r.data);
            description = _$('meta[property="og:description"]').attr('content') || '';
            if (!description || description.length < 20) {
              description = _$('meta[name="description"]').attr('content') || '';
            }
            if (!description || description.length < 20) {
              for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p']) {
                const _t = _$(_s).first().text().trim();
                if (_t && _t.length > 30) { description = _t; break; }
              }
            }
            if (description) {
              description = description.replace(/\s+/g, ' ').trim();
              if (description.length > 500) description = description.substring(0, 500) + '...';
            }
          } catch (_e) { /* skip */ }
        }

        formattedEvents.push({
          id: uuidv4(),
          title: event.title,
          description: description || '',
          date: event.date,
          url: event.url,
          imageUrl: event.imageUrl || null,
          venue: { name: 'Orpheum Theatre', address: '601 Smithe Street, Vancouver, BC V6B 5G1', city: 'Vancouver' },
          city: 'Vancouver',
          category: 'Theatre',
          source: 'Orpheum Theatre'
        });
        console.log(`✓ ${event.title} | ${event.date || 'NO DATE'}`);
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

      
      console.log(`\n✅ Found ${formattedEvents.length} Orpheum Theatre events`);
      return formattedEvents;
      
    } catch (error) {
      if (browser) await browser.close();
      console.error('Error:', error.message);
      return [];
    }
  }
};

module.exports = OrpheumTheatreEvents.scrape;
