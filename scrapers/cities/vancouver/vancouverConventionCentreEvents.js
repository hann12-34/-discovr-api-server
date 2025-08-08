determineCategories(title) {
    const categories = ['Conference', 'Event'];
    const lowercaseTitle = title.toLowerCase();

    // Conference types
    if (lowercaseTitle.includes('conference') || lowercaseTitle.includes('convention')) {
      categories.push('Business');
    }

    // Entertainment/Performance
    if (lowercaseTitle.includes('performance') || lowercaseTitle.includes('symphony') ||
        lowercaseTitle.includes('concert') || lowercaseTitle.includes('music')) {
      categories.push('Entertainment');
      categories.push('Performance');
    }

    // Educational
    if (lowercaseTitle.includes('lecture') || lowercaseTitle.includes('seminar') ||
        lowercaseTitle.includes('workshop') || lowercaseTitle.includes('education')) {
      categories.push('Educational');
    }

    // Exhibition
    if (lowercaseTitle.includes('exhibition') || lowercaseTitle.includes('showcase') ||
        lowercaseTitle.includes('expo') || lowercaseTitle.includes('fair')) {
      categories.push('Exhibition');
    }

    // Community
    if (lowercaseTitle.includes('community') || lowercaseTitle.includes('festival') ||
        lowercaseTitle.includes('celebration')) {
      categories.push('Community');
      categories.push('Festival');
    }

    // Technology
    if (lowercaseTitle.includes('tech') || lowercaseTitle.includes('technology') ||
        lowercaseTitle.includes('machine learning') || lowercaseTitle.includes('ai') ||
        lowercaseTitle.includes('digital')) {
      categories.push('Technology');
    }

    // Science
    if (lowercaseTitle.includes('science') || lowercaseTitle.includes('research') ||
        lowercaseTitle.includes('academic')) {
      categories.push('Science');
    }

    // Health
    if (lowercaseTitle.includes('health') || lowercaseTitle.includes('medical') ||
        lowercaseTitle.includes('wellness')) {
      categories.push('Health');
    }

    // Food and Drink
    if (lowercaseTitle.includes('food') || lowercaseTitle.includes('culinary') ||
        lowercaseTitle.includes('wine') || lowercaseTitle.includes('tasting')) {
      categories.push('Food and Drink');
    }

    return categories;
  }

  /**
   * Normalize a title for comparison (to avoid duplicates with slight variations)
   * @param {string} title - Raw title
   * @returns {string} Normalized title
   */
  normalizeTitle(title) {
    if (!title) return '';

    // Convert to lowercase
    let normalized = title.toLowerCase();

    // Remove special characters and extra spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove common words that don't add meaning
    const commonWords = ['the', 'and', 'at', 'in', 'on', 'of', 'for', 'a', 'an', 'with'];
    let words = normalized.split(' ');
    words = words.filter(word => !commonWords.includes(word));

    return words.join(' ');
  }
}

module.exports = VancouverConventionCentreEvents;

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new VancouverConventionCentreEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.VancouverConventionCentreEvents = VancouverConventionCentreEvents;