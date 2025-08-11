const getCityFromArgs = () => {
  const cityArg = process.argv.find(arg => arg && arg.startsWith('--city='));
  if (!cityArg) {
    throw new Error('CRITICAL: --city argument is required. No fallbacks allowed.');
  }
  return cityArg.split('=')[1];
};

const generateEventId = (title, venueName, startDate) => {
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const venueSlug = venueName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const dateSlug = startDate instanceof Date ? startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  return `${titleSlug}-${venueSlug}-${dateSlug}`;
};

const extractCategories = (categoryText) => {
  if (!categoryText) return ['General'];
  return categoryText.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);
};

const extractPrice = (priceText) => {
  if (!priceText) return 'Free';
  if (priceText.toLowerCase().includes('free')) return 'Free';
  const match = priceText.match(/\$\d+/);
  return match ? match[0] : 'Varies';
};

const parseDateText = (dateText) => {
  if (!dateText) {
    return { startDate: new Date(), endDate: new Date() };
  }
  
  // Simple date parsing - can be enhanced later
  const now = new Date();
  const cleanText = dateText.toLowerCase().trim();
  
  // Look for year patterns
  const yearMatch = cleanText.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : now.getFullYear();
  
  // Look for month names
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                  'july', 'august', 'september', 'october', 'november', 'december'];
  let month = now.getMonth();
  for (let i = 0; i < months.length; i++) {
    if (cleanText.includes(months[i])) {
      month = i;
      break;
    }
  }
  
  // Look for day numbers
  const dayMatch = cleanText.match(/\b(\d{1,2})\b/);
  const day = dayMatch ? parseInt(dayMatch[1]) : 1;
  
  const startDate = new Date(year, month, day);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1); // Default to next day
  
  return { startDate, endDate };
};

module.exports = { 
  getCityFromArgs, 
  generateEventId, 
  extractCategories, 
  extractPrice, 
  parseDateText 
};
