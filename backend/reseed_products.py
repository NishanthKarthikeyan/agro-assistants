import os
import random
from pymongo import MongoClient
from datetime import datetime

# Connect to MongoDB
MONGO_URI = "mongodb://localhost:27017/agropulse"
client = MongoClient(MONGO_URI)
db = client.get_default_database()

# Clear existing products
db.products.delete_many({})
print("Cleared existing products.")

# Real Sellers
sellers = [
    {"id": "seller1", "name": "Sunny Orchards"},
    {"id": "seller2", "name": "Punjab Agri Producers"},
    {"id": "seller3", "name": "Kerala Spices Co."},
    {"id": "seller4", "name": "Green Valley Farms"}
]

# Images mapped by keyword
IMAGES = {
    "potato": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80",
    "onion": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80",
    "tomato": "https://images.unsplash.com/photo-1518110924443-41dc369c766e?w=500&q=80",
    "cabbage": "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=500&q=80",
    "carrot": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&q=80",
    "broccoli": "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=500&q=80",
    "spinach": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80",
    "pepper": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa8a?w=500&q=80",
    "apple": "https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?w=500&q=80",
    "banana": "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=500&q=80",
    "orange": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=500&q=80",
    "mango": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=500&q=80",
    "grape": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500&q=80",
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80",
    "wheat": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80",
    "corn": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500&q=80",
    "oat": "https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=500&q=80",
    "milk": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80",
    "cheese": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&q=80",
    "butter": "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=500&q=80",
    "yogurt": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80",
    "basil": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=500&q=80",
    "mint": "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=500&q=80",
    "cilantro": "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=500&q=80",
    "parsley": "https://images.unsplash.com/photo-1604153093498-8924b17d472c?w=500&q=80"
}

CATEGORY_FALLBACKS = {
    "vegetables": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
    "fruits": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80",
    "grains": "https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=500&q=80",
    "dairy": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&q=80",
    "herbs": "https://images.unsplash.com/photo-1466692476877-6a42f311c1e5?w=500&q=80"
}

def get_image(name, cat):
    for k, v in IMAGES.items():
        if k in name.lower():
            return v
    return CATEGORY_FALLBACKS.get(cat, "")

DATA = {
    "vegetables": [
        "Farm Potatoes", "Red Onions", "Fresh Tomatoes", "Green Cabbage", "Orange Carrots",
        "Broccoli Crowns", "Baby Spinach", "Red Bell Peppers", "Yellow Bell Peppers", "Green Peas",
        "Sweet Potatoes", "White Onions", "Cherry Tomatoes", "Purple Cabbage", "Baby Carrots",
        "Cauliflower Heads", "Kale Leaves", "Green Beans", "Zucchini Squash", "Eggplants"
    ],
    "fruits": [
        "Fuji Apples", "Ripe Bananas", "Navel Oranges", "Alphonso Mangoes", "Green Grapes",
        "Red Apples", "Plantains", "Blood Oranges", "Kesar Mangoes", "Red Grapes",
        "Strawberries", "Blueberries", "Raspberries", "Blackberries", "Pineapples",
        "Watermelons", "Cantaloupes", "Papayas", "Pomegranates", "Guavas"
    ],
    "grains": [
        "Basmati Rice", "Whole Wheat", "Sweet Corn", "Rolled Oats", "Brown Rice",
        "Jasmine Rice", "Durum Wheat", "Yellow Corn", "Steel Cut Oats", "Quinoa",
        "Millet", "Barley", "Sorghum", "Rye", "Buckwheat",
        "Amaranth", "Teff", "Wild Rice", "Spelt", "Bulgur"
    ],
    "dairy": [
        "Fresh Cow Milk", "Cheddar Cheese", "Salted Butter", "Greek Yogurt", "Buffalo Milk",
        "Mozzarella Cheese", "Unsalted Butter", "Plain Yogurt", "Paneer (Cottage Cheese)", "Ghee",
        "Heavy Cream", "Sour Cream", "Cream Cheese", "Swiss Cheese", "Gouda Cheese",
        "Parmesan Cheese", "Skim Milk", "Almond Milk (Vegan Dairy)", "Soy Milk", "Oat Milk"
    ],
    "herbs": [
        "Sweet Basil", "Peppermint", "Fresh Cilantro", "Curly Parsley", "Thai Basil",
        "Spearmint", "Coriander Leaves", "Italian Parsley", "Rosemary", "Thyme",
        "Oregano", "Chives", "Dill", "Lemongrass", "Sage",
        "Tarragon", "Curry Leaves", "Bay Leaves", "Fenugreek Leaves", "Microgreens"
    ]
}

UNITS = {
    "vegetables": "kg",
    "fruits": "kg",
    "grains": "kg",
    "dairy": "liter",
    "herbs": "bunch"
}

# Fix specific units
SPECIFIC_UNITS = {
    "Cheddar Cheese": "kg", "Mozzarella Cheese": "kg", "Paneer (Cottage Cheese)": "kg",
    "Swiss Cheese": "kg", "Gouda Cheese": "kg", "Parmesan Cheese": "kg", "Cream Cheese": "kg",
    "Salted Butter": "kg", "Unsalted Butter": "kg", "Ghee": "liter",
    "Greek Yogurt": "kg", "Plain Yogurt": "kg", "Sour Cream": "kg", "Heavy Cream": "liter"
}

products = []
for cat, items in DATA.items():
    base_unit = UNITS[cat]
    for item in items:
        seller = random.choice(sellers)
        unit = SPECIFIC_UNITS.get(item, base_unit)
        price = random.randint(20, 200) if cat == "vegetables" else \
                random.randint(50, 400) if cat == "fruits" else \
                random.randint(40, 150) if cat == "grains" else \
                random.randint(60, 600) if cat == "dairy" else \
                random.randint(10, 80)
        
        products.append({
            "name": item,
            "category": cat,
            "price": price,
            "unit": unit,
            "stock": random.randint(50, 500),
            "description": f"Fresh and high-quality {item} sourced directly from our farm. Guaranteed best price.",
            "imageUrl": get_image(item, cat),
            "sellerId": seller["id"],
            "sellerName": seller["name"],
            "sellerLocation": "Local Farm, India",
            "createdAt": datetime.utcnow(),
            "rating": round(random.uniform(3.5, 5.0), 1),
            "reviews": random.randint(5, 150)
        })

db.products.insert_many(products)
print(f"Successfully inserted {len(products)} carefully curated products with exact images and units!")
