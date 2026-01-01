/**
 * Rogers Place Edmonton Events Scraper
 * URL: https://rogersplace.com
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRogersplace(city = 'Edmonton') {
  console.log('🎵 Scraping Rogers Place Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.rogersplace.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Rogers Place uses id__post class for event cards
      document.querySelectorAll('.id__post, [class*="event-card"], article').forEach(card => {
        try {
          // Get the event link
          const linkEl = card.querySelector('a[href*="/events/event/"]');
          if (!linkEl) return;
          const url = linkEl.href;
          if (seen.has(url)) return;
          seen.add(url);
          
          // Get title from h1, h2, h3 or link text
          const titleEl = card.querySelector('h1 a, h2 a, h3 a, .id__post__title a');
          const title = titleEl ? titleEl.textContent.trim() : linkEl.textContent.trim();
          if (!title || title.length < 3) return;
          
          // Get date from list items or date elements
          const listItems = card.querySelectorAll('li');
          let dateStr = null;
          for (const li of listItems) {
            const text = li.textContent.trim();
            if (text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)) {
              dateStr = text;
              break;
            }
          }
          
          // Get image
          const imgEl = card.querySelector('img.id__post__banner, img[src*="icedistrict"]');
          const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('srcset')?.split(' ')[0]) : null;
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        // Handle "Wednesday December 31, 2025" format
        const dateMatch = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
        if (dateMatch) {
          const monthNames = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
          const month = monthNames[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        } else if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        // Only use real image URLs, filter out SVG data URIs and placeholders
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Rogers Place',
          address: '10220 104 Avenue NW, Edmonton, AB T5J 0H6',
          city: 'Edmonton'
        },
        latitude: 53.5467,
        longitude: -113.4973,
        city: 'Edmonton',
        category: 'Nightlife',
        source: 'Rogers Place'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Rogers Place events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Rogers Place error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeRogersplace;
