determineCategory(title) {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('knicks') || titleLower.includes('basketball') || titleLower.includes('nba')) {
            return 'Basketball';
        } else if (titleLower.includes('rangers') || titleLower.includes('hockey') || titleLower.includes('nhl')) {
            return 'Hockey';
        } else if (titleLower.includes('concert') || titleLower.includes('tour') || titleLower.includes('live')) {
            return 'Concert';
        } else if (titleLower.includes('boxing') || titleLower.includes('fight') || titleLower.includes('ufc')) {
            return 'Combat Sports';
        } else if (titleLower.includes('circus') || titleLower.includes('family') || titleLower.includes('show')) {
            return 'Family Entertainment';
        } else if (titleLower.includes('comedy') || titleLower.includes('comedian')) {
            return 'Comedy';
        }

        return 'Event';
    }

}

// Wrapper function for sample runner compatibility
async function scrape(city) {
    const scraper = new MadisonSquareGarden();
    return await scraper.scrape(city);
}

module.exports = { MadisonSquareGarden, scrape };

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new MadisonSquareGarden();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.MadisonSquareGarden = MadisonSquareGarden;