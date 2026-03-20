/**
 * The Abbey Scraper - REAL Puppeteer
 * Iconic LGBTQ+ venue in West Hollywood
 * URL: https://theabbeyweho.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheAbbey(city = 'Los Angeles') {
  console.log('🏳️‍🌈 Scraping The Abbey WeHo...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://theabbeyweho.com/events', {
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
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
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

    console.log(`  ✅ Found ${events.length} The Abbey events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T21:00:00') : null,
      url: 'https://theabbeyweho.com/events',
      imageUrl: null,
      venue: {
        name: 'The Abbey',
        address: '692 N Robertson Blvd, West Hollywood, CA 90069',
        city: 'Los Angeles'
      },
      latitude: 34.0837,
      longitude: -118.3854,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'TheAbbey'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }

    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Abbey error:', error.message);
    return [];
  }
}

module.exports = scrapeTheAbbey;
