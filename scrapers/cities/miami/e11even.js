/**
 * E11EVEN Events Scraper (Miami)
 * World's only 24/7 Ultraclub - open 24 hours, all week
 * URL: https://11miami.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeE11even(city = 'Miami') {
  console.log('🔥 Scraping E11EVEN Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://11miami.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04', 
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      // Pattern: "December 3, 2025" or "December 4, 2025"
      const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/i;
      
      const seen = new Set();
      
      // Get all event cards/blocks with images
      const eventBlocks = document.querySelectorAll('.event, .event-card, article, [class*="event"]');
      const imageMap = {};
      
      eventBlocks.forEach(block => {
        const img = block.querySelector('img:not([src*="logo"]):not([alt*="logo"])');
        const titleEl = block.querySelector('h1, h2, h3, .title, .event-title');
        if (img && titleEl) {
          const src = img.src || img.getAttribute('data-src') || '';
          if (src && !src.includes('logo') && !src.includes('icon')) {
            imageMap[titleEl.textContent.trim()] = src;
          }
        }
      });
      
      // Try Open Graph image as fallback
      const ogImage = document.querySelector('meta[property="og:image"]')?.content || '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Skip navigation items
          if (title && (
            title === 'Buy Tickets' ||
            title === 'Reserve Table' ||
            title === 'EVENTS' ||
            title.includes('Reserve Table') ||
            title.length < 5
          )) {
            title = i > 1 ? lines[i - 2] : null;
          }
          
          // Double check for Reserve Table
          if (title && title.includes('Reserve Table')) {
            continue;
          }
          
          // Clean up title (remove "E11EVEN MIAMI" prefix if present)
          if (title) {
            title = title.replace(/^E11EVEN MIAMI\s*/i, '').trim();
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            
            // Try to find image for this event
            const eventImage = imageMap[title] || ogImage || '';
            
            results.push({
              title: title,
              date: isoDate,
              imageUrl: eventImage
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} E11EVEN events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://11miami.com/events/',
      imageUrl: event.imageUrl || null,  // Use scraped image
      venue: {
        name: 'E11EVEN Miami',
        address: '29 NE 11th St, Miami, FL 33132',
        city: 'Miami'
      },
      latitude: 25.7891,
      longitude: -80.1914,
      city: 'Miami',
      category: 'Nightlife',
      source: 'E11EVEN'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  E11EVEN error:', error.message);
    return [];
  }
}

module.exports = scrapeE11even;
