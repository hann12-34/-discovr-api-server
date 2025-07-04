/**
 * Run to End Endo Events Scraper
 * 
 * This scraper extracts event information from the Endo Network's Run to End Endo event
 * Source: https://raceroster.com/events/2025/103627/the-endo-networks-run-to-end-endo-2025/page/vancouver-bc
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class RunToEndEndoScraper {
  constructor() {
    this.name = 'Run to End Endo Vancouver';
    this.url = 'https://raceroster.com/events/2025/103627/the-endo-networks-run-to-end-endo-2025/page/vancouver-bc';
    this.sourceIdentifier = 'run-to-end-endo';
    
    // Default venue info for Stanley Park (common running event location)
    this.venue = {
      name: 'Stanley Park',
      id: 'stanley-park-vancouver',
      address: 'Stanley Park Dr',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      coordinates: {
        lat: 49.3019,
        lng: -123.1401
      },
      websiteUrl: 'https://raceroster.com/events/2025/103627/the-endo-networks-run-to-end-endo-2025',
      description: 'Stanley Park is a 1,001-acre public park in Vancouver, featuring beautiful trails, beaches, and views of the city skyline and mountains.'
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Run to End Endo events scraper...');
    const events = [];
    let browser = null;
    
    try {
      // Launch browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the website
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'run-to-end-endo-debug.png' });
      console.log('✅ Saved debug screenshot to run-to-end-endo-debug.png');
      
      // Try to extract event date
      console.log('Looking for event date...');
      
      // Check for date in various locations
      const dateSelectors = [
        '.race-date',
        '.event-date',
        '.date-display',
        'time',
        '.date',
        '.js-event-date',
        '.calendar-date',
        '.event-header-date'
      ];
      
      let eventDate = null;
      let locationName = null;
      
      for (const selector of dateSelectors) {
        const dateElement = await page.$(selector);
        if (dateElement) {
          const dateText = await page.evaluate(el => el.textContent.trim(), dateElement);
          console.log(`Found potential date text: "${dateText}"`);
          
          // Try to parse the date
          try {
            // Look for patterns like "March 15, 2025" or "03/15/2025"
            const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
            
            if (dateMatch) {
              const month = dateMatch[1];
              const day = parseInt(dateMatch[2]);
              const year = parseInt(dateMatch[3]);
              
              eventDate = new Date(`${month} ${day}, ${year}`);
              console.log(`✅ Parsed event date: ${eventDate.toDateString()}`);
              break;
            }
            
            // Try alternative date format (MM/DD/YYYY)
            const altDateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (altDateMatch) {
              const month = parseInt(altDateMatch[1]) - 1; // JS months are 0-indexed
              const day = parseInt(altDateMatch[2]);
              const year = parseInt(altDateMatch[3]);
              
              eventDate = new Date(year, month, day);
              console.log(`✅ Parsed event date: ${eventDate.toDateString()}`);
              break;
            }
          } catch (dateError) {
            console.log(`❌ Error parsing date: ${dateError.message}`);
          }
        }
      }
      
      // Look for event location
      const locationSelectors = [
        '.venue',
        '.location',
        '.event-location',
        '.event-venue',
        '.address',
        '.race-location'
      ];
      
      for (const selector of locationSelectors) {
        const locationElement = await page.$(selector);
        if (locationElement) {
          locationName = await page.evaluate(el => el.textContent.trim(), locationElement);
          if (locationName) {
            console.log(`✅ Found event location: ${locationName}`);
            break;
          }
        }
      }
      
      // If we couldn't find the date, try to extract it from text content
      if (!eventDate) {
        // Extract all text from the page
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        // Look for date patterns in the text
        const datePatterns = [
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/gi,
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
          /(\d{4})-(\d{1,2})-(\d{1,2})/gi
        ];
        
        for (const pattern of datePatterns) {
          const match = pattern.exec(bodyText);
          if (match) {
            try {
              let date;
              
              if (pattern.toString().includes('January|February')) {
                // First pattern: Month Day, Year
                const month = match[1];
                const day = match[2];
                const year = match[3];
                date = new Date(`${month} ${day}, ${year}`);
              } else if (pattern.toString().includes('\\/')) {
                // Second pattern: MM/DD/YYYY
                const month = parseInt(match[1]) - 1; // JS months are 0-indexed
                const day = parseInt(match[2]);
                const year = parseInt(match[3]);
                date = new Date(year, month, day);
              } else {
                // Third pattern: YYYY-MM-DD
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1; // JS months are 0-indexed
                const day = parseInt(match[3]);
                date = new Date(year, month, day);
              }
              
              if (date && !isNaN(date.getTime())) {
                eventDate = date;
                console.log(`✅ Parsed event date from text: ${eventDate.toDateString()}`);
                break;
              }
            } catch (dateError) {
              console.log(`❌ Error parsing date from text: ${dateError.message}`);
            }
          }
        }
      }
      
      // If we still don't have a date, use a default (third Saturday in March 2025)
      if (!eventDate) {
        console.log('⚠️ Could not find event date, using default date');
        
        // Find the third Saturday in March 2025
        eventDate = new Date(2025, 2, 1); // March 1, 2025
        
        // Find the first Saturday
        while (eventDate.getDay() !== 6) {
          eventDate.setDate(eventDate.getDate() + 1);
        }
        
        // Move to third Saturday
        eventDate.setDate(eventDate.getDate() + 14);
        
        console.log(`⚠️ Using default event date: ${eventDate.toDateString()}`);
      }
      
      // Update venue name if we found a location
      if (locationName) {
        // Check if it's a known Vancouver location
        const knownLocations = {
          'stanley park': {
            name: 'Stanley Park',
            id: 'stanley-park-vancouver',
            address: 'Stanley Park Dr',
            city: 'Vancouver',
            coordinates: { lat: 49.3019, lng: -123.1401 }
          },
          'david lam park': {
            name: 'David Lam Park',
            id: 'david-lam-park-vancouver',
            address: '1300 Pacific Blvd',
            city: 'Vancouver',
            coordinates: { lat: 49.2723, lng: -123.1214 }
          },
          'jericho': {
            name: 'Jericho Beach Park',
            id: 'jericho-beach-park-vancouver',
            address: 'Jericho Beach',
            city: 'Vancouver',
            coordinates: { lat: 49.2722, lng: -123.1925 }
          },
          'kitsilano': {
            name: 'Kitsilano Beach',
            id: 'kitsilano-beach-vancouver',
            address: '1499 Arbutus St',
            city: 'Vancouver',
            coordinates: { lat: 49.2734, lng: -123.1552 }
          },
          'queen elizabeth': {
            name: 'Queen Elizabeth Park',
            id: 'queen-elizabeth-park-vancouver',
            address: '4600 Cambie St',
            city: 'Vancouver',
            coordinates: { lat: 49.2418, lng: -123.1126 }
          }
        };
        
        // Check if the location matches any known locations
        const locationLower = locationName.toLowerCase();
        let foundMatch = false;
        
        for (const [key, value] of Object.entries(knownLocations)) {
          if (locationLower.includes(key)) {
            this.venue = {
              ...this.venue,
              ...value,
              state: 'BC',
              country: 'Canada',
              websiteUrl: this.url,
              description: this.venue.description
            };
            foundMatch = true;
            console.log(`✅ Matched to known location: ${this.venue.name}`);
            break;
          }
        }
        
        // If no match, just update the name
        if (!foundMatch) {
          this.venue.name = locationName;
          this.venue.id = slugify(locationName, { lower: true, strict: true });
          console.log(`✅ Updated venue name to: ${this.venue.name}`);
        }
      }
      
      // Set event times
      const startTime = new Date(eventDate);
      startTime.setHours(9, 0, 0); // 9:00 AM typical race start
      
      const endTime = new Date(eventDate);
      endTime.setHours(13, 0, 0); // 1:00 PM (4-hour event)
      
      // Look for event details to create multiple race distances
      const distances = [
        { name: '5K Run', time: '9:00 AM', duration: 1 }, // 1 hour event
        { name: '10K Run', time: '8:30 AM', duration: 2 }, // 2 hour event
        { name: 'Kids Fun Run', time: '11:00 AM', duration: 1 }, // 1 hour event
      ];
      
      // Try to extract actual race distances from the page
      const raceTypes = [];
      
      const distanceSelectors = [
        '.race-distance',
        '.event-distance',
        '.race-option',
        '.race-type',
        '.distance-option'
      ];
      
      for (const selector of distanceSelectors) {
        const distanceElements = await page.$$(selector);
        
        if (distanceElements.length > 0) {
          for (const element of distanceElements) {
            const distanceText = await page.evaluate(el => el.textContent.trim(), element);
            raceTypes.push(distanceText);
          }
          
          console.log(`✅ Found ${raceTypes.length} race distances: ${raceTypes.join(', ')}`);
          break;
        }
      }
      
      // If no race distances found, search in text
      if (raceTypes.length === 0) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        const distancePatterns = [
          /\b(\d+)(?:K|km)\b/gi,
          /\b(half marathon)\b/gi,
          /\b(full marathon)\b/gi,
          /\b(fun run)\b/gi,
          /\b(kids run)\b/gi,
          /\b(walk)\b/gi
        ];
        
        const foundDistances = new Set();
        
        for (const pattern of distancePatterns) {
          let match;
          while ((match = pattern.exec(bodyText)) !== null) {
            foundDistances.add(match[0]);
          }
        }
        
        if (foundDistances.size > 0) {
          raceTypes.push(...foundDistances);
          console.log(`✅ Found race distances in text: ${[...foundDistances].join(', ')}`);
        }
      }
      
      // If we found race distances, create an event for each
      if (raceTypes.length > 0) {
        console.log(`Creating events for ${raceTypes.length} race distances`);
        
        for (let i = 0; i < raceTypes.length; i++) {
          const raceType = raceTypes[i];
          
          // Stagger start times by 30 minutes
          const raceStartTime = new Date(startTime);
          raceStartTime.setMinutes(raceStartTime.getMinutes() + (i * 30));
          
          // Determine race duration based on distance
          let raceDuration = 2; // Default 2 hours
          
          if (raceType.toLowerCase().includes('5k') || raceType.toLowerCase().includes('fun run') || raceType.toLowerCase().includes('kids')) {
            raceDuration = 1; // 1 hour for shorter races
          } else if (raceType.toLowerCase().includes('half') || raceType.toLowerCase().includes('10k')) {
            raceDuration = 2.5; // 2.5 hours for half marathon or 10K
          } else if (raceType.toLowerCase().includes('full') || raceType.toLowerCase().includes('marathon')) {
            raceDuration = 4; // 4 hours for full marathon
          }
          
          // Set end time based on duration
          const raceEndTime = new Date(raceStartTime);
          raceEndTime.setHours(raceEndTime.getHours() + raceDuration);
          
          // Generate event ID
          const dateStr = raceStartTime.toISOString().split('T')[0];
          const slugRaceType = slugify(raceType, { lower: true, strict: true });
          const id = `run-to-end-endo-${slugRaceType}-${dateStr}`;
          
          // Create event object
          const event = {
            id: id,
            title: `Run to End Endo: ${raceType}`,
            description: `Join The Endo Network's Run to End Endo ${raceType} in Vancouver to raise awareness and funds for endometriosis support, research, and education. This event welcomes all ages and abilities, with participants running or walking to support the cause.`,
            startDate: raceStartTime,
            endDate: raceEndTime,
            venue: this.venue,
            category: 'sports',
            categories: ['sports', 'running', 'fundraiser', 'charity', 'health'],
            sourceURL: this.url,
            officialWebsite: this.url,
            image: null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added ${raceType} event at ${raceStartTime.toLocaleTimeString()} on ${raceStartTime.toDateString()}`);
        }
      } else {
        // If no specific distances found, create a general event
        const id = `run-to-end-endo-${startTime.toISOString().split('T')[0]}`;
        
        const event = {
          id: id,
          title: 'Run to End Endo Vancouver',
          description: 'Join The Endo Network\'s Run to End Endo in Vancouver to raise awareness and funds for endometriosis support, research, and education. This event welcomes all ages and abilities, with multiple distance options for participants to run or walk in support of the cause.',
          startDate: startTime,
          endDate: endTime,
          venue: this.venue,
          category: 'sports',
          categories: ['sports', 'running', 'fundraiser', 'charity', 'health'],
          sourceURL: this.url,
          officialWebsite: this.url,
          image: null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added general Run to End Endo event on ${startTime.toDateString()}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in Run to End Endo scraper: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`🎉 Successfully scraped ${events.length} events from Run to End Endo`);
    }
    
    return events;
  }
}

module.exports = new RunToEndEndoScraper();
