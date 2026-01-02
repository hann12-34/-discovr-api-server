/**
 * Fillmore Minneapolis Events Scraper
 * Major concert venue in Minneapolis
 * URL: https://www.fillmoreminneapolis.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeFillmoreMinneapolis(city = 'Minneapolis') {
  console.log('🎤 Scraping Fillmore Minneapolis...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.fillmoreminneapolis.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const bodyText = document.body.innerText;
      
      // Parse events from page text
      // Format: "FRI\n03\nAPR\nEVENT TITLE"
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      
      const dayPattern = /^(MON|TUE|WED|THU|FRI|SAT|SUN)$/i;
      const monthPattern = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      for (let i = 0; i < lines.length - 3; i++) {
        // Check for pattern: DAY_OF_WEEK, DAY_NUM, MONTH
        if (dayPattern.test(lines[i]) && 
            /^\d{1,2}$/.test(lines[i + 1]) && 
            monthPattern.test(lines[i + 2])) {
          
          const day = lines[i + 1].padStart(2, '0');
          const monthStr = lines[i + 2].toUpperCase();
          const month = months[monthStr];
          
          // Determine year - if month is before current month, use next year
          let year = currentYear;
          if (parseInt(month) < currentMonth) {
            year = currentYear + 1;
          }
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the next line after the month
          const title = lines[i + 3];
          
          if (title && 
              title.length > 3 && 
              title.length < 150 &&
              !title.match(/^(Buy|Tickets|View|More|Featured|Shows|Home|About|Skip)/i) &&
              !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({ title, date: isoDate });
          }
        }
      }
      
      return results;
    });

    // Also get ticket URLs from the page
    const ticketUrls = await page.evaluate(() => {
      const urls = {};
      document.querySelectorAll('a[href*="ticketmaster.com"]').forEach(link => {
        const href = link.href;
        const text = link.closest('div, article, section')?.textContent || '';
        // Extract event name from URL
        const match = href.match(/\/event\/([^/]+)/);
        if (match) {
          urls[text.substring(0, 100)] = href;
        }
      });
      return urls;
    });

    await browser.close();

    const now = new Date();
    const formattedEvents = events
      .filter(e => new Date(e.date) >= now)
      .map(event => ({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: event.date,
        startDate: new Date(event.date + 'T20:00:00'),
        url: 'https://www.fillmoreminneapolis.com/',
        imageUrl: null,
        venue: {
          name: 'Fillmore Minneapolis',
          address: '525 N 5th St, Minneapolis, MN 55401',
          city: 'Minneapolis'
        },
        latitude: 44.9847,
        longitude: -93.2775,
        city: 'Minneapolis',
        category: 'Nightlife',
        source: 'Fillmore Minneapolis'
      }));

    console.log(`  ✅ Found ${formattedEvents.length} Fillmore Minneapolis events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Fillmore Minneapolis error:', error.message);
    return [];
  }
}

module.exports = scrapeFillmoreMinneapolis;
