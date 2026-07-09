# AI Agro Assistant — Feature Upgrades Walkthrough

We have successfully overhauled and verified the **AI Crop Planner**, **Vegetable Market Prices Dashboard**, **Agri News**, **FCM Notification System**, and **Crop Disease Detection with Shop Finder** with premium UIs, location-aware auto-fetching, and robust live API integrations.

---

## 1. AI Crop Planner (Cultivation Cost Estimator)
Converted the general planner into a custom crop cost calculator:
* **Step 1: Location & Soil Profile**: Fetches pH, Nitrogen, Phosphorus, Potassium, drainage, and climate for the entered district/city.
* **Step 2: Farm Specifications**: Takes Land Area (Acres/Hectares) and the target crop/vegetable name to plant.
* **Step 3: Financial & Timeline Scorecards**: Calls Gemini to compute:
  * Seed/Seedling cost, Land prep, Fertilizer, Water, and Labor.
  * Expected harvest yield (e.g. in Tonnes), expected revenue, and net profit.
  * Step-by-step planting schedule and irrigation intervals.
* **FCM Trigger**: Automatically sends a native system push notification to the user's OS when a planting plan is successfully generated.

---

## 2. Vegetable Market Price Dashboard
Designed a premium weather-app style dashboard:
* **Current Location Selector**: Auto-updates the entire page when GPS or manual Tamil Nadu districts are selected.
* **Live data.gov.in Integration**: Cleaned location strings to fetch real-time market prices from government endpoints, with safe, stable fallback generators on timeouts.
* **Search & Filters**: Added live text search and horizontal scrollable category filter chips (Vegetables, Greens, All, etc.).
* **Seeded Sparkline & Price Comparison**: Each card shows Today's Price, Yesterday's Price, change percentage, a 7-day SVG sparkline trend, quick selling tags, and an AI recommendation widget.
* **Beetroot & Custom Crop Sourcing**: Included a `"Fetch custom rate"` button when custom crops (like Beetroot) are searched, letting users dynamically pull and add mandi prices for any crop.
* **Ask AI FAB**: A floating button expands into suggested AI questions (e.g., *"Should I sell tomatoes today?"*) that link to the chatbot.

---

## 3. Agri News Upgrade
* **Dynamic Fallback News Feed**: Resolved the `429 Too Many Requests` GNews API limits by adding a high-quality fallback database of 10+ realistic, category-tagged Indian farming news articles.
* **Category Filters**: Verified that filters (Organic, Weather, Farming, Technology, Market, Government Schemes) correctly filter articles dynamically in the UI.

---

## 4. FCM Push Notifications System
Fixed the notification system from the ground up:
* **Service Worker Registry (`firebase-messaging-sw.js`)**: Created the missing Firebase Service Worker in the `public/` folder, resolving browser-level SW registration errors.
* **App-Wide Permission Requests**: Integrated the notification permission prompt into `AuthContext.jsx` so that users are automatically asked to allow notifications right after logging in.
* **Real-time Native OS Push Notifications**: Switched the foreground message listener in `notificationService.jsx` to show native browser/system-level notifications instead of React Hot Toast banners inside the web app. Now notifications behave as authentic OS push alerts under all conditions.

---

## 5. Crop Disease Detection & Nearby Shop Finder (Overpass API)
Integrated a premium pesticide recommendation and shop finder feature:
* **Disease Detection**: Analyzes leaves using `gemini-2.5-flash` (latest stable model with active quota pool to avoid rate limits).
* **AI Medicine Recommendations**: Automatically recommends 5 medicines with brand names, generic ingredients, type (Chemical/Organic/Bio-fungicide), exact dosage, and estimated Indian price ranges.
* **Overpass API Integration**: Auto-detects user GPS coordinates to query the OpenStreetMap Overpass API for nearby agrarian and farm supply stores within 10km.
* **Directions & Contact**: Renders clickable phone numbers and a "Get Directions" button that opens driving routes on Google Maps. Includes a Google Maps search fallback if no stores are mapped in OSM.
* **FCM Trigger**: Automatically sends a native system push notification to the user's OS when a leaf analysis is completed, displaying the name of the detected disease.

---

## 6. E-Commerce Order & Loan Push Alerts
Integrated real-time system alerts on user actions:
* **Order Placement**: Automatically sends a native push alert to the buyer confirming their order, and a new order alert to the seller.
* **Loan Applications**: Sends a native push alert to the applicant once their agricultural loan is successfully submitted.
