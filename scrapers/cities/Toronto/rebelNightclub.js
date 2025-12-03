/**
 * Rebel Nightclub Events Scraper (Toronto)
 * Major Toronto nightclub venue
 * URL: https://rebeltoronto.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeRebelNightclub(city = 'Toronto') {
  console.log('🎪 Scraping Rebel Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://rebeltoronto.com/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Month mapping
      const months = {
        'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04',
        'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
        'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
      };
      
      // Get ticket links
      const ticketLinks = [];
      document.querySelectorAll('a[href*="ticket"]').forEach(a => {
        if (a.href && !ticketLinks.includes(a.href)) {
          ticketLinks.push(a.href);
        }
      });
      
      // Get images
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && !src.includes('logo') && !src.includes('.svg') && img.width > 100) {
          images.push(src);
        }
      });
      
      // Date pattern: "FRIDAY, DECEMBER 5" or "SATURDAY, DECEMBER 13"
      const datePattern = /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})$/i;
      
      let linkIndex = 0;
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[2].toUpperCase();
          const day = dateMatch[3].padStart(2, '0');
          const month = months[monthStr];
          
          // Determine year
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          const eventMonth = parseInt(month);
          const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Skip navigation/buttons
          if (title && (
            title === 'UPCOMING EVENTS' || 
            title === 'BUY TICKETS' || 
            title === 'VIP RESERVATION' ||
            title.length < 3
          )) {
            title = null;
          }
          
          // Get ticket URL
          const url = ticketLinks[linkIndex] || 'https://rebeltoronto.com/events/';
          linkIndex++;
          
          // Get image
          const imageUrl = images[Math.floor(linkIndex / 2)] || null;
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({
              title: title,
              date: isoDate,
              url: url,
              imageUrl: imageUrl
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Rebel events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: event.url,
      imageUrl: event.imageUrl,
      venue: {
        name: 'Rebel Nightclub',
        address: '11 Polson St, Toronto, ON M5A 1A4',
        city: 'Toronto'
      },
      latitude: 43.6391,
      longitude: -79.3595,
      city: 'Toronto',
      category: 'Nightlife',
      source: 'Rebel Nightclub'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Rebel error:', error.message);
    return [];
  }
}

module.exports = scrapeRebelNightclub;
