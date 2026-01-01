/**
 * Good Room Brooklyn Events Scraper
 * Greenpoint nightclub with two rooms
 * URL: http://www.goodroombk.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeGoodRoom(city = 'New York') {
  console.log('🎧 Scraping Good Room...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('http://www.goodroombk.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Pattern: "Friday:" followed by "1/2" (month/day)
      const dayPattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):$/i;
      const datePattern = /^(\d{1,2})\/(\d{1,2})$/;
      
      let currentDate = null;
      let currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for date line (e.g., "1/2")
        const dateMatch = line.match(datePattern);
        if (dateMatch && i > 0 && dayPattern.test(lines[i - 1])) {
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          
          // Determine year - if month is less than current month, it's next year
          const now = new Date();
          let year = currentYear;
          if (parseInt(month) < now.getMonth() + 1) {
            year = currentYear + 1;
          }
          
          currentDate = `${year}-${month}-${day}`;
          continue;
        }
        
        // Look for event title after "Good Room:" or "Bad Room:"
        if (currentDate && (line === 'Good Room:' || line === 'Bad Room:')) {
          const room = line.replace(':', '');
          const nextLine = lines[i + 1];
          
          if (nextLine && !nextLine.match(datePattern) && 
              !dayPattern.test(nextLine) && 
              nextLine !== 'Tickets' && 
              nextLine !== 'Good Room:' && 
              nextLine !== 'Bad Room:' &&
              nextLine.length > 3) {
            
            const title = nextLine;
            const key = title + currentDate;
            
            if (!seen.has(key)) {
              seen.add(key);
              
              // Look for ticket URL
              let ticketUrl = null;
              for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                if (lines[j] === 'Tickets') {
                  // Find the ra.co link
                  const links = document.querySelectorAll('a[href*="ra.co"]');
                  for (const link of links) {
                    if (link.textContent.includes('Tickets')) {
                      ticketUrl = link.href;
                      break;
                    }
                  }
                  break;
                }
              }
              
              results.push({
                title,
                dateStr: currentDate,
                room,
                ticketUrl
              });
            }
          }
        }
      }
      
      // Also try to get ticket URLs by scanning all links
      const allLinks = Array.from(document.querySelectorAll('a[href*="ra.co/events"]'));
      const linkMap = {};
      allLinks.forEach(link => {
        const container = link.closest('div, section, article');
        if (container) {
          const text = container.textContent;
          linkMap[text.substring(0, 100)] = link.href;
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const now = new Date();
    const seenKeys = new Set();
    
    for (const event of events) {
      if (!event.dateStr) continue;
      if (new Date(event.dateStr) < now) continue;
      
      const key = event.title + event.dateStr;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.room ? `${event.room} event` : null,
        date: event.dateStr,
        startDate: new Date(event.dateStr + 'T23:00:00'),
        url: event.ticketUrl || 'http://www.goodroombk.com/',
        imageUrl: null,
        venue: {
          name: 'Good Room',
          address: '98 Meserole Ave, Brooklyn, NY 11222',
          city: 'New York'
        },
        latitude: 40.7272,
        longitude: -73.9517,
        city: 'New York',
        category: 'Nightlife',
        source: 'Good Room'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Good Room events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Good Room error:', error.message);
    return [];
  }
}

module.exports = scrapeGoodRoom;
