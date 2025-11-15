# 🎛️ Admin Dashboard URLs - November 15, 2024

## 🌐 **Main Production URLs**

Your Discovr API is deployed on **Google Cloud Run**:

### **Base URL:**
```
https://discovr-api-531591199325.us-west1.run.app
```

---

## 📊 **Admin Dashboard Access**

After deployment (~3 min), you can access the admin dashboards at:

### **1. Main Admin Homepage** ⭐
```
https://discovr-api-531591199325.us-west1.run.app/
```
**What it shows:**
- Quick links to all admin tools
- API endpoint documentation
- Venue viewer access
- Scraper dashboard access

---

### **2. Unified Admin Dashboard** 🎯
```
https://discovr-api-531591199325.us-west1.run.app/admin
```
**or**
```
https://discovr-api-531591199325.us-west1.run.app/admin/
```
**or**
```
https://discovr-api-531591199325.us-west1.run.app/unified-admin.html
```

**What it shows:**
- 3D carousel of featured events
- Event management with tabs
- Featured event controls
- Modern Bootstrap interface

---

## 🛠️ **All Available Admin Tools**

### **Event Management:**

| Tool | URL | Purpose |
|------|-----|---------|
| **All Events Dashboard** | `/all-events-dashboard.html` | Browse ALL events across all cities |
| **Featured Events Admin** | `/featured-events-admin.html` | Manage featured events |
| **Venue Viewer** | `/venue-viewer.html` | Browse events by venue |

### **Scraper Tools:**

| Tool | URL | Purpose |
|------|-----|---------|
| **Scraper Dashboard** | `/scraper-dashboard.html` | Monitor scraper status & performance |
| **Scraper Tester** | `/scraper-tester.html` | Test individual scrapers |
| **Scraper Quick Fix** | `/scraper-quickfix.html` | Fix wizard for broken scrapers |
| **Scraper Diagnostics** | `/scraper-diagnostics.html` | Deep diagnostic tool |

### **Deployment:**

| Tool | URL | Purpose |
|------|-----|---------|
| **Deploy Dashboard** | `/deploy-all-events-dashboard.html` | Deployment management |

### **Device:**

| Tool | URL | Purpose |
|------|-----|---------|
| **Device Setup** | `/device-setup.html` | Device configuration |

---

## 🔗 **Full URLs (Copy-Paste Ready)**

### **Primary Access Points:**
```
https://discovr-api-531591199325.us-west1.run.app/
https://discovr-api-531591199325.us-west1.run.app/admin
https://discovr-api-531591199325.us-west1.run.app/unified-admin.html
```

### **Event Management:**
```
https://discovr-api-531591199325.us-west1.run.app/all-events-dashboard.html
https://discovr-api-531591199325.us-west1.run.app/featured-events-admin.html
https://discovr-api-531591199325.us-west1.run.app/venue-viewer.html
```

### **Scraper Tools:**
```
https://discovr-api-531591199325.us-west1.run.app/scraper-dashboard.html
https://discovr-api-531591199325.us-west1.run.app/scraper-tester.html
https://discovr-api-531591199325.us-west1.run.app/scraper-quickfix.html
https://discovr-api-531591199325.us-west1.run.app/scraper-diagnostics.html
```

---

## 🔧 **API Endpoints for Admin Tools**

The admin tools use these API endpoints:

### **Event APIs:**
```
GET  /api/v1/events                    - Get all events
GET  /api/v1/events/:id                - Get specific event
POST /api/v1/events                    - Create event
PUT  /api/v1/events/:id                - Update event
DELETE /api/v1/events/:id              - Delete event
```

### **Featured Events APIs:**
```
GET  /api/v1/events/featured           - Get featured events
POST /api/v1/events/:id/feature        - Mark event as featured
DELETE /api/v1/events/:id/feature      - Remove featured status
```

### **Scraper Admin APIs:**
```
POST /api/admin/rescrape-city          - Re-scrape a city
GET  /api/admin/test-scraper/:city     - Test city scrapers
GET  /api/admin/clear-cache            - Clear cache
```

### **Direct Database APIs:**
```
GET  /api/direct/events                - Bypass cache, get events directly
GET  /api/fresh/events                 - Always fresh events
GET  /api/diagnostic/events            - Diagnostic info
```

---

## 🚀 **What Just Changed**

### **Before:**
- ❌ Root `/` showed "Discovr Events API Server is running" (just text)
- ❌ `/admin` route didn't exist
- ⚠️ Had to remember full HTML filenames to access admin tools

### **After:**
- ✅ Root `/` serves the full admin homepage
- ✅ `/admin` serves the unified admin dashboard
- ✅ Clean, professional admin interface
- ✅ Easy to remember URLs

---

## 📱 **Access From Anywhere**

### **Desktop:**
Just open any of the URLs above in your browser (Chrome, Firefox, Safari, etc.)

### **Mobile:**
The admin dashboards are responsive and work on mobile devices!

### **Bookmarks:**
Recommended bookmarks:
1. **Main Admin**: `https://discovr-api-531591199325.us-west1.run.app/`
2. **Unified Dashboard**: `https://discovr-api-531591199325.us-west1.run.app/admin`
3. **All Events**: `https://discovr-api-531591199325.us-west1.run.app/all-events-dashboard.html`

---

## 🔒 **Note About Security**

Currently, the admin dashboards are **publicly accessible**. 

If you want to add authentication:
1. Uncomment auth middleware in `server.js`
2. Set `ADMIN_API_KEY` environment variable
3. Add authentication to admin routes

---

## 🎯 **Quick Start Guide**

### **1. Check Current Events:**
```
https://discovr-api-531591199325.us-west1.run.app/all-events-dashboard.html
```

### **2. Manage Featured Events:**
```
https://discovr-api-531591199325.us-west1.run.app/admin
```

### **3. Test Scrapers:**
```
https://discovr-api-531591199325.us-west1.run.app/scraper-tester.html
```

### **4. View Events by Venue:**
```
https://discovr-api-531591199325.us-west1.run.app/venue-viewer.html
```

---

## ⏱️ **Deployment Status**

✅ **Committed** to GitHub  
🚀 **Deploying** to Google Cloud Run (~3 min)  
📊 **Will be live** at all the URLs above

---

## 🎉 **Summary**

**Your admin dashboard is now accessible at:**
```
https://discovr-api-531591199325.us-west1.run.app/admin
```

**All admin tools available at:**
```
https://discovr-api-531591199325.us-west1.run.app/
```

**API base URL:**
```
https://discovr-api-531591199325.us-west1.run.app/api/v1
```

---

## 📝 **Want to Improve the Admin Dashboard?**

Current admin tools are functional but basic. We can:
- ✅ Add better styling
- ✅ Add real-time scraper monitoring
- ✅ Add image preview for events
- ✅ Add bulk import/export tools
- ✅ Add analytics dashboard

**Let me know what you'd like to work on next!** 🚀
