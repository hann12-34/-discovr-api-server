/**
 * Academy LA Scraper - REAL Puppeteer scraper
 * Popular electronic music venue in Hollywood
 * URL: https://academy.la/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeAcademyLA(city = 'Los Angeles') {
  console.log('🎭 Scraping Academy LA...');

  try {
    // Use axios/cheerio first - simpler and faster
    const response = await axios.get('https://academy.la/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const events = [];

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
      
      // Try to find event cards/containers
      const eventSelectors = [
        '.event-card', '.event-item', '.event', '.show',
        '[class*="event"]', '[class*="show"]', '.tribe-events-calendar-list__event'
      ];
      
      let eventElements = [];
      for (const selector of eventSelectors) {
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {
          eventElements = els;
          break;
        }
      }
      
      // If found event elements, parse them
      if (eventElements.length > 0) {
        eventElements.forEach(el => {
          const text = el.innerText;
          const titleEl = el.querySelector('h2, h3, h4, .title, .event-title, [class*="title"]');
          const title = titleEl ? titleEl.innerText.trim() : null;
          
          // Find date in text
          const dateMatch = text.match(/(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-]?(\d{2,4})?/)
            || text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          
          if (title && dateMatch) {
            let isoDate;
            if (dateMatch[0].match(/[a-z]/i)) {
              const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
              const day = dateMatch[2];
              const year = dateMatch[3] || currentYear;
              const month = months[monthStr];
              if (month) {
                isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
              }
            } else {
              const m = dateMatch[1].padStart(2, '0');
              const d = dateMatch[2].padStart(2, '0');
              const y = dateMatch[3] || currentYear;
              isoDate = `${y}-${m}-${d}`;
            }
            
            if (isoDate && title && !seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({ title: title.substring(0, 100), date: isoDate });
            }
          }
        });
      }
      
      // Fallback: parse body text
      if (results.length === 0) {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 150);
        
        const datePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = line.match(datePattern);
          
          if (match) {
            const dateStr = match[0];
            const parts = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
            if (parts) {
              const monthStr = parts[1].toLowerCase().slice(0, 3);
              const day = parts[2];
              const year = parts[3] || currentYear;
              const month = months[monthStr];
              
              if (month) {
                const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
                
                // Look for title in previous lines
                for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                  const potentialTitle = lines[j];
                  if (potentialTitle && 
                      potentialTitle.length > 4 && 
                      !potentialTitle.match(/^(mon|tue|wed|thu|fri|sat|sun)/i) &&
                      !potentialTitle.match(/^\d/) &&
                      !potentialTitle.match(/tickets|buy|menu|home|about/i)) {
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
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Academy LA events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T22:00:00') : null,
      url: 'https://academyla.com/events',
      imageUrl: null,
      venue: {
        name: 'Academy LA',
        address: '6021 Hollywood Blvd, Los Angeles, CA 90028',
        city: 'Los Angeles'
      },
      latitude: 34.1018,
      longitude: -118.3196,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'AcademyLA'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Academy LA error:', error.message);
    return [];
  }
}

module.exports = scrapeAcademyLA;
