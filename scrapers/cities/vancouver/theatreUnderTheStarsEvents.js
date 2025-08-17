const puppeteer = require('puppeteer');
const slugify = require('slugify');

class TheatreUnderTheStarsEvents {
  constructor() {
    this.name = 'Theatre Under The Stars Events';
    this.url = 'https://tuts.ca/shows/';
    this.venue = {
      name: 'Theatre Under The Stars',
      address: 'Malkin Bowl, Queen Elizabeth Theatre, Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2610, lng: -123.1435 }
    };
  }

  async scrape() {
    console.log(`Starting ${this.name} scraper...`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });

      console.log('Extracting Theatre Under The Stars events...');
      const events = await this.extractEvents(page);

      await browser.close();
      console.log(`Found ${events.length} Theatre Under The Stars events`);
      return events;
    } catch (error) {
      console.error(`Error scraping Theatre Under The Stars events: ${error.message}`);
      await browser.close();
      return [];
    }
  }

  /**
   * Extract events from the page
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('.show, .event, .production', { timeout: 10000 })
      .catch(() => {
        console.log('Primary event selectors not found, trying alternative selectors');
      });

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      const eventCards = document.querySelectorAll('.show, .event, .production, article');
      const extractedEvents = [];

      if (!eventCards || eventCards.length === 0) {
        console.log('No event cards found');
        return extractedEvents;
      }

      eventCards.forEach(card => {
        try {
          // Extract basic event info
          const titleElement = card.querySelector('h1, h2, h3, .title, .show-title');
          const title = titleElement ? titleElement.innerText.trim() : 'Theatre Under The Stars Show';

          // Extract date information
          const dateElement = card.querySelector('.date, .dates, .run-dates, time');
          let dateText = dateElement ? dateElement.innerText.trim() : '';
          if (!dateText && dateElement && dateElement.getAttribute('datetime')) {
            dateText = dateElement.getAttribute('datetime');
          }

          // Extract description
          const descElement = card.querySelector('.description, .summary, .excerpt, p');
          const description = descElement ? descElement.innerText.trim() : '';

          // Extract image
          const imageElement = card.querySelector('img');
          const image = imageElement ? imageElement.src : '';

          // Extract link
          const linkElement = card.querySelector('a');
          const link = linkElement ? linkElement.href : '';

          // Add event to array
          extractedEvents.push({
            title,
            dateText,
            description,
            image,
            link,
            venue: venueInfo
          });
        } catch (error) {
          console.log(`Error extracting event: ${error.message}`);
        }
      });

      return extractedEvents;
    }, this.venue);

    // Process dates and create final event objects
    return Promise.all(events.map(async event => {
      const { startDate, endDate } = this.parseDates(event.dateText);

      // Generate a unique ID based on title and date
      const uniqueId = slugify(`${event.title}-${startDate.toISOString().split('T')[0]}`, {
        lower: true,
        strict: true
      });

      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: this.venue,
        categories: ['Theatre', 'Performing Arts', 'Entertainment'],
        sourceURL: event.link || this.url,
        lastUpdated: new Date()
      };
    }));
  }

  /**
   * Parse date strings and return start and end dates
   */
  parseDates(dateText) {
    if (!dateText) {
      // Default to summer dates for Theatre Under The Stars if no date is found
      // They typically perform in summer months (July-August)
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(`July 1, ${currentYear}`);
      const defaultEnd = new Date(`August 31, ${currentYear}`);
      return { startDate: defaultStart, endDate: defaultEnd };
    }

    try {
      // Look for date ranges like "July 5 - August 25, 2025"
      const dateRangePattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\s*[-–]\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})(?:,?\s*(\d{4}))?/i;
      const match = dateText.match(dateRangePattern);

      if (match) {
        const currentYear = new Date().getFullYear();
        const year = match[3] ? parseInt(match[3]) : currentYear;

        const startDateText = `${match[1]}, ${year}`;
        const endDateText = `${match[2]}, ${year}`;

        const startDate = new Date(startDateText);
        const endDate = new Date(endDateText);

        // Default show time for theatre performances if no specific time is found
        startDate.setHours(19, 30); // 7:30 PM typical show time
        endDate.setHours(22, 0); // End time approximately

        return { startDate, endDate };
      }

      // Look for season information like "Summer 2025" or "July 2025"
      const seasonPattern = /(summer|winter|fall|autumn|spring|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\s+(\d{4})/i;
      const seasonMatch = dateText.match(seasonPattern);

      if (seasonMatch) {
        const season = seasonMatch[1].toLowerCase();
        const year = parseInt(seasonMatch[2]);

        let startDate, endDate;

        if (season === 'summer') {
          startDate = new Date(`June 21, ${year}`);
          endDate = new Date(`September 21, ${year}`);
        } else if (season === 'winter') {
          startDate = new Date(`December 21, ${year}`);
          endDate = new Date(`March 20, ${year + 1}`);
        } else if (season === 'fall' || season === 'autumn') {
          startDate = new Date(`September 22, ${year}`);
          endDate = new Date(`December 20, ${year}`);
        } else if (season === 'spring') {
          startDate = new Date(`March 21, ${year}`);
          endDate = new Date(`June 20, ${year}`);
        } else {
          // It's a month name
          const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };

          const monthKey = season.substring(0, 3).toLowerCase();
          const monthIndex = monthMap[monthKey];

          startDate = new Date(year, monthIndex, 1);
          endDate = new Date(year, monthIndex + 1, 0); // Last day of the month
        }

        return { startDate, endDate };
      }

      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        // If it's a single date, assume it's a one-day event
        return { startDate: date, endDate: new Date(date.getTime() + 3 * 60 * 60 * 1000) }; // Add 3 hours for end time
      }

      // If all else fails, use summer dates as Theatre Under The Stars typically runs in summer
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(`July 1, ${currentYear}`);
      const defaultEnd = new Date(`August 31, ${currentYear}`);
      return { startDate: defaultStart, endDate: defaultEnd };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const currentYear = new Date().getFullYear();
      const defaultStart = new Date(`July 1, ${currentYear}`);
      const defaultEnd = new Date(`August 31, ${currentYear}`);
      return { startDate: defaultStart, endDate: defaultEnd };
    }
  }
}

module.exports = new TheatreUnderTheStarsEvents();

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new TheatreUnderTheStarsEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.TheatreUnderTheStarsEvents = TheatreUnderTheStarsEvents;