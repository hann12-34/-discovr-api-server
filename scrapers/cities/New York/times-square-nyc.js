isValidEvent(title) {
        if (!title || title.length < 5 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin'
        ];

        const titleLower = title.toLowerCase();
        return !invalidKeywords.some(keyword => titleLower.includes(keyword));
    }

    /**
     * Get venue information
     * @returns {Object} Venue details
     */
    getVenueInfo() {
        return {
            name: this.venueName,
            location: this.venueLocation,
            category: this.category,
            website: this.baseUrl
        };
    }
}

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new TimesSquareNYC();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.TimesSquareNYC = TimesSquareNYC;