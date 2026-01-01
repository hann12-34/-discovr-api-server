/**
 * San Fran Wellington Events Scraper
 * Live music venue on Cuba Street
 * URL: https://www.sanfran.co.nz/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSanFran(city = 'Wellington') {
  console.log('🎵 Scraping San Fran Wellington...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.sanfran.co.nz/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      const links = document.querySelectorAll('a[href*="-tickets-ae"]');
      
      links.forEach(link => {
        if (seen.has(link.href)) return;
        seen.add(link.href);
        
        let container = link;
        for (let i = 0; i < 10; i++) {
          container = container.parentElement;
          if (!container) break;
          const text = container.textContent || '';
          if (text.length > 50 && text.length < 500) break;
        }
        
        if (!container) return;
        
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        const img = container.querySelector('img');
        
        const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        
        let title = null;
        const titleMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(?:\d{1,2}:\d{2}\s*[ap]m)?(.+?)(?:Find Tickets|18\+|R18|All Ages|$)/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
          title = title.replace(/^\d{1,2}:\d{2}\s*[ap]m\s*/i, '').trim();
          
          if (title.length > 15) {
            for (let len = 5; len < title.length / 2; len++) {
              const pattern = title.substring(0, len);
              const rest = title.substring(len);
              if (rest.startsWith(pattern) || rest.includes(pattern)) {
                const idx = title.indexOf(pattern, len);
                if (idx > 0 && idx < title.length - 3) {
                  title = title.substring(0, idx).trim();
                  break;
                }
              }
            }
          }
        }
        
        if (!title || title.length < 3) return;
        if (/^(Find|View|More|Book|Buy|Get)/i.test(title)) return;
        
        results.push({
          title: title,
          dateText: dateMatch ? `${dateMatch[2]} ${dateMatch[3]}` : null,
          url: link.href,
          imageUrl: img?.src
        });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateText) {
        const dateMatch = event.dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
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
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'San Fran',
          address: '171 Cuba Street, Te Aro, Wellington 6011',
          city: 'Wellington'
        },
        latitude: -41.2924,
        longitude: 174.7732,
        city: 'Wellington',
        category: 'Nightlife',
        source: 'San Fran'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} San Fran events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  San Fran error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeSanFran;
