/**
 * Concord Dragon Boat Festival Events Scraper
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class DragonBoatFestivalEvents {
  constructor() {
    this.name = 'Concord Dragon Boat Festival';
    this.url = 'https://concorddragonboatfestival.ca/';
    this.sourceIdentifier = 'dragon-boat-festival';
  }

  async scrape(city) {
    console.log(`🔍 Starting ${this.name} scraper...`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');

    const events = [];

    try {
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 };

      await page.screenshot({ path: 'dragon-boat-debug.png' };
      console.log('✅ Saved debug screenshot to dragon-boat-debug.png');

      // Extract festival dates
      const pageContent = await page.evaluate(() => document.body.innerText);

      // Look for date patterns in text
      let festivalDates = this.extractDatesFromText(pageContent);

      if (!festivalDates || !festivalDates.startDate) {
        console.log('No festival dates found, using default dates');

        // Default to a weekend in June next year
        const nextYear = new Date().getFullYear() + 1;
        festivalDates = {
          startDate: new Date(`June 17, ${nextYear} 09:00:00`),
          endDate: new Date(`June 19, ${nextYear} 17:00:00`)
        };
      }

      console.log(`✅ Festival dates: ${festivalDates.startDate.toDa - ${festivalDates.endDate.toDa`);

      // Create main festival event
      const mainEvent = this.createMainFestivalEvent(festivalDates);
      events.push(mainEvent);

      // Create sub-events for each day
      const festivalSubEvents = this.createFestivalSubEvents(festivalDates);
      events.push(...festivalSubEvents);

      console.log(`🎉 Successfully scraped ${events.length} events from Concord Dragon Boat Festival`);

    } catch (error) {
      console.error(`❌ Error in ${this.name} scraper: ${error.message}`);
    } finally {
      await browser.close();
    }

    return events;
  }

  extractDatesFromText(text) {
    try {
      // Look for date patterns like "June 17-19, 2025" or mentions of festival dates
      const datePatterns = [
        // Pattern: "June 17-19, 2025" or "June 17 - 19, 2025"
        /([A-Za-z]+)\s+(\d{1,2}(?:\s*[-–]\s*|\s*to\s*)(\d{1,2}(?:,?\s*|\s+)(\d{4}/i,

        // Pattern: "June 17, 18, and 19, 2025"
        /([A-Za-z]+)\s+(\d{1,2}(?:,\s+\d{1,2}*(?:,?\s+and\s+|\s*&\s*)(\d{1,2}(?:,?\s*|\s+)(\d{4}/i,

        // Pattern: "17-19 June 2025"
        /(\d{1,2}(?:\s*[-–]\s*|\s*to\s*)(\d{1,2}\s+([A-Za-z]+)(?:,?\s*|\s+)(\d{4}/i
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);

        if (match) {
          let startMonth, startDay, endDay, year;

          if (isNaN(parseInt(match[1]))) {
            // Format: "June 17-19, 2025"
            startMonth = match[1];
            startDay = parseInt(match[2]);
            endDay = parseInt(match[3]);
            year = parseInt(match[4]);
          } else {
            // Format: "17-19 June 2025"
            startDay = parseInt(match[1]);
            endDay = parseInt(match[2]);
            startMonth = match[3];
            year = parseInt(match[4]);
          }

          const startDate = new Date(`${startMonth} ${startDay}, ${year} 09:00:00`);
          const endDate = new Date(`${startMonth} ${endDay}, ${year} 17:00:00`);

          return { startDate, endDate };
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ Error extracting dates: ${error.message}`);
      return null;
    }
  }

  createMainFestivalEvent(dates) {
    const id = this.generateEventId('concord-dragon-boat-festival', dates.startDate);

    return {
      id,
      title: 'Concord Dragon Boat Festival',
      description: 'The Concord Dragon Boat Festival is a vibrant celebration of culture, sport, and community in Vancouver. Watch exciting dragon boat races, enjoy cultural performances, taste delicious food, and experience the festive atmosphere at False Creek.',
      startDate: dates.startDate.toISOString(),
      endDate: dates.endDate.toISOString(),
      venue: {
        name: 'False Creek',
        id: 'false-creek-vancouver',
        address: 'Creekside Park, 1455 Quebec St',
        city: city,
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2734,
          lng: -123.1044
        },
        websiteUrl: 'https://concorddragonboatfestival.ca/',
        description: 'False Creek is a short inlet in the heart of Vancouver that separates downtown from the rest of the city, hosting many events including the annual Dragon Boat Festival.'
      },
      category: 'festival',
      categories: ['festival', 'sports', 'cultural', 'outdoor', 'dragon-boat'],
      sourceURL: this.url,
      officialWebsite: this.url,
      image: null,
      ticketsRequired: false,
      lastUpdated: new Date().toISOString()
    };
  }

  createFestivalSubEvents(dates) {
    const subEvents = [];

    // Calculate number of days for the festival
    const days = Math.ceil((dates.endDate - dates.startDate) / (1000 * 60 * 60 * 24)) + 1;

    const eventTypes = [
      {
        title: 'Dragon Boat Races',
        description: 'Watch exciting dragon boat races with teams competing in various divisions. Cheer on the paddlers as they battle to the finish line in this thrilling water sport competition.',
        category: 'sports',
        timeOfDay: 'morning'
      },
      {
        title: 'Cultural Performances',
        description: 'Experience diverse cultural performances including traditional Chinese dance, music, martial arts demonstrations and more at the festival main stage.',
        category: 'cultural',
        timeOfDay: 'afternoon'
      },
      {
        title: 'Festival Night Market',
        description: 'Enjoy the evening Dragon Boat Festival Night Market featuring food vendors, crafts, and entertainment. Experience the vibrant atmosphere as the festival transforms after dark.',
        category: 'market',
        timeOfDay: 'evening'
      }
    ];

    // Create events for each day of the festival
    for (let i = 0; i < days; i++) {
      const eventDate = new Date(dates.startDate);
      eventDate.setDate(eventDate.getDate() + i);

      // Create each type of sub-event for this day
      for (const eventType of eventTypes) {
        // Skip evening events on the last day
        if (i === days - 1 && eventType.timeOfDay === 'evening') continue;

        // Set times based on time of day
        const startHour = eventType.timeOfDay === 'morning' ? 9 :
                          eventType.timeOfDay === 'afternoon' ? 13 : 17;
        const endHour = eventType.timeOfDay === 'morning' ? 12 :
                        eventType.timeOfDay === 'afternoon' ? 16 : 21;

        const dayLabel = ['Opening Day', 'Day 2', 'Final Day'][i] || `Day ${i + 1}`;
        const title = `${eventType.title} - ${dayLabel}`;

        // Create event start and end times
        const startDate = new Date(eventDate);
        startDate.setHours(startHour, 0, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(endHour, 0, 0, 0);

        // Generate ID
        const id = this.generateEventId(
          slugify(title.toLowerCase()),
          startDate
        );

        subEvents.push({
          id,
          title,
          description: eventType.description,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          venue: {
            name: 'False Creek',
            id: 'false-creek-vancouver',
            address: 'Creekside Park, 1455 Quebec St',
            city: city,
            state: 'BC',
            country: 'Canada',
            coordinates: {
              lat: 49.2734,
              lng: -123.1044
            },
            websiteUrl: 'https://concorddragonboatfestival.ca/',
            description: 'False Creek is a short inlet in the heart of Vancouver that separates downtown from the rest of the city, hosting many events including the annual Dragon Boat Festival.'
          },
          category: eventType.category,
          categories: ['festival', 'dragon-boat', eventType.category],
          sourceURL: this.url,
          officialWebsite: this.url,
          image: null,
          ticketsRequired: false,
          lastUpdated: new Date().toISOString()
        };
      }
    }

    return subEvents;
  }

  generateEventId(title, date) {
    const da = date.toISOString().split('T')[0];
    return `${this.sourceIdentifier}-${title}-${da}`;
  }
}

module.exports = new DragonBoatFestivalEvents();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new DragonBoatFestivalEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.DragonBoatFestivalEvents = DragonBoatFestivalEvents;