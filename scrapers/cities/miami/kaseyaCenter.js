/**
 * Kaseya Center Events Scraper (Miami)
 * Miami's major arena - concerts, sports, shows
 * URL: https://www.kaseyacenter.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeKaseyaCenter(city = 'Miami') {
  console.log('🏟️  Scraping Kaseya Center Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.kaseyacenter.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Scroll to load more events
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Pattern: "FRI. DEC 5, 2025" or "DEC 3 - 5, 2025"
      const datePattern = /^(?:MON|TUE|WED|THU|FRI|SAT|SUN)\.\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}),\s+(\d{4})$/i;
      const rangePattern = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s*-\s*\d{1,2},\s+(\d{4})$/i;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let dateMatch = line.match(datePattern);
        let rangeMatch = line.match(rangePattern);
        
        if (dateMatch || rangeMatch) {
          const match = dateMatch || rangeMatch;
          const monthStr = match[1].toUpperCase();
          const day = match[2].padStart(2, '0');
          const year = match[3];
          const month = months[monthStr];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line AFTER the date
          let title = lines[i + 1];
          
          // Skip navigation items
          if (title && (
            title === 'BUY TICKETS' ||
            title === 'MORE INFO' ||
            title === 'Kaseya Center/Miami HEAT' ||
            title.length < 3
          )) {
            title = null;
          }
          
          // Skip tours of the arena
          if (title && title.includes('ALL-ACCESS TOUR')) {
            continue;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({
              title: title,
              date: isoDate
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Kaseya Center events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.kaseyacenter.com/events',
      imageUrl: null,
      venue: {
        name: 'Kaseya Center',
        address: '601 Biscayne Blvd, Miami, FL 33132',
        city: 'Miami'
      },
      latitude: 25.7814,
      longitude: -80.1870,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Kaseya Center'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Kaseya Center error:', error.message);
    return [];
  }
}

module.exports = scrapeKaseyaCenter;
