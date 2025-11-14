# 🚀 Deploy Updated Schema to Render.com

## ✅ What's Ready:

1. ✅ Database has all images (397 Vancouver events)
2. ✅ Local schema updated with `imageUrl` field
3. ✅ Import script updated
4. ⚠️  **Need to deploy to Render.com!**

---

## 🔧 How to Deploy to Render.com:

### **Option 1: Push to GitHub (Auto-Deploy)** ⭐ Recommended

If Render is connected to your GitHub repo:

```bash
# 1. Check what changed
git status

# 2. Add the updated files
git add models/Event.js
git add ImportFiles/import-all-vancouver-events.js

# 3. Commit
git commit -m "Add imageUrl field to Event schema for image support"

# 4. Push to GitHub
git push origin main
# or
git push origin master
```

Render will automatically detect the push and redeploy!

---

### **Option 2: Manual Redeploy** 

If not using GitHub auto-deploy:

1. Go to https://dashboard.render.com
2. Find your API service
3. Click **"Manual Deploy"** button
4. Select **"Clear build cache & deploy"**
5. Wait ~2-3 minutes for deployment

---

### **Option 3: Redeploy from Render Dashboard**

1. Go to https://dashboard.render.com
2. Click on your API service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## ⏱️ After Deploy:

### **Wait for Deployment** (~2-5 minutes)

Watch the Render logs. When you see:
```
✅ Build successful
✅ Service is live
```

### **Test Your API**

```bash
# Test Render endpoint (replace with your URL)
curl "https://your-api.onrender.com/api/v1/events?city=Vancouver&limit=5"
```

Look for `imageUrl` field in the response!

---

## 🎨 What Should Happen:

### **Before Deploy:**
```json
{
  "title": "Vancouver School of Rock",
  "venue": { "name": "The Roxy" },
  // ❌ No imageUrl field
}
```

### **After Deploy:**
```json
{
  "title": "Vancouver School of Rock",
  "venue": { "name": "The Roxy" },
  "imageUrl": "https://placehold.co/800x600/dc2626/white?text=The+Roxy",
  "image": "https://placehold.co/800x600/dc2626/white?text=The+Roxy"
}
```

---

## 📱 Then Check iOS App:

1. **Force close** the app (swipe up)
2. **Reopen** the app
3. Check Vancouver events
4. **You should see images!** 🎉

---

## 🔍 If Images Still Don't Show:

### Check iOS Model:

Make sure your Swift model includes `imageUrl`:

```swift
struct Event: Codable {
    let id: String
    let title: String
    let imageUrl: String?  // ← This field
    // ...
}
```

Or if it uses `image`:
```swift
let image: String?  // ← Also fine
```

Both fields are now set in the database!

---

## 📝 Quick Checklist:

- [ ] Push code to GitHub (or manual deploy on Render)
- [ ] Wait for deployment (~3 mins)
- [ ] Test API endpoint returns `imageUrl`
- [ ] Force close iOS app
- [ ] Reopen iOS app
- [ ] Check Vancouver events for images

---

## 🆘 Need Help?

If deployment doesn't work or you need your Render.com credentials:
1. Check Render dashboard for deployment logs
2. Look for any errors in the build process
3. Verify MongoDB connection string is set in Render environment variables

---

**Ready to deploy! Just push to GitHub or click "Deploy" on Render!** 🚀
