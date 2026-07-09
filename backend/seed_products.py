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

# Seed data
products = [
    {
        "sellerId": "seed_seller_1",
        "sellerName": "Ramesh Kumar Farms",
        "name": "Fresh Organic Tomatoes",
        "description": "Locally grown, pesticide-free tomatoes directly from the farm. Perfect for curries and salads.",
        "category": "vegetables",
        "price": 45.0,
        "unit": "kg",
        "stock": 150,
        "imageUrl": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.8,
        "reviewCount": 24,
        "location": "Coimbatore, Tamil Nadu",
        "tags": ["organic", "fresh", "vegetable"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_2",
        "sellerName": "Green Valley Organics",
        "name": "Crispy Green Cabbage",
        "description": "Farm-fresh green cabbage, harvested this morning. Crunchy and sweet.",
        "category": "vegetables",
        "price": 30.0,
        "unit": "kg",
        "stock": 80,
        "imageUrl": "https://images.unsplash.com/photo-1596199050105-6d5d32222916?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.5,
        "reviewCount": 12,
        "location": "Ooty, Tamil Nadu",
        "tags": ["organic", "cabbage", "fresh"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_1",
        "sellerName": "Ramesh Kumar Farms",
        "name": "Red Onions",
        "description": "High-quality, long-lasting red onions with pungent flavor and crisp texture.",
        "category": "vegetables",
        "price": 35.0,
        "unit": "kg",
        "stock": 500,
        "imageUrl": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.7,
        "reviewCount": 56,
        "location": "Coimbatore, Tamil Nadu",
        "tags": ["onion", "staple"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_3",
        "sellerName": "Sunny Orchards",
        "name": "Alphonso Mangoes",
        "description": "Sweet, juicy, premium Alphonso mangoes, hand-picked from our Ratnagiri orchards.",
        "category": "fruits",
        "price": 400.0,
        "unit": "dozen",
        "stock": 40,
        "imageUrl": "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 5.0,
        "reviewCount": 89,
        "location": "Ratnagiri, Maharashtra",
        "tags": ["mango", "fruit", "premium", "seasonal"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_4",
        "sellerName": "Punjab Agri Producers",
        "name": "Premium Basmati Rice",
        "description": "Aged for 2 years, long-grain fragrant Basmati rice. Perfect for Biryani.",
        "category": "grains",
        "price": 120.0,
        "unit": "kg",
        "stock": 1000,
        "imageUrl": "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.9,
        "reviewCount": 112,
        "location": "Amritsar, Punjab",
        "tags": ["rice", "grain", "basmati"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_5",
        "sellerName": "Kerala Spices Co.",
        "name": "Fresh Green Cardamom",
        "description": "Aromatic, large-pod green cardamom directly from the spice gardens of Kerala.",
        "category": "herbs",
        "price": 2500.0,
        "unit": "kg",
        "stock": 25,
        "imageUrl": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.8,
        "reviewCount": 34,
        "location": "Munnar, Kerala",
        "tags": ["spice", "cardamom", "aromatic"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_6",
        "sellerName": "Nandi Dairy Farms",
        "name": "Pure Cow Ghee",
        "description": "Traditional bilona churned A2 cow ghee. Rich aroma and granular texture.",
        "category": "dairy",
        "price": 850.0,
        "unit": "liter",
        "stock": 60,
        "imageUrl": "https://images.unsplash.com/photo-1628042456073-196fc9dfb01e?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.9,
        "reviewCount": 210,
        "location": "Bangalore, Karnataka",
        "tags": ["ghee", "dairy", "pure"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_2",
        "sellerName": "Green Valley Organics",
        "name": "Fresh Coriander Leaves",
        "description": "Fragrant, dark green, freshly plucked coriander bunches.",
        "category": "herbs",
        "price": 10.0,
        "unit": "bunch",
        "stock": 100,
        "imageUrl": "https://images.unsplash.com/photo-1579935110378-81262796945f?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.6,
        "reviewCount": 18,
        "location": "Ooty, Tamil Nadu",
        "tags": ["herb", "fresh", "coriander"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_1",
        "sellerName": "Ramesh Kumar Farms",
        "name": "Farm Fresh Potatoes",
        "description": "Large, versatile potatoes suitable for frying, boiling, or baking.",
        "category": "vegetables",
        "price": 25.0,
        "unit": "kg",
        "stock": 800,
        "imageUrl": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.5,
        "reviewCount": 45,
        "location": "Coimbatore, Tamil Nadu",
        "tags": ["potato", "staple"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "sellerId": "seed_seller_3",
        "sellerName": "Sunny Orchards",
        "name": "Juicy Pomegranates",
        "description": "Ruby red, sweet and antioxidant-rich pomegranates.",
        "category": "fruits",
        "price": 180.0,
        "unit": "kg",
        "stock": 120,
        "imageUrl": "https://images.unsplash.com/photo-1615486171448-43314041b312?q=80&w=600&auto=format&fit=crop",
        "images": [],
        "isApproved": True,
        "isAvailable": True,
        "rating": 4.8,
        "reviewCount": 67,
        "location": "Nashik, Maharashtra",
        "tags": ["fruit", "pomegranate", "healthy"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
]

print(f"Inserting {len(products)} products into the database...")
result = db.products.insert_many(products)
print(f"Successfully inserted {len(result.inserted_ids)} products.")
print("Done!")
