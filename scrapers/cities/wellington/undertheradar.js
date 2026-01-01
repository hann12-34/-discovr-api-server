/**
 * UnderTheRadar Wellington Events Scraper
 * NZ's premier gig guide aggregator
 * URL: https://www.undertheradar.co.nz/utr/gigRegion/Wellington
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeUnderTheRadar(city = 'Wellington') {
  console.log('🎸 Scraping UnderTheRadar Wellington...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.undertheradar.co.nz/utr/gigRegion/Wellington', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const gigUrls = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="/gig/"]').forEach(link => {
        if (link.href.includes('.utr') && link.textContent.trim().length > 3) {
          urls.add(link.href);
        }
      });
      return Array.from(urls).slice(0, 30);
    });

    console.log(`  Found ${gigUrls.length} gig URLs to process...`);

    const events = [];
    
    for (const url of gigUrls.slice(0, 25)) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const eventData = await page.evaluate(() => {
          const pageTitle = document.title || '';
          const h1 = document.querySelector('h1')?.textContent?.trim();
          
          if (!h1) return null;

          const titleParts = pageTitle.split(' - ');
          let venue = null;
          let dateText = null;
          
          if (titleParts.length >= 2) {
            const venuePart = titleParts[1];
            const venueMatch = venuePart.match(/^([^,]+)/);
            venue = venueMatch ? venueMatch[1].trim() : null;
          }
          
          if (titleParts.length >= 3) {
            dateText = titleParts[2].trim();
          }

          const img = document.querySelector('img[src*="event"], img[src*="gig"], .event-image img, article img');
          const imageUrl = img?.src;

          const ticketLink = document.querySelector('a[href*="ticket"], a[href*="eventfinda"], a[href*="humanitix"], a[href*="flicket"]');
          const ticketUrl = ticketLink?.href;

          return { title: h1, dateText, venue, imageUrl, ticketUrl };
        });

        if (eventData && eventData.title) {
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
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const fullDateMatch = event.dateText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
        const shortDateMatch = event.dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) ||
                              event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        
        if (fullDateMatch) {
          const day = fullDateMatch[1].padStart(2, '0');
          const monthFull = fullDateMatch[2].toLowerCase();
          const monthShort = monthFull.substring(0, 3);
          const month = months[monthShort];
          const year = fullDateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        } else if (shortDateMatch) {
          let day, month;
          if (/\d/.test(shortDateMatch[1])) {
            day = shortDateMatch[1].padStart(2, '0');
            month = months[shortDateMatch[2].toLowerCase().substring(0, 3)];
          } else {
            month = months[shortDateMatch[1].toLowerCase().substring(0, 3)];
            day = shortDateMatch[2].padStart(2, '0');
          }
          
          let year = currentYear;
          const eventDate = new Date(`${year}-${month}-${day}`);
          if (eventDate < now) {
            year = currentYear + 1;
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const venueName = event.venue || 'Wellington Venue';
      const address = event.address || `${venueName}, Wellington, New Zealand`;

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
          city: 'Wellington'
        },
        city: 'Wellington',
        category: 'Nightlife',
        source: 'UnderTheRadar'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} UnderTheRadar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  UnderTheRadar error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeUnderTheRadar;
