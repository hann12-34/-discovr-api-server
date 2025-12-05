/**
 * Exchange LA Nightclub Scraper
 * Historic downtown LA venue
 * URL: https://exchangela.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeExchangeLA(city = 'Los Angeles') {
  console.log('🎵 Scraping Exchange LA...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://exchangela.com/events/', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'June': '06', 'July': '07', 'August': '08', 'September': '09',
        'October': '10', 'November': '11', 'December': '12'
      };
      
      const datePattern = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i;
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || currentYear;
          const monthKey = Object.keys(months).find(k => 
            monthStr.toLowerCase() === k.toLowerCase() || 
            monthStr.toLowerCase().startsWith(k.toLowerCase())
          );
          const month = months[monthKey] || '01';
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is usually before the date
          let title = i > 0 ? lines[i - 1] : null;
          
          if (title && (title.length < 3 || title.includes('Buy') || title.includes('Tickets'))) {
            title = i > 1 ? lines[i - 2] : null;
          }
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({ title, date: isoDate });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Exchange LA events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://exchangela.com/events/',
      imageUrl: null,
      venue: {
        name: 'Exchange LA',
        address: '618 S Spring St, Los Angeles, CA 90014',
        city: 'Los Angeles'
      },
      latitude: 34.0453,
      longitude: -118.2522,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'ExchangeLA'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Exchange LA error:', error.message);
    return [];
  }
}

module.exports = scrapeExchangeLA;
