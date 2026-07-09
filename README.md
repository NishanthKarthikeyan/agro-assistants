# AI Agro Assistant 🌱

> Empowering Indian Farmers with AI - Direct from local farmers, no middlemen, fair prices.

AI Agro Assistant is a comprehensive, AI-powered agricultural platform designed to bridge the gap between farmers and consumers, while providing farmers with state-of-the-art tools to optimize their crop yield and financial stability.

## ✨ Features

### For Farmers (Sellers)
* **Marketplace Dashboard**: Direct selling to consumers with no middlemen. Add, edit, and manage produce listings easily.
* **AI Crop Disease Detection** 🔬: Upload a photo of a diseased plant, and the AI will instantly diagnose the issue and provide actionable treatment recommendations.
* **Market Prices** 📈: Real-time aggregated market prices for various commodities across India to ensure fair pricing.
* **AI Planner** 🌱: Intelligent crop rotation and planting schedules tailored to location and season.
* **Agri Loan Assistant** 🏦: Simplified financial aid and loan calculators tailored specifically for agricultural needs.
* **AgroBot AI Chat** 🤖: A 24/7 intelligent assistant ready to answer any farming, soil, or weather-related questions.

### For Consumers (Buyers)
* **Direct Marketplace**: Buy farm-fresh vegetables, fruits, and grains directly from the source.
* **Transparent Tracking**: Real-time order tracking and status updates.
* **Role Upgrade**: Seamlessly upgrade a buyer account to a seller account to start selling your own produce.

## 🛠️ Tech Stack

**Frontend**
* React.js (Vite)
* Tailwind CSS
* Lucide Icons
* React Router DOM

**Backend**
* Python / Flask
* MongoDB (Atlas Cloud)
* JSON Web Tokens (JWT) & bcrypt for authentication
* Cloudinary for Image Hosting

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* MongoDB Atlas Account
* Cloudinary Account

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend server:
```bash
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
