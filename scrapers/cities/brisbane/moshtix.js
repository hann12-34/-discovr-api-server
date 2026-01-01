/**
 * Moshtix Brisbane Events Scraper
 * Australian ticketing platform
 * URL: https://www.moshtix.com.au/v2/search?query=brisbane
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMoshtix(city = 'Brisbane') {
  console.log('🎫 Scraping Moshtix Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.moshtix.com.au/v2/search?query=brisbane', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const eventUrls = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="/v2/event/"]').forEach(link => {
        if (link.href.includes('brisbane') || link.textContent.toLowerCase().includes('brisbane')) {
          urls.add(link.href);
        }
      });
      return Array.from(urls).slice(0, 25);
    });

    console.log(`  Found ${eventUrls.length} event URLs...`);

    const events = [];
    
    for (const url of eventUrls.slice(0, 20)) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const eventData = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          let title = h1?.textContent?.trim();
          if (!title) return null;
          
          title = title.split('\n')[0].trim();
          if (title.length > 80) title = title.substring(0, 80);

          const bodyText = document.body.textContent || '';
          
          const dateMatch = bodyText.match(/(\w{3})\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/i) ||
                           bodyText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
          
          let venue = null;
          const venuePatterns = [
            /venue[:\s]+([A-Za-z0-9\s&']+?)(?:,|\n|$)/i,
            /at\s+(?:the\s+)?([A-Za-z0-9\s&']+?)(?:,|\s+-|\n|Brisbane|QLD)/i,
            /([A-Za-z\s&']+(?:Hotel|Bar|Club|Theatre|Hall|Arena|Venue))/i
          ];
          
          for (const pattern of venuePatterns) {
            const match = bodyText.match(pattern);
            if (match && match[1].length > 3 && match[1].length < 50) {
              venue = match[1].trim();
              break;
            }
          }

          const addressMatch = bodyText.match(/(\d+[^,\n]{5,50},?\s*(?:Fortitude Valley|Brisbane|QLD|Valley|Newstead)[^,\n]{0,30})/i);
          const address = addressMatch ? addressMatch[1].trim() : null;

          const img = document.querySelector('img[src*="event"], img[src*="moshtix"], .event-image img');
          const imageUrl = img?.src;

          return { title, dateText: dateMatch ? dateMatch[0] : null, venue, address, imageUrl };
        });

        if (eventData && eventData.title && !eventData.title.includes('FEATURED')) {
          events.push({
            ...eventData,
            sourceUrl: url
          });
        }
      } catch (e) {
        // Skip failed pages
      }
    }

    await browser.close();

    const formattedEvents = [];
    const months = { 
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', 
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const fullMatch = event.dateText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        const shortMatch = event.dateText.match(/(\w{3})\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
        
        if (fullMatch) {
          const day = fullMatch[1].padStart(2, '0');
          const month = months[fullMatch[2].toLowerCase()];
          const year = fullMatch[3];
          isoDate = `${year}-${month}-${day}`;
        } else if (shortMatch) {
          const day = shortMatch[2].padStart(2, '0');
          const month = months[shortMatch[3].toLowerCase()];
          const year = shortMatch[4];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const venueName = event.venue || 'Brisbane Venue';
      const address = event.address || `${venueName}, Brisbane QLD`;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.sourceUrl,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: venueName,
          address: address,
          city: 'Brisbane'
        },
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'Moshtix'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Moshtix Brisbane events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Moshtix error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMoshtix;
