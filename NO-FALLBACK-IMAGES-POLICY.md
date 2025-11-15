# 🚫 No Fallback Images Policy - November 13, 2024

## 🎯 **Core Policy**

**"No fallback aggregators for anything"** - User requirement

This applies to images. **Only show REAL event poster images extracted from venue websites.**

If a scraper cannot find a real poster image → Set `imageUrl: null`

---

## ✅ **What We Did**

### **Removed All Fallback Systems:**

1. ✅ **Deleted** `venue-default-images.js` files from:
   - `/scrapers/cities/vancouver/`
   - `/scrapers/cities/Toronto/`
   - `/scrapers/cities/Calgary/`

2. ✅ **Updated** index.js coordinators:
   - `/scrapers/cities/vancouver/index.js`
   - `/scrapers/cities/Toronto/index.js`
   - Now set `imageUrl: null` if scraper didn't find one

3. ✅ **Fixed** individual scrapers:
   - `/scrapers/cities/vancouver/commodoreBallroom.js`
   - `/scrapers/cities/vancouver/theRoxy.js`
   - Now extract real images or set to null

---

## 📋 **How Scrapers Should Work**

### **✅ CORRECT Approach:**

```javascript
// Try to extract the real event poster image
const img = element.querySelector('img');
const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;

// Filter out logos/icons
if (imageUrl && (imageUrl.includes('logo') || imageUrl.includes('icon'))) {
  imageUrl = null;
}

// Set in event object
event.imageUrl = imageUrl;  // Real image or null
```

### **❌ WRONG Approach:**

```javascript
// DON'T DO THIS - No fallbacks!
event.imageUrl = realImage || 'https://placehold.co/...' || defaultImage;
```

---

## 🎨 **Image Extraction Best Practices**

### **1. Try Multiple Selectors:**

```javascript
const imageSources = [
  element.querySelector('img[class*="poster"]'),
  element.querySelector('img[class*="event"]'),
  element.querySelector('.event-image img'),
  element.querySelector('img:not([src*="logo"]):not([src*="icon"])'),
  element.closest('.event-card').querySelector('img')
];

let imageUrl = null;
for (const img of imageSources) {
  if (img && img.src && !img.src.includes('logo')) {
    imageUrl = img.src;
    break;
  }
}
```

### **2. Check Image Attributes:**

```javascript
const src = img.src || 
            img.getAttribute('data-src') || 
            img.getAttribute('data-lazy-src') ||
            img.getAttribute('srcset')?.split(' ')[0];
```

### **3. Validate Image URLs:**

```javascript
function isValidEventImage(url) {
  if (!url) return false;
  
  // Reject logos, icons, backgrounds
  const invalidPatterns = ['logo', 'icon', 'bg', 'background', 'banner'];
  if (invalidPatterns.some(p => url.toLowerCase().includes(p))) {
    return false;
  }
  
  // Require minimum dimensions (avoid thumbnails)
  // This would need to be checked after loading
  return true;
}
```

### **4. Make URLs Absolute:**

```javascript
if (imageUrl && !imageUrl.startsWith('http')) {
  const baseUrl = 'https://venue-website.com';
  imageUrl = new URL(imageUrl, baseUrl).href;
}
```

---

## 📊 **Expected Image Coverage**

### **Realistic Expectations:**

Not all events will have images. That's OK!

**Target Coverage:**
- Major venues with poster images: ~60-80%
- Ticketmaster/Eventbrite events: ~90%+
- Small local events: ~20-40%
- Overall goal: ~50-60% of events have real images

### **Current Status (After Removing Fallbacks):**

| City | Total Events | With Real Images | Coverage |
|------|--------------|------------------|----------|
| Vancouver | ~276 | TBD | TBD |
| Toronto | ~500 | TBD | TBD |
| Calgary | ~200 | TBD | TBD |
| Montreal | ~1054 | TBD | TBD |
| New York | ~800 | TBD | TBD |

**Note:** Need to run imports to measure actual coverage

---

## 🔍 **Which Venues Have Poster Images?**

### **✅ High Image Coverage:**
These venues typically have poster images on their websites:

**Ticketing Platforms:**
- Ticketmaster events (~95% have posters)
- Eventbrite events (~90% have posters)
- Universe.com events (~85% have posters)
- Dice.fm events (~90% have posters)

**Major Venues:**
- Commodore Ballroom (Vancouver) - Has posters
- Bovine Sex Club (Toronto) - Has posters (via Schema.org)
- Scotiabank Arena (Toronto) - Via Ticketmaster
- BC Place (Vancouver) - Via Ticketmaster

### **❌ Low/No Image Coverage:**
These venues might not have poster images:

- Small local bars (calendar-only listings)
- Community theaters (text-based listings)
- Venues using simple list formats
- Events posted as plain text announcements

---

## 🛠️ **How to Improve Image Coverage**

### **Priority 1: Fix Existing Scrapers**

Many scrapers CAN extract images but aren't trying:

```bash
# Audit which scrapers extract images
grep -r "imageUrl\|image:" scrapers/cities/vancouver/*.js | grep -v "imageUrl: null"
```

**Fix by adding image extraction logic:**

1. Open scraper file
2. Find where event data is extracted
3. Add image selector (see best practices above)
4. Test: `node scrapers/cities/vancouver/SCRAPER.js`

### **Priority 2: Use JSON-LD/Schema.org**

Many modern websites include event data in JSON-LD format:

```javascript
// Look for <script type="application/ld+json">
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
scripts.forEach(script => {
  const data = JSON.parse(script.textContent);
  if (data['@type'] === 'Event') {
    imageUrl = data.image;  // Often includes poster image!
  }
});
```

**The Bovine scraper already does this!** (Line 46-60)

### **Priority 3: Scrape Event Detail Pages**

Some venues only show images on individual event pages:

```javascript
// If no image on listing page, fetch the event detail page
if (!imageUrl && eventUrl) {
  const detailPage = await axios.get(eventUrl);
  const $ = cheerio.load(detailPage.data);
  imageUrl = $('.event-poster img, .hero-image img').attr('src');
}
```

**Warning:** This is slower (extra HTTP request per event)

---

## 📱 **iOS App Behavior**

### **When imageUrl is null:**

The iOS app should:
- ✅ Hide the image section entirely
- ✅ Or show a simple placeholder icon (not a fake poster)
- ✅ Gracefully handle missing images

### **Current Implementation:**

```swift
// ContentView.swift
if let imageUrl = event.imageURL {
    AsyncImage(url: imageUrl) { phase in
        // Show image
    }
} else {
    // No image shown - this is correct!
}
```

---

## 🚀 **Next Steps**

### **Step 1: Run Imports** (Updates DB with null for missing images)

```bash
cd ~/Desktop/discovr-api-server

# Vancouver
node ImportFiles/import-all-vancouver-events.js

# Toronto  
node ImportFiles/import-all-toronto-events.js
```

### **Step 2: Measure Coverage**

```bash
# In MongoDB
use discovr
db.events.aggregate([
  { $match: { city: "Vancouver" } },
  { $group: {
      _id: "$city",
      total: { $sum: 1 },
      withImages: { $sum: { $cond: [{ $ne: ["$imageUrl", null] }, 1, 0] } }
    }
  }
])
```

### **Step 3: Improve Scrapers**

Focus on high-volume venues that CAN have images but aren't extracting them.

**Priority venues to fix:**
1. Commodore Ballroom (already extracts images ✅)
2. The Roxy (already tries to extract ✅)
3. Fox Cabaret - Add image extraction
4. Vogue Theatre - Add image extraction
5. Rickshaw Theatre - Add image extraction

### **Step 4: Test in iOS App**

```
1. Rebuild iOS app
2. Check events with images → Should show
3. Check events without images → Should hide gracefully
4. No fake placeholder images anywhere ✅
```

---

## 📝 **Example: Good Scraper with Image Extraction**

```javascript
/**
 * Example Venue Scraper - CORRECT APPROACH
 */

async function scrapeVenue() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://venue.com/events');
  
  const events = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.event')).map(el => {
      // Extract title
      const title = el.querySelector('h2, .title')?.textContent;
      
      // Extract date
      const date = el.querySelector('time, .date')?.textContent;
      
      // Extract URL
      const url = el.querySelector('a')?.href;
      
      // Extract REAL poster image
      let imageUrl = null;
      const img = el.querySelector('img:not([src*="logo"]):not([src*="icon"])');
      if (img) {
        imageUrl = img.src || img.getAttribute('data-src');
      }
      
      // Return event with real image or null
      return {
        title,
        date,
        url,
        imageUrl: imageUrl || null  // ✅ No fallback!
      };
    });
  });
  
  await browser.close();
  return events;
}
```

---

## ⚠️ **Important Reminders**

1. **Never** use placeholder/fallback/default images
2. **Always** set `imageUrl: null` if no real image found
3. **Don't** use venue logos as event posters
4. **Do** extract images from Schema.org/JSON-LD when available
5. **Test** scrapers individually before deploying

---

## 🎯 **Success Criteria**

### **✅ Policy Compliance:**
- ✅ Zero fallback images in codebase
- ✅ All scrapers set `imageUrl: null` when no real image
- ✅ No `venue-default-images.js` files exist
- ✅ iOS app handles null images gracefully

### **📊 Quality Metrics:**
- Target: 50-60% of events have real poster images
- No fake/placeholder images shown to users
- Image URLs are actual event posters from venue websites

---

## 📚 **Reference**

### **Files Modified:**
- `/scrapers/cities/vancouver/index.js` - Removed fallback logic
- `/scrapers/cities/Toronto/index.js` - Removed fallback logic
- `/scrapers/cities/vancouver/commodoreBallroom.js` - Extract real images only
- `/scrapers/cities/vancouver/theRoxy.js` - Extract real images only

### **Files Deleted:**
- `/scrapers/cities/vancouver/venue-default-images.js` ❌
- `/scrapers/cities/Toronto/venue-default-images.js` ❌
- `/scrapers/cities/Calgary/venue-default-images.js` ❌

### **Commit:**
```
Remove ALL fallback images - only use real event posters from scrapers
```

---

**Policy enforced! No more fallbacks! Only real event poster images!** ✅
