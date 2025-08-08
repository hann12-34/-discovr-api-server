findEventPatternsInText(text) {
    const events = [];

    // Look for patterns like "Event Title - July 5th, 2024" or "July 5th - Event Title"
    const patterns = [
      // "Event Title - July 5, 2024" or "Event Title - July 5"
      /([^-\n]+)\s*-\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}/gi,

      // "July 5, 2024 - Event Title" or "July 5 - Event Title"
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}\s*-\s*([^-\n]+)/gi,

      // "Event Title | July 5, 2024" or "Event Title | July 5"
      /([^|\n]+)\s*\|\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}/gi,

      // Look for DJ names followed by dates
      /DJ\s+([A-Za-z\s]+).*?(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}/gi
    ];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
        // Extract title and date based on pattern
        let title, date;

        if (pattern.source.startsWith('([^-')) {
          // Title first patterns
          title = match[1].trim();
          date = match[2] + match[0].substring(match[1].length + match[2].length + 1);
        } else if (pattern.source.startsWith('(January|February')) {
          // Date first patterns
          date = match[1] + match[0].substring(0, match[0].indexOf('-')).substring(match[1].length);
          title = match[2].trim();
        } else if (pattern.source.startsWith('([^|')) {
          // Title first with pipe separator
          title = match[1].trim();
          date = match[2] + match[0].substring(match[1].length + match[2].length + 1);
        } else if (pattern.source.startsWith('DJ')) {
          // DJ pattern
          title = `DJ ${match[1].trim()}`;
          date = match[2] + match[0].substring(match[0].indexOf(match[2])).substring(match[2].length);
        }

        events.push({
          title,
          date,
          description: `${title} performing at ${this.name}`
        };
      }
    }

    return events;
  }

  /**
   * Parse event date from string
   */
  parseEventDate(dateText) {
    if (!dateText) return null;

    try {
      // Clean up the date string
      dateText = dateText.trim().replace(/\s+/g, ' ');

      // Handle various date formats
      let startDate;
      let endDate;

      // Format: "July 10, 2024" or "July 10 2024"
      const fullDateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?,?\s+(\d{4}/i);
      if (fullDateMatch) {
        const month = this.getMonthNumber(fullDateMatch[1]);
        const day = parseInt(fullDateMatch[2]);
        const year = parseInt(fullDateMatch[3]);
        startDate = new Date(year, month, day);
      }

      // Format: "July 10" (no year specified)
      const partialDateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?/i);
      if (!startDate && partialDateMatch) {
        const month = this.getMonthNumber(partialDateMatch[1]);
        const day = parseInt(partialDateMatch[2]);
        const year = new Date().getFullYear(); // Current year
        startDate = new Date(year, month, day);
      }

      // Format: "MM/DD/YYYY"
      const slashDateMatch = dateText.match(/(\d{1,2}\/(\d{1,2}\/(\d{4}/);
      if (!startDate && slashDateMatch) {
        const month = parseInt(slashDateMatch[1]) - 1; // 0-based month
        const day = parseInt(slashDateMatch[2]);
        const year = parseInt(slashDateMatch[3]);
        startDate = new Date(year, month, day);
      }

      // Look for time in the string
      const timeMatch = dateText.match(/(\d{1,2}(?::(\d{2}?\s*(AM|PM|am|pm)/i);

      if (startDate) {
        // Set default time to 9 PM if not specified
        let hours = 21;
        let minutes = 0;

        // Use extracted time if available
        if (timeMatch) {
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const isPM = timeMatch[3].toLowerCase() === 'pm';

          // Convert to 24-hour format
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }

        startDate.setHours(hours, minutes, 0, 0);

        // Set end time to 2 hours after start time
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);

        return { startDate, endDate };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error parsing event date "${dateText}": ${error.message}`);
      return null;
    }
  }

  /**
   * Get month number from name
   */
  getMonthNumber(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    return months[monthName.toLowerCase()];
  }

  /**
   * Create event object
   */
  createEventObject(id, title, description, startDate, endDate, image, sourceURL) {
    return {
      id,
      title,
      description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      venue: {
        name: this.name,
        id: this.sourceIdentifier,
        address: '110 Davie St',
        city: city,
        state: 'BC',
        country: 'Canada',
        coordinates: {
          lat: 49.2738,
          lng: -123.1131
        },
        websiteUrl: this.url,
        description: 'Hello Goodbye is an underground bar in Yaletown, Vancouver, known for live DJ sets and cocktails.'
      },
      category: 'nightlife',
      categories: ['music', 'nightlife', 'bar', 'entertainment', 'dj'],
      sourceURL,
      officialWebsite: this.url,
      image,
      ticketsRequired: false,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate event ID
   */
  generateEventId(title, date) {
    const da = date.toISOString().split('T')[0];
    const slug = slugify(title.toLowerCase());
    return `${this.sourceIdentifier}-${slug}-${da}`;
  }
}

module.exports = new HelloGoodbyeBarEvents();

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new HelloGoodbyeBarEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.HelloGoodbyeBarEvents = HelloGoodbyeBarEvents;