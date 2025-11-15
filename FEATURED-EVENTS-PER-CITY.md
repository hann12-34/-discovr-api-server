# 🌟 Featured Events Management - Per City

## 🎯 Overview

You can now manage featured events **separately for each city**! Vancouver, Toronto, Calgary, and Montreal each have their own featured events that you control manually.

---

## 🔗 Access the New Admin

### **URL:**
```
https://discovr-api-531591199325.us-west1.run.app/admin/featured
```

---

## ✨ Features

### **1. City-Based Management** 🏙️
- Select a city (Vancouver, Toronto, Calgary, Montreal)
- Each city has its own independent featured events list
- Up to 10 featured events per city

### **2. Visual Dashboard** 📊
**Stats for selected city:**
- **Total Events** - All events in that city
- **Featured** - How many featured
- **With Images** - Events that have poster images
- **Upcoming** - Future events

### **3. Preview Section** 👁️
- See exactly how featured events will appear in the app
- Horizontal scrollable carousel preview
- Shows event images, titles, venues, dates

### **4. Event Management** 🎫
**Features:**
- **Search** - Find events by name or venue
- **Category Filter** - Filter by Nightlife, Concert, Festival, Museum, etc.
- **Image Filter** - Show only events with/without images
- **Feature Button** - Click to add/remove from featured
- **Real-time** - Changes reflect immediately

### **5. Beautiful UI** 🎨
- Modern gradient design
- Responsive cards
- Image placeholders for events without posters
- Smooth animations

---

## 🚀 How to Use

### **Step 1: Select City**
1. Open `/admin/featured`
2. Click on a city button (🏔️ Vancouver, 🏙️ Toronto, 🎿 Calgary, 🎭 Montreal)
3. The page loads all events for that city

### **Step 2: Browse Events**
- Scroll through all events in the selected city
- Use search box to find specific events
- Use filters to narrow down results
- Events with images show the poster, others show placeholder

### **Step 3: Feature Events**
- Click **"Feature"** button on events you want to feature
- Maximum 10 featured events per city
- Featured events get a ⭐ badge
- They move to the top of the list

### **Step 4: Preview**
- Check the preview section at the top
- See how your featured events will look in the app
- Horizontal carousel shows all featured events

### **Step 5: Save**
- Click **"Save Featured Events for [City]"**
- Changes are saved to the database
- Button shows "Saved!" confirmation
- Featured events now appear in the iOS app

### **Step 6: Switch Cities**
- Click a different city button
- Repeat the process for each city
- Each city maintains its own featured events

---

## 📱 In the iOS App

After saving featured events, they appear in the app:

```
Featured in Vancouver
┌─────────────────────┐  ┌─────────────────────┐
│ [Event 1 Image]     │  │ [Event 2 Image]     │
│ Event Title         │  │ Event Title         │
│ Fox Cabaret         │  │ Orpheum Theatre     │
│ Oct 25, 2026        │  │ Oct 28, 2026        │
└─────────────────────┘  └─────────────────────┘
```

---

## 🔧 Technical Details

### **Database Changes:**
Added to Event model:
- `featured` (Boolean) - Is this event featured?
- `featuredOrder` (Number) - Order in featured list per city
- Compound index on `city`, `featured`, `featuredOrder` for fast queries

### **API Endpoints:**

#### **Get Featured Events**
```
GET /api/v1/featured-events?city=Vancouver
```
**Response:**
```json
{
  "success": true,
  "count": 5,
  "events": [...]
}
```

#### **Set Featured Events for a City**
```
POST /api/v1/featured-events
Content-Type: application/json

{
  "city": "Vancouver",
  "events": [
    { "_id": "event1_id" },
    { "_id": "event2_id" },
    ...
  ]
}
```

#### **Feature an Individual Event**
```
POST /api/v1/events/:id/feature
Content-Type: application/json

{
  "order": 1
}
```

#### **Unfeature an Event**
```
DELETE /api/v1/events/:id/feature
```

---

## 🎯 Workflow Example

### **Scenario: Setting up Vancouver featured events**

1. **Open admin:** `https://discovr-api-531591199325.us-west1.run.app/admin/featured`

2. **Select Vancouver**
   - Click "🏔️ Vancouver" button
   - See stats: 150 total events, 0 featured, 80 with images

3. **Find good events**
   - Filter: "With Images Only"
   - Category: "Nightlife"
   - See 40 nightlife events with posters

4. **Feature events**
   - Click "Feature" on "Willi Carlisle at Fox Cabaret"
   - Click "Feature" on "Frost Children at Commodore"
   - Click "Feature" on 8 more events (max 10)
   - Stats update: 10 featured

5. **Preview**
   - Scroll through preview carousel
   - Check images load correctly
   - Verify titles and dates

6. **Save**
   - Click "Save Featured Events for Vancouver"
   - See "Saved!" confirmation
   - Done! Vancouver featured events are live

7. **Repeat for Toronto**
   - Click "🏙️ Toronto" button
   - Start fresh with Toronto's events
   - Feature different events for Toronto
   - Save

---

## 📊 Best Practices

### **1. Choose Events with Images** 🖼️
- Use the "With Images Only" filter
- Featured events look better with posters
- Blank placeholders are less engaging

### **2. Mix Categories** 🎭
- Don't feature only nightlife
- Include concerts, museums, outdoor events
- Variety appeals to more users

### **3. Feature Upcoming Events** 📅
- Don't feature past events
- Focus on next 2-4 weeks
- Update regularly

### **4. Spread Across Venues** 🏛️
- Don't feature 10 events at same venue
- Showcase different venues
- More discovery for users

### **5. Update Regularly** 🔄
- Update featured events weekly or bi-weekly
- Remove past events
- Add new exciting events

---

## 🆕 What's Different from Old System?

### **OLD System (featured-events-admin.html):**
- ❌ All cities mixed together
- ❌ No per-city control
- ❌ Hard to manage
- ❌ Confusing which events for which city

### **NEW System (featured-events-admin-v2.html):**
- ✅ City selector at top
- ✅ Independent featured lists per city
- ✅ Stats dashboard per city
- ✅ Preview per city
- ✅ Clean, organized interface
- ✅ Up to 10 featured per city
- ✅ Easy to maintain

---

## 🎨 UI Highlights

### **City Selector**
- Large, clear buttons
- Active state shows selected city
- Emoji icons for quick recognition

### **Stats Cards**
- Big numbers, easy to read
- Gradient text
- Shows key metrics at a glance

### **Event Cards**
- Image or placeholder
- Feature/Unfeature button
- Title, venue, date
- Featured badge on featured events

### **Preview Carousel**
- Horizontal scrolling
- Dark background (matches app)
- Shows exactly how it looks in app
- Confidence before saving

---

## 🚀 Deployment Status

✅ **Committed** to GitHub  
✅ **Pushed** to main branch  
🚀 **Deploying** to Google Cloud Run (~3-5 min)

### **After deployment:**
```
https://discovr-api-531591199325.us-west1.run.app/admin/featured
```

---

## 🎉 Summary

**You now have full manual control over featured events for each city!**

**Features:**
- ✅ Separate featured lists for Vancouver, Toronto, Calgary, Montreal
- ✅ Up to 10 featured events per city
- ✅ Search, filter, and browse all events
- ✅ Visual preview before saving
- ✅ Stats dashboard
- ✅ Beautiful, modern UI
- ✅ Real-time updates

**Perfect for:**
- Highlighting big events in each city
- Promoting events with great posters
- Curating the best experience per city
- Full manual control over what users see first

---

## 💡 Next Steps

1. **Wait for deployment** (~3-5 min)
2. **Open admin:** `/admin/featured`
3. **Set up Vancouver featured events**
4. **Set up Toronto featured events**
5. **Set up Calgary featured events**
6. **Set up Montreal featured events**
7. **Rebuild iOS app** to fetch featured events
8. **Enjoy!** 🎉

---

## 🐛 Troubleshooting

### **Events not showing?**
- Check that events exist in database for that city
- Try refreshing the events list

### **Can't save?**
- Check browser console for errors
- Verify API is deployed and running

### **Featured events not in app?**
- Rebuild iOS app after setting featured events
- Check iOS app is fetching from correct API
- Verify `featured: true` in database

---

## 📝 Pro Tips

1. **Preview before saving** - Always check the preview carousel
2. **Update weekly** - Keep featured events fresh
3. **Use images** - Featured events with images perform better
4. **Mix it up** - Variety of categories and venues
5. **Check app** - Rebuild iOS app to verify changes

---

**You're all set! Happy featuring! 🌟**
