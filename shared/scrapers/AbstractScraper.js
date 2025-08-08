class AbstractScraper {
  constructor() {
    if (this.constructor === AbstractScraper) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  log(message) {
    console.log(`[${this.constructor.name}] ${message}`);
  }

  async scrape() {
    throw new Error("Method 'scrape()' must be implemented.");
  }
}

module.exports = AbstractScraper;
