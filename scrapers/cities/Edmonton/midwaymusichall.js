/**
 * Midway Music Hall Edmonton Events Scraper
 * Major live music venue - Live Nation operated
 * URL: https://www.midwaymusichall.com/shows
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMidwayMusicHall(city = 'Edmonton') {
  console.log('🎸 Scraping Midway Music Hall Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.midwaymusichall.com/shows', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Extract events from the shows page
    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Look for event cards/links
      document.querySelectorAll('a[href*="/shows/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url === 'https://www.midwaymusichall.com/shows') return;
        seen.add(url);
        
        // Try to find title
        let title = null;
        const titleEl = link.querySelector('h2, h3, h4, [class*="title"]');
        if (titleEl) {
          title = titleEl.textContent.trim();
        } else {
          title = link.textContent.trim().split('\n')[0];
        }
        
        if (!title || title.length < 3 || title.length > 200) return;
        
        // Try to find date in nearby elements
        let dateStr = null;
        const parent = link.closest('article, div, li');
        if (parent) {
          const dateEl = parent.querySelector('time, [class*="date"]');
          if (dateEl) {
            dateStr = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }
        }
        
        // Try to find image
        let imageUrl = null;
        if (parent) {
          const img = parent.querySelector('img');
          if (img && img.src && img.src.startsWith('http') && !img.src.includes('logo')) {
            imageUrl = img.src;
          }
        }
        
        results.push({ title, url, dateStr, imageUrl });
      });
      
      return results;
    });

    console.log(`  📋 Found ${events.length} events on shows page`);

    const formattedEvents = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const months = { 
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    // Visit each event page if we need more details
    for (const event of events) {
      try {
        let isoDate = null;
        let imageUrl = event.imageUrl;
        let title = event.title;

        // If we don't have date, visit the event page
        if (!event.dateStr || !isoDate) {
          await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(resolve => setTimeout(resolve, 1500));

          const eventData = await page.evaluate(() => {
            let dateStr = null;
            let imageUrl = null;
            let title = null;
            
            // Get title
            const titleEl = document.querySelector('h1, [class*="title"]');
            if (titleEl) title = titleEl.textContent.trim();
            
            // Look for date in structured data
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              try {
                const data = JSON.parse(script.textContent);
                if (data.startDate) {
                  dateStr = data.startDate;
                  break;
                }
              } catch (e) {}
            }
            
            // Look in meta tags
            if (!dateStr) {
              const metaDate = document.querySelector('meta[property="event:start_time"]');
              if (metaDate) dateStr = metaDate.getAttribute('content');
            }
            
            // Look in visible elements
            if (!dateStr) {
              const bodyText = document.body.innerText;
              const dateMatch = bodyText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
              if (dateMatch) {
                dateStr = `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`;
              }
            }
            
            // Get image
            const img = document.querySelector('img[src*="cdn"], article img, .event-image img');
            if (img && img.src && img.src.startsWith('http') && !img.src.includes('logo')) {
              imageUrl = img.src;
            }
            
            return { dateStr, imageUrl, title };
          });

          if (eventData.dateStr) event.dateStr = eventData.dateStr;
          if (eventData.imageUrl) imageUrl = eventData.imageUrl;
          if (eventData.title) title = eventData.title;
        }

        // Parse date
        if (event.dateStr) {
          const isoMatch = event.dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            isoDate = isoMatch[0];
          } else {
            const mdyMatch = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
            if (mdyMatch) {
              const month = months[mdyMatch[1].toLowerCase()];
              const day = mdyMatch[2].padStart(2, '0');
              isoDate = `${mdyMatch[3]}-${month}-${day}`;
            }
          }
        }

        if (!isoDate || !title) continue;
        if (new Date(isoDate) < today) continue;

        formattedEvents.push({
          id: uuidv4(),
          title: title,
          date: isoDate,
          startDate: new Date(isoDate + 'T19:00:00'),
          url: event.url,
          imageUrl: (imageUrl && !imageUrl.includes('placeholder') && !imageUrl.includes('data:image')) ? imageUrl : null,
          venue: {
            name: 'Midway Music Hall',
            address: '6107 104 Street NW, Edmonton, AB T6H 2K8',
            city: 'Edmonton'
          },
          latitude: 53.5017,
          longitude: -113.5074,
          city: 'Edmonton',
          category: 'Nightlife',
          source: 'Midway Music Hall'
        });

      } catch (err) {
        continue;
      }
    }

    await browser.close();

    console.log(`  ✅ Found ${formattedEvents.length} valid Midway Music Hall events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Midway Music Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeMidwayMusicHall;
