/**
 * Trinity Nightclub Events Scraper (Seattle)
 * Top 40, Hip-Hop nightclub in Pioneer Square
 * URL: https://www.trinitynightclub.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTrinityNightclub(city = 'Seattle') {
  console.log('🔥 Scraping Trinity Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.trinitynightclub.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const eventDataMap = {};
      document.querySelectorAll('article, [class*="event"], [class*="show"], li').forEach(el => {
        const titleEl = el.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]');
        if (!titleEl) return;
        const key = titleEl.textContent.trim().toLowerCase();
        if (!key || key.length < 3) return;
        const linkEl = el.querySelector('a[href]');
        const imgEl = el.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
        if (!eventDataMap[key]) eventDataMap[key] = { url: linkEl ? linkEl.href : '', imageUrl: imgEl ? imgEl.src : null };
      });
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04', 
        'MAY': '05', 'JUNE': '06', 'JULY': '07', 'AUGUST': '08',
        'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
      };
      
      // Pattern: "DECEMBER 31ST" or "MARCH 21ST"
      const datePattern = /(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})(?:ST|ND|RD|TH)?/i;
      
      const seen = new Set();
      
      // Look for year on page - NO FALLBACK
      const yearMatch = bodyText.match(/\b(202[4-9])\b/);
      if (!yearMatch) return [];
      const year = yearMatch[1];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for event lines containing dates
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1].toUpperCase();
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr];
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Extract event name from the line (before the date part)
          let title = line.split('|')[0].trim();
          
          // Clean up title
          title = title.replace(/\s*\|\s*(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER).*/i, '').trim();
          
          if (title && title.length > 3 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            const data = eventDataMap[title.toLowerCase()] || {};
            results.push({
              title: title,
              date: isoDate,
              url: data.url || '',
              imageUrl: data.imageUrl || null
            });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Trinity Nightclub events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: event.url || 'https://www.trinitynightclub.com',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Trinity Nightclub',
        address: '111 Yesler Way, Seattle, WA 98104',
        city: 'Seattle'
      },
      latitude: 47.6021,
      longitude: -122.3343,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Trinity Nightclub'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Trinity Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeTrinityNightclub;
