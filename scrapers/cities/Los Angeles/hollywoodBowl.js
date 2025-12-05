/**
 * Hollywood Bowl Scraper
 * Iconic outdoor amphitheater for concerts and festivals
 * URL: https://www.hollywoodbowl.com/events/performances
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeHollywoodBowl(city = 'Los Angeles') {
  console.log('🎭 Scraping Hollywood Bowl...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.hollywoodbowl.com/events/performances', {
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
      
      // Pattern: "Sat, Dec 14" or "Dec 14, 2024"
      const datePatterns = [
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i,
        /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i
      ];
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const pattern of datePatterns) {
          const dateMatch = line.match(pattern);
          if (dateMatch) {
            let monthStr, day, year;
            
            if (pattern.source.includes('Mon|Tue')) {
              monthStr = dateMatch[2];
              day = dateMatch[3];
              year = currentYear;
            } else {
              monthStr = dateMatch[1];
              day = dateMatch[2];
              year = dateMatch[3] || currentYear;
            }
            
            const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1, 3).toLowerCase()];
            if (!month) continue;
            
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            
            // Look for title in surrounding lines
            let title = null;
            const junkPatterns = ['TOGGLE', 'MENU', 'SUBSCRIBE', 'EXCLUSIVE', 'CLICK', 'LOGIN', 'SIGN UP', 'NEWSLETTER', 'COOKIE', 'PRIVACY'];
            for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
              const potentialTitle = lines[j];
              const upperTitle = potentialTitle?.toUpperCase() || '';
              const isJunk = junkPatterns.some(p => upperTitle.includes(p));
              if (potentialTitle && 
                  potentialTitle.length > 5 && 
                  potentialTitle.length < 120 &&
                  !potentialTitle.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i) &&
                  !potentialTitle.match(/^\d/) &&
                  !potentialTitle.includes('Buy Tickets') &&
                  !isJunk) {
                title = potentialTitle;
                break;
              }
            }
            
            if (title && !seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({ title, date: isoDate });
            }
            break;
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Hollywood Bowl events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.hollywoodbowl.com/events/performances',
      imageUrl: null,
      venue: {
        name: 'Hollywood Bowl',
        address: '2301 N Highland Ave, Los Angeles, CA 90068',
        city: 'Los Angeles'
      },
      latitude: 34.1122,
      longitude: -118.3391,
      city: 'Los Angeles',
      category: 'Festival',
      source: 'HollywoodBowl'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Hollywood Bowl error:', error.message);
    return [];
  }
}

module.exports = scrapeHollywoodBowl;
