determineCategories(title) {
    const lowerTitle = title.toLowerCase();

    // Default category is Entertainment
    const categories = ['Entertainment'];

    // Check for buy now or ticket buttons that slipped through filtering
    if (lowerTitle === 'buy now' || lowerTitle === 'buy tickets' || lowerTitle === 'tickets') {
      return ['Invalid'];
    }

    if (lowerTitle.includes('concert') ||
        lowerTitle.includes('music') ||
        lowerTitle.includes('band') ||
        lowerTitle.includes('tour') ||
        lowerTitle.includes('live') ||
        lowerTitle.includes('singer')) {
      categories.push('Music');
      categories.push('Concert');
    }

    if (lowerTitle.includes('hockey') ||
        lowerTitle.includes('canucks') ||
        lowerTitle.includes('nhl')) {
      categories.push('Sports');
      categories.push('Hockey');
    }

    if (lowerTitle.includes('basketball') ||
        lowerTitle.includes('wnba') ||
        lowerTitle.includes('nba')) {
      categories.push('Sports');
      categories.push('Basketball');
    }

    if (lowerTitle.includes('comedy') ||
        lowerTitle.includes('comedian')) {
      categories.push('Comedy');
    }

    if (lowerTitle.includes('family') ||
        lowerTitle.includes('kids') ||
        lowerTitle.includes('children')) {
      categories.push('Family');
    }

    return categories;
  }

  /**
   * Parse dates from text
   * @param {string} dateText - Text containing date information
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateText) {
    if (!dateText || dateText === 'Date TBA') {
      // For TBA dates, set to a future date (6 months ahead) to avoid immediate expiration
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      return { startDate: futureDate, endDate: new Date(futureDate.getTime() + 3 * 60 * 60 * 1000) };
    }

    try {
      // Rogers Arena typically uses format like "August 4 @ 7:30 pm"
      // First, look for this specific format
      const arenaPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2}\s*@\s*(\d{1,2}(?::(\d{2}?\s*(am|pm)/i;
      const arenaMatch = dateText.match(arenaPattern);

      if (arenaMatch) {
        const monthStr = arenaMatch[1].toLowerCase();
        const day = parseInt(arenaMatch[2]);
        const year = new Date().getFullYear(); // Use current year as it's not in the pattern

        let hours = parseInt(arenaMatch[3]);
        const minutes = arenaMatch[4] ? parseInt(arenaMatch[4]) : 0;
        const isPM = arenaMatch[5].toLowerCase() === 'pm';

        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        const startDate = new Date(year, monthMap[monthStr], day, hours, minutes);

        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

        return { startDate, endDate };
      }

      // Look for variations of the Rogers Arena format
      const monthDayAtTimePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2}.*?(\d{1,2}(?::(\d{2}?\s*(am|pm)/i;
      const mdatMatch = dateText.match(monthDayAtTimePattern);

      if (mdatMatch) {
        const monthStr = mdatMatch[1].toLowerCase();
        const day = parseInt(mdatMatch[2]);
        const year = new Date().getFullYear(); // Use current year as it's not in the pattern

        let hours = parseInt(mdatMatch[3]);
        const minutes = mdatMatch[4] ? parseInt(mdatMatch[4]) : 0;
        const isPM = mdatMatch[5].toLowerCase() === 'pm';

        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        const startDate = new Date(year, monthMap[monthStr], day, hours, minutes);

        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

        return { startDate, endDate };
      }

      // Look for just month and day without time
      const monthDayPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2}(?:st|nd|rd|th)?(?:,? (\d{4}?/i;
      const monthDayMatch = dateText.match(monthDayPattern);

      if (monthDayMatch) {
        const monthStr = monthDayMatch[1].toLowerCase();
        const day = parseInt(monthDayMatch[2]);
        const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();

        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        // Default arena events to 7:00 PM
        const startDate = new Date(year, monthMap[monthStr], day, 19, 0);

        // Events typically last 3 hours
        const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

        return { startDate, endDate };
      }

      // If all else fails, use current date
      console.log(`Could not parse date: ${dateText}`);
      const today = new Date();
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    } catch (error) {
      console.error('Error parsing dates:', error);
      const today = new Date();
      const endDate = new Date(today.getTime() + (3 * 60 * 60 * 1000));
      return { startDate: today, endDate };
    }
  }
}

module.exports = RogersArenaEventsImproved;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new RogersArenaEventsImproved();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.RogersArenaEventsImproved = RogersArenaEventsImproved;