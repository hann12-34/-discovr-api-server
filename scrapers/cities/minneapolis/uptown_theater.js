/**
 * Uptown Theater Minneapolis Events Scraper
 * Historic concert venue in Uptown Minneapolis
 * URL: https://www.uptowntheatermn.com/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeUptownTheater(city = 'Minneapolis') {
  console.log('🎭 Scraping Uptown Theater Minneapolis...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.uptowntheatermn.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const bodyText = document.body.innerText;
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
        if (dayPattern.test(lines[i]) && 
            /^\d{1,2}$/.test(lines[i + 1]) && 
            monthPattern.test(lines[i + 2])) {
          
          const day = lines[i + 1].padStart(2, '0');
          const monthStr = lines[i + 2].toUpperCase();
          const month = months[monthStr];
          
          let year = currentYear;
          if (parseInt(month) < currentMonth) {
            year = currentYear + 1;
          }
          
          const isoDate = `${year}-${month}-${day}`;
          const title = lines[i + 3];
          
          if (title && 
              title.length > 3 && 
              title.length < 150 &&
              !title.match(/^(Buy|Tickets|View|More|Featured|Shows|Home|About|Skip|See)/i) &&
              !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({ title: title.replace(/\s*-\s*\d+\+$/, ''), date: isoDate });
          }
        }
      }
      
      return results;
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
        url: 'https://www.uptowntheatermn.com/',
        imageUrl: null,
        venue: {
          name: 'Uptown Theater',
          address: '2900 Hennepin Ave, Minneapolis, MN 55408',
          city: 'Minneapolis'
        },
        latitude: 44.9485,
        longitude: -93.2983,
        city: 'Minneapolis',
        category: 'Nightlife',
        source: 'Uptown Theater'
      }));

    console.log(`  ✅ Found ${formattedEvents.length} Uptown Theater events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Uptown Theater error:', error.message);
    return [];
  }
}

module.exports = scrapeUptownTheater;
