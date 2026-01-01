/**
 * Circa Theatre Wellington Events Scraper
 * Professional theatre venue
 * URL: https://www.circa.co.nz
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeCircaTheatre(city = 'Wellington') {
  console.log('🎭 Scraping Circa Theatre Wellington...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.circa.co.nz', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a').forEach(link => {
        if (!link.href.includes('circa.co.nz')) return;
        
        const container = link.closest('div, article, li') || link;
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        
        const dateMatch = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
        
        if (dateMatch && text.length > 20 && text.length < 400) {
          const titleMatch = text.match(/^([^0-9]+?)(?:\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          let title = titleMatch ? titleMatch[1].trim() : text.split(/\d/).shift()?.trim();
          
          title = title?.replace(/Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sat|Sun|Mon|Tue|Wed|Thu|Fri/gi, '').trim();
          
          if (title && title.length > 3 && title.length < 80 && !seen.has(title)) {
            seen.add(title);
            const img = container.querySelector('img');
            results.push({
              title: title,
              url: link.href,
              dateText: dateMatch[0],
              imageUrl: img?.src
            });
          }
        }
      });
      return results.slice(0, 20);
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
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Circa Theatre',
          address: '1 Taranaki Street, Wellington 6011',
          city: 'Wellington'
        },
        city: 'Wellington',
        category: 'Nightlife',
        source: 'Circa Theatre'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Circa Theatre events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Circa Theatre error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeCircaTheatre;
