/**
 * Belly Up Tavern San Diego Events Scraper
 * Premier live music venue in Solana Beach
 * URL: https://bellyup.com/events/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBellyUp(city = 'San Diego') {
  console.log('🎸 Scraping Belly Up Tavern San Diego...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://bellyup.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      
      // Belly Up uses EventData JavaScript object
      if (typeof EventData !== 'undefined' && EventData.events) {
        EventData.events.forEach(e => {
          const title = e.value || e.display;
          const url = e.data?.url;
          if (title && url) {
            const dateMatch = title.match(/(\d{1,2})\/(\d{1,2})$/);
            let dateStr = dateMatch ? dateMatch[0] : '';
            results.push({ 
              title: title.replace(/\s*\d{1,2}\/\d{1,2}$/, '').trim(), 
              dateStr, 
              url, 
              imageUrl: e.data?.image || null 
            });
          }
        });
      }
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const seenKeys = new Set();
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Handle MM/DD format from Belly Up
        const mmddMatch = event.dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (mmddMatch) {
          const month = mmddMatch[1].padStart(2, '0');
          const day = mmddMatch[2].padStart(2, '0');
          let year = now.getFullYear().toString();
          if (parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        } else if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            let year = now.getFullYear().toString();
            if (parseInt(month) < now.getMonth() + 1) {
              year = (now.getFullYear() + 1).toString();
            }
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      const key = event.title + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Belly Up Tavern',
          address: '143 S Cedros Ave, Solana Beach, CA 92075',
          city: 'San Diego'
        },
        latitude: 32.9912,
        longitude: -117.2698,
        city: 'San Diego',
        category: 'Nightlife',
        source: 'Belly Up Tavern'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Belly Up events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Belly Up error:', error.message);
    return [];
  }
}

module.exports = scrapeBellyUp;
