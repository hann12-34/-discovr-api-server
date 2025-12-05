/**
 * Academy LA Nightclub Scraper
 * Premier EDM venue in Hollywood
 * URL: https://academyla.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeAcademyLA(city = 'Los Angeles') {
  console.log('🎧 Scraping Academy LA...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://academyla.com/events/', {
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
      
      // Various date patterns
      const datePatterns = [
        /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i,
        /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i,
        /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/
      ];
      
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const pattern of datePatterns) {
          const dateMatch = line.match(pattern);
          if (dateMatch) {
            let isoDate;
            
            if (pattern.source.includes('Jan|Feb')) {
              const monthStr = dateMatch[1];
              const day = dateMatch[2].padStart(2, '0');
              const year = dateMatch[3] || currentYear;
              const monthKey = Object.keys(months).find(k => monthStr.toLowerCase().startsWith(k.toLowerCase()));
              const month = months[monthKey] || '01';
              isoDate = `${year}-${month}-${day}`;
            } else if (pattern.source.includes('/')) {
              const month = dateMatch[1].padStart(2, '0');
              const day = dateMatch[2].padStart(2, '0');
              let year = dateMatch[3];
              if (year.length === 2) year = '20' + year;
              isoDate = `${year}-${month}-${day}`;
            }
            
            // Look for title nearby
            let title = null;
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
              const potentialTitle = lines[j];
              if (potentialTitle && 
                  potentialTitle.length > 3 && 
                  potentialTitle.length < 100 &&
                  !potentialTitle.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) &&
                  !potentialTitle.includes('Buy Tickets') &&
                  !potentialTitle.includes('RSVP')) {
                title = potentialTitle;
                break;
              }
            }
            
            if (title && isoDate && !seen.has(title + isoDate)) {
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

    console.log(`  ✅ Found ${events.length} Academy LA events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://academyla.com/events/',
      imageUrl: null,
      venue: {
        name: 'Academy LA',
        address: '6021 Hollywood Blvd, Los Angeles, CA 90028',
        city: 'Los Angeles'
      },
      latitude: 34.1017,
      longitude: -118.3194,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'AcademyLA'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Academy LA error:', error.message);
    return [];
  }
}

module.exports = scrapeAcademyLA;
