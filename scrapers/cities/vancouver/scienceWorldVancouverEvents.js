/**
 * Science World Vancouver Events Scraper
 * Scrapes events from Science World Vancouver's website
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class ScienceWorldVancouverEvents {
  constructor() {
    this.name = 'Science World Vancouver Events';
    this.url = 'https://www.scienceworld.ca/events/';
    this.venue = {
      name: 'Science World Vancouver',
      address: '1455 Quebec St, Vancouver, BC V6A 3Z7',
      city: city,
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2734, lng: -123.1034 }
    };
  }

  /**
   * Scrape events from Science World Vancouver
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape(city) {
    console.log(`Starting ${this.name} scraper...`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set default timeout
    await page.setDefaultNavigationTimeout(30000);

    try {
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' };

      console.log('Extracting Science World Vancouver events...');
      const events = await this.extractEvents(page);
      console.log(`Found ${events.length} Science World Vancouver events`);

      return events;
    } catch (error) {
      console.error(`Error in ${this.name} scraper:`, error);
      return [];
    } finally {
      await browser.close();
      console.log(`${this.name} scraper finished`);
    }
  }

  /**
   * Extract events from Science World Vancouver website
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of event objects
   */
  async extractEvents(page) {
    // Wait for event containers to load
    await page.waitForSelector('-card', { timeout: 10000 }.catch(() => {
      console.log('Event cards not found, using alternative selector');
    };

    // Extract events
    const events = await page.evaluate((venueInfo) => {
      const eventCards = document.querySelectorAll('-card, -item, article');
      const extractedEvents = [];

      if (!eventCards || eventCards.length === 0) {
        console.log('No event cards found');
        return extractedEvents;
      }

      eventCards.forEach(card => {
        try {
          // Extract basic event info
          const titleElement = card.querySelector('-title, h2, h3, .title');
          const title = titleElement ? titleElement.innerText.trim() : 'Untitled Event';

          // Extract date information
          const dateElement = card.querySelector('-date, .date, time');
          let dateText = dateElement ? dateElement.innerText.trim() : '';
          if (!dateText && dateElement && dateElement.getAttribute('datetime')) {
            dateText = dateElement.getAttribute('datetime');
          }

          // Extract description
          const descElement = card.querySelector('-description, .description, .excerpt, .summary');
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
          };
        } catch (error) {
          console.log(`Error extracting event: ${error.message}`);
        }
      };

      return extractedEvents;
    }, this.venue);

    // Process dates and create final event objects
    return Promise.all(events.map(async event => {
      const { startDate, endDate } = this.parseDates(event.dateText);

      // Generate a unique ID based on title and date
      const uniqueId = slugify(`${event.title}-${startDate.toISOString().split('T')[0]}`, {
        lower: true,
        strict: true
      };

      return {
        id: uniqueId,
        title: event.title,
        description: event.description,
        startDate,
        endDate,
        image: event.image,
        venue: this.venue,
        categories: ['Science', 'Education', 'Family'],
        sourceURL: event.link || this.url,
        lastUpdated: new Date()
      };
    };
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    if (!dateText) {
      // Default to current date if no date text is available
      const today = new Date();
      return { startDate: today, endDate: today };
    }

    try {
      // Look for various date patterns
      const datePattern = /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*\w+\s+\d{1,2}(?:st|nd|rd|th)?)?(?:\s*,\s*\d{4}?)/i;
      const timePattern = /(\d{1,2}:\d{2}(?:\s*[ap]m)?(?:\s*[-–]\s*\d{1,2}:\d{2}(?:\s*[ap]m)?)?)/i;

      const dateMatch = dateText.match(datePattern);
      const timeMatch = dateText.match(timePattern);

      const currentYear = new Date().getFullYear();
      let startDate = new Date();
      let endDate = null;

      if (dateMatch) {
        const dateParts = dateMatch[1].split(/[-–]/);
        const startDateText = dateParts[0].trim();

        // Check if year is present, if not add current year
        const startDateWithYear = startDateText.includes(currentYear.toString())
          ? startDateText
          : `${startDateText}, ${currentYear}`;

        startDate = new Date(Date.parse(startDateWithYear));

        if (dateParts.length > 1) {
          const endDateText = dateParts[1].trim();
          const endDateWithYear = endDateText.includes(currentYear.toString())
            ? endDateText
            : `${endDateText}, ${currentYear}`;

          endDate = new Date(Date.parse(endDateWithYear));
        } else {
          endDate = new Date(startDate);
        }

        // If we have time info, update the hours and minutes
        if (timeMatch) {
          const timeParts = timeMatch[1].split(/[-–]/);
          if (timeParts.length > 0) {
            const startTime = timeParts[0].trim();
            const [hours, minutes] = startTime.replace(/[apm]/gi, '').split(':').map(Number);
            const isPM = /pm/i.test(startTime);

            startDate.setHours(isPM && hours < 12 ? hours + 12 : hours);
            startDate.setMinutes(minutes);

            if (timeParts.length > 1) {
              const endTime = timeParts[1].trim();
              const [endHours, endMinutes] = endTime.replace(/[apm]/gi, '').split(':').map(Number);
              const isEndPM = /pm/i.test(endTime);

              if (!endDate) endDate = new Date(startDate);
              endDate.setHours(isEndPM && endHours < 12 ? endHours + 12 : endHours);
              endDate.setMinutes(endMinutes);
            }
          }
        }
      } else {

        const parsedDate = Date.parse(dateText);
        if (!isNaN(parsedDate)) {
          startDate = new Date(parsedDate);
          endDate = new Date(parsedDate);
        }
      }

      // If we couldn't parse a valid date, use the current date
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
        endDate = new Date();
      }

      // If no end date was found, set it to the same as the start date
      if (!endDate || isNaN(endDate.getTime())) {
        endDate = new Date(startDate);
      }

      return { startDate, endDate };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      return { startDate: today, endDate: today };
    }
  }
}

module.exports = new ScienceWorldVancouverEvents();

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new ScienceWorldVancouverEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.ScienceWorldVancouverEvents = ScienceWorldVancouverEvents;