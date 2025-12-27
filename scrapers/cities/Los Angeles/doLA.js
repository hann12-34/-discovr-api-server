/**
 * DoLA Events Scraper - REAL Puppeteer
 * LA's definitive events guide
 * URL: https://dola.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeDoLA(city = 'Los Angeles') {
  console.log('🌴 Scraping DoLA Events...');

  let browser;
  const allEvents = [];
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Try multiple event pages
    const urls = [
      'https://dola.com/events',
      'https://dola.com/events/music',
      'https://dola.com/events/nightlife'
    ];

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const events = await page.evaluate(() => {
          const results = [];
          const seen = new Set();
          const currentYear = new Date().getFullYear();
          const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

          const items = document.querySelectorAll('article, .event-card, [class*="event"], .card');
          
          items.forEach(item => {
            const text = item.innerText;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            let title = null;
            for (const line of lines) {
              if (line.length > 5 && line.length < 100 && !line.match(/^(read more|share|free|\$|view)/i)) {
                title = line;
                break;
              }
            }
            
            const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
            
            if (title && dateMatch) {
              const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
              const day = dateMatch[2];
              const year = dateMatch[3] || currentYear;
              const month = months[monthStr];
              
              if (month) {
                const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
                if (!seen.has(title + isoDate)) {
                  seen.add(title + isoDate);
                  results.push({ title: title.substring(0, 100), date: isoDate });
                }
              }
            }
          });
          
          return results;
        });

        allEvents.push(...events);
        console.log(`   ${url.split('/').pop()}: ${events.length} events`);
      } catch (err) {
        console.log(`   ⚠️ ${url}: ${err.message.substring(0, 50)}`);
      }
    }

    await browser.close();

    // Dedupe
    const seen = new Set();
    const uniqueEvents = allEvents.filter(e => {
      const key = e.title + e.date;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`  ✅ Found ${uniqueEvents.length} DoLA events`);

    const formattedEvents = uniqueEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://dola.com/events',
      imageUrl: null,
      venue: { name: 'Various LA Venues', address: 'Los Angeles, CA', city: 'Los Angeles' },
      latitude: 34.0522,
      longitude: -118.2437,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'DoLA'
    }));

    formattedEvents.slice(0, 10).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  DoLA error:', error.message);
    return [];
  }
}

module.exports = scrapeDoLA;
