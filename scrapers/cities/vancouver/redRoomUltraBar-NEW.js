/**
 * Red Room Ultra Bar Events Scraper (Vancouver)
 * Scrapes upcoming events from Red Room Ultra Bar
 * Vancouver nightclub and live music venue
 * URL: https://www.redroomvancouver.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RedRoomUltraBarEvents = {
  async scrape(city) {
    console.log('🔴 Scraping Red Room Ultra Bar...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      await page.goto('https://www.redroomvancouver.com/events/', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Parse events from page text and links
      const events = await page.evaluate(() => {
        const results = [];
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
        
        // Month mapping
        const months = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
          'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        
        // Get event URLs
        const eventUrls = [];
        document.querySelectorAll('a[href*="/events/"]').forEach(a => {
          const href = a.href;
          if (href && !href.endsWith('/events/') && !eventUrls.includes(href)) {
            eventUrls.push(href);
          }
        });
        
        // Get images
        const images = [];
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || img.getAttribute('data-src');
          if (src && !src.includes('logo') && !src.includes('icon')) {
            images.push(src);
          }
        });
        
        // Find events by looking for date patterns like "SAT DEC. 13TH" or "FRI JAN. 10"
        const datePattern = /^(MON|TUE|WED|THU|FRI|SAT|SUN)\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\.?\s*(\d{1,2})(ST|ND|RD|TH)?$/i;
        
        let urlIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const dateMatch = line.match(datePattern);
          
          if (dateMatch) {
            const monthStr = dateMatch[2].toUpperCase();
            const day = dateMatch[3].padStart(2, '0');
            const month = months[monthStr];
            
            // Determine year (if month has passed, use next year)
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const eventMonth = parseInt(month);
            const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
            
            const isoDate = `${year}-${month}-${day}`;
            
            // Title is the line BEFORE the date
            let title = i > 0 ? lines[i - 1] : null;
            
            // Skip if title looks like navigation
            if (title && (title === 'Upcoming Events' || title.length < 5 || title.includes('Skip'))) {
              title = null;
            }
            
            // Get event URL if available
            const url = eventUrls[urlIndex] || 'https://www.redroomvancouver.com/events/';
            urlIndex++;
            
            // Get image if available
            const imageUrl = images[urlIndex - 1] || null;
            
            if (title && title.length > 5) {
              results.push({
                title: title,
                date: isoDate,
                url: url,
                imageUrl: imageUrl
              });
              console.log('Found event:', title, '-', isoDate);
            }
          }
        }
        
        return results;
      });

      await browser.close();

      console.log(`  ✅ Found ${events.length} Red Room events`);

      if (events.length === 0) {
        console.log('  ⚠️  No events found');
        return [];
      }

      const formattedEvents = events.map(event => ({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Red Room Ultra Bar',
          address: '398 Richards Street, Vancouver, BC V6B 3A7',
          city: 'Vancouver'
        },
        latitude: 49.2825,
        longitude: -123.1128,
        city: 'Vancouver',
        category: 'Nightlife',
        source: 'Red Room Ultra Bar'
      }));

      formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
      
      return filterEvents(formattedEvents);

    } catch (error) {
      if (browser) await browser.close();
      console.error('  ⚠️  Red Room error:', error.message);
      return [];
    }
  }
};

module.exports = RedRoomUltraBarEvents.scrape;
