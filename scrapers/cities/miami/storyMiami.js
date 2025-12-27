/**
 * Story Miami Scraper - REAL Puppeteer
 * Premier nightclub in South Beach
 * URL: https://storymiami.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeStoryMiami(city = 'Miami') {
  console.log('🌴 Scraping Story Miami...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.tixr.com/groups/story', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      
      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'june': '06', 'july': '07', 'august': '08', 'september': '09',
        'october': '10', 'november': '11', 'december': '12'
      };

      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 150);
      
      const datePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(datePattern);
        
        if (match) {
          const parts = match[0].match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (parts) {
            const monthStr = parts[1].toLowerCase().slice(0, 3);
            const day = parts[2];
            const year = parts[3] || currentYear;
            const month = months[monthStr];
            
            if (month) {
              const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
              
              for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const potentialTitle = lines[j];
                if (potentialTitle && 
                    potentialTitle.length > 4 && 
                    !potentialTitle.match(/^(mon|tue|wed|thu|fri|sat|sun)/i) &&
                    !potentialTitle.match(/^\d/) &&
                    !potentialTitle.match(/tickets|buy|menu|home|about|rsvp/i)) {
                  if (!seen.has(potentialTitle + isoDate)) {
                    seen.add(potentialTitle + isoDate);
                    results.push({ title: potentialTitle.substring(0, 100), date: isoDate });
                  }
                  break;
                }
              }
            }
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Story Miami events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T23:00:00') : null,
      url: 'https://storymiami.com/events',
      imageUrl: null,
      venue: {
        name: 'Story Miami',
        address: '136 Collins Ave, Miami Beach, FL 33139',
        city: 'Miami'
      },
      latitude: 25.7785,
      longitude: -80.1300,
      city: 'Miami',
      category: 'Nightlife',
      source: 'StoryMiami'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Story Miami error:', error.message);
    return [];
  }
}

module.exports = scrapeStoryMiami;
