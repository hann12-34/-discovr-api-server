# Generic Programs Fix - Complete Documentation

## 🎯 Problem Identified

**Issue:** Scrapers were collecting **generic recurring programs** as if they were unique events.

### Example: "PD Days" at Bata Shoe Museum
- **What it is:** A generic program saying "Museum is open on school PD days"
- **Why it's fake:** Not a specific event - just regular museum access on certain days
- **Problem:** Users see "PD Days" in the app and don't know what it means

## 🔍 Root Cause Analysis

### What Are Generic Programs?
Generic programs are **institutional offerings** that:
1. **Recur regularly** - happen every week/month/year
2. **Not unique** - no special content, just access
3. **Not descriptive** - titles like "PD Days", "Family Day", "School Programs"
4. **Not time-specific** - ongoing access, not a one-time event

### Examples of Generic Programs (NOT Events):
```
✗ PD Days
✗ School Programs
✗ Group Visits
✗ Free Admission Day
✗ Community Day
✗ Family Day
✗ Open House
✗ General Admission
✗ Field Trips
✗ Drop-in Programs
✗ Weekly Tours
✗ Self-Guided Tours
```

### Examples of REAL Events (Keep These):
```
✓ "Opening Celebrations of Entangled Territories: Tibet Through Images"
✓ "Embroidery 101 Workshop"
✓ "2025 Founder's Lecture"
✓ "Fall Exhibition Community Day"  (specific exhibition)
✓ "Culture Club at MOA: Harvest Centrepieces"  (specific activity)
```

## ✅ Solution Implemented

### 1. Created Generic Program Filter
**File:** `/scrapers/utils/genericProgramFilter.js`

**What it does:**
- Detects generic program patterns
- Filters them out before events are saved
- Logs what was filtered and why

**Patterns detected:**
- School/Education programs
- Generic admission/access
- Time-based recurring programs
- Generic categories
- Booking/registration pages

### 2. Applied Filter to Scrapers

#### ✅ **Bata Shoe Museum** (Toronto)
- **File:** `/scrapers/cities/Toronto/scrape-bata-shoe-museum-events.js`
- **Fix:** Added `filterGenericPrograms()`
- **Result:** "PD Days" now filtered out
- **Test:** ✅ Confirmed working

#### ✅ **Museum of Anthropology** (Vancouver)
- **File:** `/scrapers/cities/Vancouver/museumOfAnthropology.js`
- **Fix:** Added `filterGenericPrograms()`
- **Result:** Will filter any generic programs
- **Test:** ✅ Confirmed working

### 3. How to Apply to Other Scrapers

For any museum/gallery/cultural center scraper:

```javascript
// Add import
const { filterGenericPrograms } = require('../../utils/genericProgramFilter');

// Before returning events:
const filteredEvents = filterGenericPrograms(events);
return filteredEvents;
```

## 📊 Impact

### Before Fix:
- ❌ Generic programs scraped as events
- ❌ Users confused by titles like "PD Days"
- ❌ Not useful for discovering actual events
- ❌ Database cluttered with non-events

### After Fix:
- ✅ Only real, specific events scraped
- ✅ Clear, descriptive event titles
- ✅ Users can understand what events are
- ✅ Clean, high-quality event data

## 🔄 Testing

### Test Bata Shoe Museum:
```bash
node -e "const scraper = require('./scrapers/cities/Toronto/scrape-bata-shoe-museum-events.js'); scraper('Toronto').then(events => { console.log('Events:', events.map(e => e.title)); });"
```

**Expected:** No "PD Days" in results

### Test Museum of Anthropology:
```bash
node -e "const scraper = require('./scrapers/cities/Vancouver/museumOfAnthropology.js'); scraper('Vancouver').then(events => { console.log('Events:', events.map(e => e.title)); });"
```

**Expected:** Only specific exhibitions and events

## 🎯 Next Steps

### Recommended: Apply to All Museum/Gallery Scrapers

Museums and galleries often have generic programs. Apply this filter to:
- ✅ Bata Shoe Museum (Toronto) - **DONE**
- ✅ Museum of Anthropology (Vancouver) - **DONE**
- 🔲 Museum of Vancouver
- 🔲 Vancouver Art Gallery
- 🔲 Maritime Museum
- 🔲 Bill Reid Gallery
- 🔲 Natural History Museum (NY)
- 🔲 Whitney Museum (NY)
- 🔲 Brooklyn Museum (NY)
- 🔲 Metropolitan Museum (NY)
- 🔲 All other museum/gallery scrapers

### How to Find Scrapers Needing This Fix:
```bash
find ./scrapers/cities -name "*.js" | grep -iE "(museum|gallery|arts|cultural)" | grep -v backup
```

## 📝 Summary

**Problem:** "PD Days" and similar generic programs were being scraped as events  
**Root Cause:** Websites list ongoing programs alongside actual events  
**Solution:** Created smart filter to detect and remove generic programs  
**Status:** ✅ Fixed and tested on 2 museum scrapers  
**Next:** Apply to all museum/gallery scrapers systematically

---

**Date Fixed:** November 12, 2025  
**Fixed By:** AI Assistant  
**Tested:** ✅ Working correctly
