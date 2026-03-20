/**
 * Fortune Sound Club Events Scraper
 * Scrapes upcoming events from Fortune Sound Club
 * Vancouver's premier nightclub and electronic music venue
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const FortuneSoundClubEvents = {
  async scrape(city) {
    console.log('🎵 Scraping Fortune Sound Club with headless browser...');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto('https://www.fortunesoundclub.com/events', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Scroll to load all events
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const events = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        
        // Find all event elements
        const eventElements = document.querySelectorAll('.eventlist-event, article');
        
        eventElements.forEach(el => {
          // Get title
          const titleEl = el.querySelector('.eventlist-title, h1, h2');
          if (!titleEl) return;
          
          const title = titleEl.textContent.trim();
          
          // Get URL
          const linkEl = el.querySelector('a');
          const url = linkEl ? linkEl.href : '';
        // Get image
        const img = el.querySelector('img');
        const imageUrl = img ? (img.src || img.getAttribute('data-src') || '') : '';

          if (!title || title.length < 3 || seen.has(title)) return;
          seen.add(title);
          
          // Get date - look for date elements
          const dateEl = el.querySelector('.eventlist-datetag, time, .event-date');
          let eventDate = null;
          
          if (dateEl) {
            const dateText = dateEl.textContent.trim().replace(/\s+/g, ' ');
            // Parse dates like "Oct 2 to Oct 3" or "Oct 2"
            const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
            
            if (dateMatch) {
              const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
              const monthName = dateMatch[1].toLowerCase().substring(0,3);
              const month = months[monthName];
              const day = dateMatch[2].padStart(2, '0');
              
              // Year assignment: assume current year unless event date is more than 2 months in past
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth() + 1; // 0-based to 1-based
              const eventMonth = parseInt(month);
              
              let year = currentYear;
              
              // Only use next year if event is MORE than 2 months in the past
              const monthDiff = currentMonth - eventMonth;
              if (monthDiff > 2) {
                year = currentYear + 1;
              }
              
              eventDate = `${year}-${month}-${day}`;
            }
          }
          
          // Only push events that have a valid date
          if (eventDate) {
            results.push({
              title: title,
              date: eventDate,
              url: url
            });
          } else {
            console.log(`  ⚠️  Skipping "${title}" - no date found`);
          }
        });
        
        return results;
      });
      
      await browser.close();
      
      // Fetch descriptions from detail pages
      const formattedEvents = [];
      for (const event of events) {
        let description = '';
        if (event.url && event.url.startsWith('http')) {
          try {
            const detailRes = await axios.get(event.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
              timeout: 8000
            });
            const $d = cheerio.load(detailRes.data);
            description = $d('meta[property="og:description"]').attr('content') || '';
            if (!description || description.length < 20) {
              for (const sel of ['.eventitem-column-content p', '.event-description', '.sqs-block-content p', 'article p', '.entry-content p']) {
                const t = $d(sel).first().text().trim();
                if (t && t.length > 30) { description = t; break; }
              }
            }
            if (description) {
              description = description.replace(/\s+/g, ' ').trim();
              if (description.length > 500) description = description.substring(0, 500) + '...';
            }
          } catch (e) { /* skip */ }
        }

        formattedEvents.push({
          id: uuidv4(),
          title: event.title,
          description: description || '',
          date: event.date,
          url: event.url,
          venue: { name: 'Fortune Sound Club', address: '147 East Pender Street, Vancouver, BC V6A 1T6', city: 'Vancouver' },
          city: 'Vancouver',
          category: 'Nightlife',
          source: 'Fortune Sound Club'
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

      
      console.log(`\n✅ Found ${formattedEvents.length} Fortune Sound Club events`);
      return formattedEvents;
      
    } catch (error) {
      if (browser) await browser.close();
      console.error('Error:', error.message);
      return [];
    }
  }
};


module.exports = FortuneSoundClubEvents.scrape;
