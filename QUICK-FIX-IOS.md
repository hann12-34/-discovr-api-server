# 🔍 iOS Image Field Debug

## The Problem:

Your API is returning data (coordinates work), but images don't show. This means:
1. ✅ API connection works
2. ✅ Events are loaded
3. ❌ Image field is missing or wrong name

---

## 🎯 Quick Fix - Check Your iOS Model:

### **Find your Event model in iOS/Swift code:**

Look for a file like `Event.swift` or `EventModel.swift` with this structure:

```swift
struct Event: Codable {
    let id: String
    let title: String
    let imageUrl: String?  // ← CHECK THIS LINE
    // or
    let image: String?     // ← OR THIS LINE
    // ...
}
```

---

## 🔧 Three Possible Issues:

### **Issue 1: iOS expects "imageUrl" but field is missing**

**Fix:** Make sure your Swift model has:
```swift
let imageUrl: String?
```

### **Issue 2: iOS expects "image" instead**

**Fix:** Update your model to BOTH:
```swift
let image: String?
let imageUrl: String?
```

### **Issue 3: Field name mismatch (camelCase)**

Your API might return `imageUrl` but iOS expects `imageURL` (capital URL):

**Fix:** Add a custom decoder:
```swift
struct Event: Codable {
    let imageUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case imageUrl = "imageUrl"  // Match API exactly
        // or try both:
        case imageUrl = "image"     // If API uses "image"
    }
}
```

---

## 🧪 Debug Your iOS App:

### **Add logging to see what's received:**

In your iOS code where you decode events, add:

```swift
if let events = try? decoder.decode([Event].self, from: data) {
    print("📊 Decoded \(events.count) events")
    if let first = events.first {
        print("🎨 First event title: \(first.title)")
        print("🖼️ First event imageUrl: \(first.imageUrl ?? "NIL")")
        print("🖼️ First event image: \(first.image ?? "NIL")")
    }
}
```

### **Or print raw JSON:**

```swift
if let json = try? JSONSerialization.jsonObject(with: data),
   let jsonData = try? JSONSerialization.data(withJSONObject: json, options: .prettyPrinted),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print("📦 Raw API Response:")
    print(jsonString.prefix(500))  // First 500 chars
}
```

---

## 🎯 Most Likely Solution:

Based on your schema update, the API should return **both** `image` AND `imageUrl`.

**Your iOS model should have:**

```swift
struct Event: Codable {
    let id: String
    let title: String
    let dateRange: DateRange?
    let venue: Venue
    let city: String?
    
    // IMAGE FIELDS - Add both for compatibility
    let image: String?
    let imageUrl: String?
    
    // Use whichever one is available
    var displayImage: String? {
        return imageUrl ?? image
    }
}
```

Then in your image view:
```swift
AsyncImage(url: URL(string: event.displayImage ?? "")) { image in
    image.resizable()
} placeholder: {
    Image(systemName: "photo")
}
```

---

## 🔍 Where to Look:

1. **Find Event model:** Search for `struct Event` in your iOS project
2. **Check field names:** Make sure `imageUrl` or `image` exists
3. **Check image loading:** Find where images are displayed (AsyncImage, KingFisher, etc.)
4. **Add debug prints:** Log what the API returns

---

## 📝 Quick Test:

**In your iOS app, find the networking code and add:**

```swift
print("🌐 API Response Fields:", event)
```

This will show you EXACTLY what fields are coming from the API!

---

**The API is working (coordinates prove it). The issue is 100% on the iOS side with field naming or image display logic!** 🎯
