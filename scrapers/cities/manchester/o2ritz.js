/**
 * O2 Ritz Manchester manchester Events Scraper
 * URL: https://o2ritzmanchester.co.uk
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeO2ritz(city = 'manchester') {
  console.log('🎵 Scraping O2 Ritz Manchester...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2ritzmanchester/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const processed = new Set();
      
      // Academy Music Group uses Next.js - find event links
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const href = link.href;
        if (!href.includes('/events/') || href.endsWith('/events/') || href.endsWith('/events') || processed.has(href)) return;
        processed.add(href);
        
        let parent = link.parentElement;
        for (let i = 0; i < 6 && parent; i++) {
          const imgs = parent.querySelectorAll('img');
          const fullText = parent.textContent;
          const dateMatch = fullText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          
          const urlParts = href.split('/');
          const slug = urlParts[urlParts.length - 1].replace(/-tickets.*/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          
          let imgSrc = null;
          imgs.forEach(img => {
            if (img.src && !img.src.includes('logo') && !img.src.includes('icon') && img.src.startsWith('http') && img.width > 50) imgSrc = img.src;
          });
          
          if (dateMatch && slug.length > 3) {
            results.push({ title: slug, day: dateMatch[1], month: dateMatch[2], year: dateMatch[3] || null, url: href, imageUrl: imgSrc });
            break;
          }
          parent = parent.parentElement;
        }
      });
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    for (const event of events) {
      const day = event.day.padStart(2, '0');
      const month = months[event.month.toLowerCase().substring(0, 3)];
      let year = event.year || currentYear.toString();
      if (!event.year && parseInt(month) < currentMonth) year = (currentYear + 1).toString();
      
      const isoDate = `${year}-${month}-${day}`;
      if (new Date(isoDate) < today) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'O2 Ritz Manchester',
          address: 'Whitworth Street West, Manchester M1 5WZ',
          city: 'Manchester'
        },
        latitude: 53.4752,
        longitude: -2.2404,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'O2 Ritz Manchester'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} O2 Ritz Manchester events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  O2 Ritz Manchester error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeO2ritz;
