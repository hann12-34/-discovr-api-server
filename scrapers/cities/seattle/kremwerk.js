/**
 * Kremwerk Events Scraper (Seattle)
 * Underground electronic music venue & queer nightclub
 * Includes: Kremwerk, Timbre Room, Cherry
 * URL: https://www.kremwerk.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeKremwerk(city = 'Seattle') {
  console.log('🎧 Scraping Kremwerk...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.kremwerk.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Month mapping
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Date pattern: "Dec 4, 2025" or "Dec 4, 2025 – Dec 5, 2025"
      const datePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/i;
      
      const seen = new Set();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          
          if (!month) continue;
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the line BEFORE the date
          let title = i > 0 ? lines[i - 1] : null;
          
          // Skip navigation/filler
          if (title && (
            title === 'UPCOMING EVENTS' ||
            title === 'Get Tickets' ||
            title === 'More Events!' ||
            title.includes('KREMWERK') ||
            title.includes('DANCEFLOORS') ||
            title.includes('HOUSE') && title.includes('TECHNO') ||
            title.length < 3
          )) {
            title = null;
          }
          
          if (title && title.length > 2 && !seen.has(title + isoDate)) {
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

    console.log(`  ✅ Found ${events.length} Kremwerk events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.kremwerk.com/',
      imageUrl: null,
      venue: {
        name: 'Kremwerk',
        address: '1809 Minor Ave, Seattle, WA 98101',
        city: 'Seattle'
      },
      latitude: 47.6171,
      longitude: -122.3331,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Kremwerk'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Kremwerk error:', error.message);
    return [];
  }
}

module.exports = scrapeKremwerk;
