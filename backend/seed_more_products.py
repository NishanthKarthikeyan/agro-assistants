import os
import pymongo
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(override=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/agropulse")
print(f"Connecting to {MONGO_URI}...")
client = pymongo.MongoClient(MONGO_URI)
try:
    db = client.get_database()
except pymongo.errors.ConfigurationError:
    db = client['agropulse']

print(f"Using database: {db.name}")

products = [
    # ---- VEGETABLES ----
    {
        "sellerId": "seed_seller_1", "sellerName": "Ramesh Kumar Farms", "name": "Fresh Broccoli", "description": "High-quality, farm-fresh green broccoli crowns.",
        "category": "vegetables", "price": 60.0, "unit": "kg", "stock": 100, "imageUrl": "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.8, "reviewCount": 15, "location": "Ooty, Tamil Nadu", "tags": ["broccoli", "vegetable", "healthy"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_2", "sellerName": "Green Valley Organics", "name": "Crunchy Carrots", "description": "Sweet and crunchy orange carrots, great for salads and juice.",
        "category": "vegetables", "price": 45.0, "unit": "kg", "stock": 200, "imageUrl": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.7, "reviewCount": 32, "location": "Nilgiris, Tamil Nadu", "tags": ["carrot", "vegetable", "organic"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_1", "sellerName": "Ramesh Kumar Farms", "name": "Mixed Bell Peppers", "description": "Colorful capsicums (Red, Yellow, Green) for cooking.",
        "category": "vegetables", "price": 120.0, "unit": "kg", "stock": 50, "imageUrl": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.6, "reviewCount": 21, "location": "Pune, Maharashtra", "tags": ["capsicum", "pepper", "vegetable"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_3", "sellerName": "Sunny Orchards", "name": "Fresh Garlic Bulbs", "description": "Aromatic white garlic bulbs, essential for Indian cooking.",
        "category": "vegetables", "price": 150.0, "unit": "kg", "stock": 300, "imageUrl": "https://images.unsplash.com/photo-1587049352847-4d4b12404113?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.9, "reviewCount": 85, "location": "Nashik, Maharashtra", "tags": ["garlic", "spice", "vegetable"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },

    # ---- FRUITS ----
    {
        "sellerId": "seed_seller_4", "sellerName": "Punjab Agri Producers", "name": "Kashmiri Apples", "description": "Crisp, sweet, and juicy red apples directly from Kashmir.",
        "category": "fruits", "price": 180.0, "unit": "kg", "stock": 150, "imageUrl": "https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.9, "reviewCount": 142, "location": "Srinagar, J&K", "tags": ["apple", "fruit", "kashmir"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_3", "sellerName": "Sunny Orchards", "name": "Fresh Bananas", "description": "Robusta bananas, yellow and perfectly ripe.",
        "category": "fruits", "price": 60.0, "unit": "dozen", "stock": 100, "imageUrl": "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.5, "reviewCount": 78, "location": "Coimbatore, Tamil Nadu", "tags": ["banana", "fruit"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_5", "sellerName": "Kerala Spices Co.", "name": "Nagpur Oranges", "description": "Sweet, tangy, and juicy oranges from Nagpur.",
        "category": "fruits", "price": 80.0, "unit": "kg", "stock": 200, "imageUrl": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.7, "reviewCount": 65, "location": "Nagpur, Maharashtra", "tags": ["orange", "fruit", "citrus"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_2", "sellerName": "Green Valley Organics", "name": "Fresh Strawberries", "description": "Farm-fresh, bright red strawberries. Hand-picked daily.",
        "category": "fruits", "price": 250.0, "unit": "box", "stock": 40, "imageUrl": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.8, "reviewCount": 112, "location": "Mahabaleshwar, Maharashtra", "tags": ["strawberry", "berry", "fruit"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_3", "sellerName": "Sunny Orchards", "name": "Juicy Watermelon", "description": "Large, sweet, and refreshing watermelons.",
        "category": "fruits", "price": 35.0, "unit": "piece", "stock": 80, "imageUrl": "https://images.unsplash.com/photo-1587049352851-8d4e89134780?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.6, "reviewCount": 33, "location": "Madurai, Tamil Nadu", "tags": ["watermelon", "fruit", "summer"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },

    # ---- GRAINS ----
    {
        "sellerId": "seed_seller_4", "sellerName": "Punjab Agri Producers", "name": "Golden Wheat Grains", "description": "High-quality whole wheat grains (Gehu) for making perfect rotis.",
        "category": "grains", "price": 35.0, "unit": "kg", "stock": 5000, "imageUrl": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.9, "reviewCount": 320, "location": "Ludhiana, Punjab", "tags": ["wheat", "grain", "staple"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_6", "sellerName": "Nandi Dairy Farms", "name": "Pearl Millet (Bajra)", "description": "Nutritious and healthy Pearl Millet, cleaned and sorted.",
        "category": "grains", "price": 40.0, "unit": "kg", "stock": 1000, "imageUrl": "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.5, "reviewCount": 42, "location": "Jaipur, Rajasthan", "tags": ["millet", "bajra", "grain"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_1", "sellerName": "Ramesh Kumar Farms", "name": "Sweet Corn", "description": "Fresh, sweet, and juicy corn on the cob.",
        "category": "grains", "price": 15.0, "unit": "piece", "stock": 500, "imageUrl": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.8, "reviewCount": 67, "location": "Bangalore, Karnataka", "tags": ["corn", "maize", "grain"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_2", "sellerName": "Green Valley Organics", "name": "Organic Rolled Oats", "description": "Healthy, organic rolled oats for a perfect breakfast.",
        "category": "grains", "price": 150.0, "unit": "kg", "stock": 200, "imageUrl": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.7, "reviewCount": 98, "location": "Pune, Maharashtra", "tags": ["oats", "grain", "healthy"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },

    # ---- DAIRY ----
    {
        "sellerId": "seed_seller_6", "sellerName": "Nandi Dairy Farms", "name": "Fresh Cow Milk", "description": "Unprocessed, fresh A2 cow milk delivered raw.",
        "category": "dairy", "price": 60.0, "unit": "liter", "stock": 100, "imageUrl": "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.9, "reviewCount": 350, "location": "Bangalore, Karnataka", "tags": ["milk", "dairy", "fresh"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_6", "sellerName": "Nandi Dairy Farms", "name": "Fresh Paneer (Cottage Cheese)", "description": "Soft and fresh paneer made from pure cow milk.",
        "category": "dairy", "price": 350.0, "unit": "kg", "stock": 50, "imageUrl": "https://images.unsplash.com/photo-1631452180519-c014fe946cea?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.8, "reviewCount": 120, "location": "Bangalore, Karnataka", "tags": ["paneer", "dairy", "cheese"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_4", "sellerName": "Punjab Agri Producers", "name": "Farm Churned Butter", "description": "White butter (Makhan) traditionally churned from curd.",
        "category": "dairy", "price": 450.0, "unit": "kg", "stock": 30, "imageUrl": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.9, "reviewCount": 65, "location": "Amritsar, Punjab", "tags": ["butter", "dairy"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_5", "sellerName": "Kerala Spices Co.", "name": "Organic Cheddar Cheese", "description": "Aged, block cheddar cheese made from organic milk.",
        "category": "dairy", "price": 800.0, "unit": "kg", "stock": 20, "imageUrl": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.7, "reviewCount": 43, "location": "Kochi, Kerala", "tags": ["cheese", "dairy"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },

    # ---- HERBS ----
    {
        "sellerId": "seed_seller_2", "sellerName": "Green Valley Organics", "name": "Fresh Basil Leaves", "description": "Aromatic Italian sweet basil, perfect for pesto and pasta.",
        "category": "herbs", "price": 150.0, "unit": "kg", "stock": 10, "imageUrl": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.6, "reviewCount": 23, "location": "Ooty, Tamil Nadu", "tags": ["basil", "herb", "fresh"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_1", "sellerName": "Ramesh Kumar Farms", "name": "Fresh Mint (Pudina)", "description": "Cool, refreshing mint leaves for chutneys and drinks.",
        "category": "herbs", "price": 80.0, "unit": "kg", "stock": 20, "imageUrl": "https://images.unsplash.com/photo-1594834749740-74b3e65ab4e8?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.8, "reviewCount": 54, "location": "Coimbatore, Tamil Nadu", "tags": ["mint", "herb", "pudina"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_5", "sellerName": "Kerala Spices Co.", "name": "Lemongrass Stalks", "description": "Citrusy, fragrant lemongrass stalks for teas and curries.",
        "category": "herbs", "price": 120.0, "unit": "kg", "stock": 15, "imageUrl": "https://images.unsplash.com/photo-1515471209610-dae1c92d8777?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.5, "reviewCount": 11, "location": "Munnar, Kerala", "tags": ["lemongrass", "herb"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_3", "sellerName": "Sunny Orchards", "name": "Fresh Rosemary", "description": "Pine-scented fresh rosemary sprigs.",
        "category": "herbs", "price": 400.0, "unit": "kg", "stock": 5, "imageUrl": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop",
        "images": [], "isApproved": True, "isAvailable": True, "rating": 4.7, "reviewCount": 38, "location": "Nashik, Maharashtra", "tags": ["rosemary", "herb"], "createdAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
    }
]

print(f"Inserting {len(products)} additional products into the database...")
result = db.products.insert_many(products)
print(f"Successfully inserted {len(result.inserted_ids)} products.")
print("Done!")
