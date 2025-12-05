/**
 * The Wiltern Scraper
 * Art deco theater for concerts in Koreatown
 * URL: https://www.wiltern.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheWiltern(city = 'Los Angeles') {
  console.log('🎤 Scraping The Wiltern...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.wiltern.com/events', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i;
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || currentYear;
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1, 3).toLowerCase()];
          if (!month) continue;
          
          const isoDate = `${year}-${month}-${day}`;
          
          let title = null;
          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            const potentialTitle = lines[j];
            if (potentialTitle && 
                potentialTitle.length > 3 && 
                potentialTitle.length < 100 &&
                !potentialTitle.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
              title = potentialTitle;
              break;
            }
          }
          
          if (title && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({ title, date: isoDate });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Wiltern events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.wiltern.com/events',
      imageUrl: null,
      venue: {
        name: 'The Wiltern',
        address: '3790 Wilshire Blvd, Los Angeles, CA 90010',
        city: 'Los Angeles'
      },
      latitude: 34.0617,
      longitude: -118.3087,
      city: 'Los Angeles',
      category: 'Festival',
      source: 'TheWiltern'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Wiltern error:', error.message);
    return [];
  }
}

module.exports = scrapeTheWiltern;
