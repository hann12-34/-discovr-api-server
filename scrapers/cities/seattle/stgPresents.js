/**
 * STG (Seattle Theatre Group) Events Scraper
 * Major Seattle theatres: Paramount, Moore, Neptune
 * URL: https://www.stgpresents.org/calendar
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeSTGPresents(city = 'Seattle') {
  console.log('🎭 Scraping STG Presents (Paramount/Moore/Neptune)...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.stgpresents.org/calendar', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3, 'MAY': 4, 'JUNE': 5,
        'JULY': 6, 'AUGUST': 7, 'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11
      };
      
      // Find current month/year from calendar header
      let currentMonth = new Date().getMonth();
      let currentYear = new Date().getFullYear();
      
      const monthYearMatch = bodyText.match(/(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})/);
      if (monthYearMatch) {
        currentMonth = months[monthYearMatch[1]];
        currentYear = parseInt(monthYearMatch[2]);
      }
      
      // Find day numbers with events
      const seen = new Set();
      let currentDay = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is a day number in calendar (1-31)
        if (/^[1-9]$|^[12][0-9]$|^3[01]$/.test(line)) {
          currentDay = parseInt(line);
          continue;
        }
        
        // Check if this looks like an event with time
        const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(AM|PM))$/i);
        if (timeMatch && currentDay) {
          // Look for event title in next lines
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const candidate = lines[j];
            
            // Skip day numbers, times, and navigation
            if (/^\d{1,2}$/.test(candidate) ||
                candidate.match(/^\d{1,2}:\d{2}\s*(AM|PM)/i) ||
                candidate.match(/^(SU|MO|TU|WE|TH|FR|SA)$/i) ||
                candidate === 'CALENDAR' ||
                candidate.match(/^(PARAMOUNT|MOORE|NEPTUNE|5TH AVENUE|KERRY HALL)/i) ||
                candidate.length < 5) {
              continue;
            }
            
            // Found event title!
            const title = candidate;
            const month = String(currentMonth + 1).padStart(2, '0');
            const day = String(currentDay).padStart(2, '0');
            const isoDate = `${currentYear}-${month}-${day}`;
            
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({
                title: title,
                date: isoDate
              });
            }
            break;
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} STG events`);

    // Filter to main music/performance events
    const filteredEvents = events.filter(e => {
      const title = e.title.toUpperCase();
      // Skip class/workshop type events
      if (title.includes('DANCE CLASS') || 
          title.includes('YOGA') || 
          title.includes('CLINIC') ||
          title.includes('ARCHIVE') ||
          title.includes('WORKSHOP')) {
        return false;
      }
      return true;
    });

    console.log(`  ✅ Filtered to ${filteredEvents.length} performance events`);

    const formattedEvents = filteredEvents.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: 'https://www.stgpresents.org/calendar',
      imageUrl: null,
      venue: {
        name: 'STG Presents',
        address: '911 Pine St, Seattle, WA 98101', // Paramount address
        city: 'Seattle'
      },
      latitude: 47.6134,
      longitude: -122.3328,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'STG Presents'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title.substring(0, 50)} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  STG Presents error:', error.message);
    return [];
  }
}

module.exports = scrapeSTGPresents;
