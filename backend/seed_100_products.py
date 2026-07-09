import os
import random
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

# Clear old seed data if desired? No, we will just insert new ones to reach 100+.
# Actually, the user wants "add 20 products for each totally 100". I will insert exactly 100.

# 1. Names
vegetable_names = [
    "Fresh Tomatoes", "Farm Potatoes", "Red Onions", "Green Cabbage", "Cauliflower Heads",
    "Broccoli Crowns", "Orange Carrots", "Red Bell Peppers", "Yellow Bell Peppers", "Green Capsicum",
    "Fresh Spinach (Palak)", "White Radish", "Purple Eggplant (Brinjal)", "Green Zucchini", "Garlic Bulbs",
    "Fresh Ginger", "Bitter Gourd (Karela)", "Bottle Gourd (Lauki)", "Fresh Okra (Bhindi)", "Sweet Pumpkin"
]

fruit_names = [
    "Kashmiri Apples", "Robusta Bananas", "Nagpur Oranges", "Alphonso Mangoes", "Green Seedless Grapes",
    "Fresh Strawberries", "Juicy Watermelon", "Sweet Pineapple", "Ripe Papaya", "Fresh Lemons",
    "Ruby Pomegranate", "Allahabad Guava", "Imported Kiwi", "Juicy Peaches", "Fresh Plums",
    "Sweet Cherries", "Fresh Blueberries", "Red Raspberries", "Green Pears", "Hass Avocado"
]

grain_names = [
    "Golden Wheat (Gehu)", "Premium Basmati Rice", "Sona Masuri Rice", "Organic Brown Rice", "Pearl Millet (Bajra)",
    "Finger Millet (Ragi)", "Sorghum (Jowar)", "Sweet Corn (Maize)", "Pearl Barley", "Rolled Oats",
    "Organic Quinoa", "Amaranth Seeds", "Buckwheat Groats", "Black Gram (Urad Dal)", "Green Gram (Moong Dal)",
    "Kabuli Chickpeas", "Kidney Beans (Rajma)", "Red Lentils (Masoor)", "Pigeon Pea (Toor Dal)", "Dried Soybeans"
]

dairy_names = [
    "Fresh Cow Milk", "Rich Buffalo Milk", "Premium A2 Milk", "Fresh Goat Milk", "Soft Paneer",
    "Block Tofu", "Aged Cheddar Cheese", "Fresh Mozzarella", "Processed Cheese Slices", "Pure Cow Ghee",
    "Buffalo Ghee", "Traditional Bilona Ghee", "Unsalted White Butter", "Salted Yellow Butter", "Fresh Curd (Yogurt)",
    "Thick Greek Yogurt", "Spiced Buttermilk", "Fresh Dairy Cream", "Unsweetened Khoya", "Sweetened Condensed Milk"
]

herb_names = [
    "Fresh Coriander Leaves", "Mint Leaves (Pudina)", "Fresh Curry Leaves", "Italian Sweet Basil", "Holy Basil (Tulsi)",
    "Lemongrass Stalks", "Fresh Rosemary", "Fresh Thyme", "Curly Parsley", "Fresh Oregano",
    "Fresh Sage Leaves", "Fresh Dill Leaves", "Green Chives", "Cilantro Bunches", "Fenugreek Leaves (Methi)",
    "Dried Bay Leaves", "Fennel Seeds (Saunf)", "Green Cardamom Pods", "Whole Cloves", "Black Peppercorns"
]

# 2. Images
images = {
    "vegetables": [
        "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=600&auto=format&fit=crop", # Veg mix
        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=600&auto=format&fit=crop", # Tomato
        "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=600&auto=format&fit=crop", # Potato
        "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=600&auto=format&fit=crop", # Onion
        "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=600&auto=format&fit=crop", # Carrot
        "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=600&auto=format&fit=crop", # Broccoli
        "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=600&auto=format&fit=crop", # Peppers
        "https://images.unsplash.com/photo-1587049352847-4d4b12404113?q=80&w=600&auto=format&fit=crop"  # Garlic
    ],
    "fruits": [
        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=600&auto=format&fit=crop", # Fruit mix
        "https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?q=80&w=600&auto=format&fit=crop", # Apple
        "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?q=80&w=600&auto=format&fit=crop", # Banana
        "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?q=80&w=600&auto=format&fit=crop", # Orange
        "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=600&auto=format&fit=crop", # Mango
        "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=600&auto=format&fit=crop", # Strawberry
        "https://images.unsplash.com/photo-1587049352851-8d4e89134780?q=80&w=600&auto=format&fit=crop", # Watermelon
        "https://images.unsplash.com/photo-1615486171448-43314041b312?q=80&w=600&auto=format&fit=crop"  # Pomegranate
    ],
    "grains": [
        "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?q=80&w=600&auto=format&fit=crop", # Wheat
        "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600&auto=format&fit=crop", # Rice/Grains
        "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=600&auto=format&fit=crop", # Corn
        "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?q=80&w=600&auto=format&fit=crop", # Oats
        "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600&auto=format&fit=crop", # Grains
        "https://images.unsplash.com/photo-1600857321523-ed2bb6524806?q=80&w=600&auto=format&fit=crop", # Pulses
        "https://images.unsplash.com/photo-1621245034638-31620c354734?q=80&w=600&auto=format&fit=crop", # Chickpeas
        "https://images.unsplash.com/photo-1536640533501-8321db80f2d1?q=80&w=600&auto=format&fit=crop"  # Lentils
    ],
    "dairy": [
        "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop", # Milk
        "https://images.unsplash.com/photo-1631452180519-c014fe946cea?q=80&w=600&auto=format&fit=crop", # Paneer
        "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=600&auto=format&fit=crop", # Butter
        "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=600&auto=format&fit=crop", # Cheese
        "https://images.unsplash.com/photo-1628042456073-196fc9dfb01e?q=80&w=600&auto=format&fit=crop", # Ghee
        "https://images.unsplash.com/photo-1559598467-f8b76c8155d0?q=80&w=600&auto=format&fit=crop", # Milk bottle
        "https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=600&auto=format&fit=crop", # Yogurt
        "https://images.unsplash.com/photo-1600718374662-0483d2b9da44?q=80&w=600&auto=format&fit=crop"  # Curd
    ],
    "herbs": [
        "https://images.unsplash.com/photo-1579935110378-81262796945f?q=80&w=600&auto=format&fit=crop", # Coriander
        "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?q=80&w=600&auto=format&fit=crop", # Basil
        "https://images.unsplash.com/photo-1594834749740-74b3e65ab4e8?q=80&w=600&auto=format&fit=crop", # Mint
        "https://images.unsplash.com/photo-1515471209610-dae1c92d8777?q=80&w=600&auto=format&fit=crop", # Lemongrass
        "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop", # Spices
        "https://images.unsplash.com/photo-1596649283733-461329215099?q=80&w=600&auto=format&fit=crop", # Rosemary
        "https://images.unsplash.com/photo-1606913084603-3e7702b01627?q=80&w=600&auto=format&fit=crop", # Oregano
        "https://images.unsplash.com/photo-1608447814986-7a701980ee91?q=80&w=600&auto=format&fit=crop"  # Thyme
    ]
}

sellers = ["Ramesh Kumar Farms", "Green Valley Organics", "Sunny Orchards", "Punjab Agri Producers", "Kerala Spices Co.", "Nandi Dairy Farms"]
locations = ["Coimbatore, TN", "Ooty, TN", "Nashik, MH", "Amritsar, PB", "Munnar, KL", "Bangalore, KA", "Pune, MH", "Jaipur, RJ"]

def generate_products(category, names):
    docs = []
    for i, name in enumerate(names):
        price = random.randint(20, 500)
        stock = random.randint(10, 1000)
        img_url = random.choice(images[category])
        seller = random.choice(sellers)
        location = random.choice(locations)
        
        docs.append({
            "sellerId": f"seed_seller_{random.randint(1,10)}",
            "sellerName": seller,
            "name": name,
            "description": f"High quality, fresh {name.lower()} sourced directly from {location}.",
            "category": category,
            "price": float(price),
            "unit": random.choice(["kg", "piece", "dozen", "liter", "bunch", "packet"]),
            "stock": stock,
            "imageUrl": img_url,
            "images": [],
            "isApproved": True,
            "isAvailable": True,
            "rating": round(random.uniform(3.8, 5.0), 1),
            "reviewCount": random.randint(0, 500),
            "location": location,
            "tags": [category, name.split()[-1].lower(), "fresh"],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })
    return docs

all_products = []
all_products.extend(generate_products("vegetables", vegetable_names))
all_products.extend(generate_products("fruits", fruit_names))
all_products.extend(generate_products("grains", grain_names))
all_products.extend(generate_products("dairy", dairy_names))
all_products.extend(generate_products("herbs", herb_names))

print(f"Prepared {len(all_products)} total products.")

# Insert to DB
result = db.products.insert_many(all_products)
print(f"Successfully inserted {len(result.inserted_ids)} products across all categories!")
