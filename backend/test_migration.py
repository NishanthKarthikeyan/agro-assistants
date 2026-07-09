import requests
import pymongo
import time
import uuid
from bson.objectid import ObjectId

API_URL = "http://127.0.0.1:5000/api"
MONGO_URI = "mongodb+srv://karthickkrish235_db_user:VcfDwrlYIcMM6gjy@cluster0.r2tbqmq.mongodb.net/?appName=Cluster0"

client = pymongo.MongoClient(MONGO_URI)
db = client['agropulse']

unique_id = str(uuid.uuid4())[:8]
test_email = f"testuser_{unique_id}@example.com"
test_password = "password123"

print("--- POST-MIGRATION VALIDATION AUDIT ---")

results = []

def run_test(name, func):
    try:
        print(f"\nRunning: {name}...")
        passed = func()
        if passed:
            print(f"PASS: {name}")
            results.append((name, "PASS"))
        else:
            print(f"FAIL: {name}")
            results.append((name, "FAIL"))
    except Exception as e:
        print(f"FAIL: {name} (Exception: {e})")
        results.append((name, "FAIL"))

token = ""
uid = ""
product_id = ""

# 1. Create a new user
def test_create_user():
    global token, uid
    res = requests.post(f"{API_URL}/auth/register", json={
        "email": test_email,
        "password": test_password,
        "role": "buyer",
        "displayName": "Test Buyer"
    })
    
    if res.status_code != 201:
        print("API Response Error:", res.json())
        return False
        
    data = res.json()
    token = data.get("token")
    user = data.get("user")
    
    if not token or not user:
        print("Missing token or user in response")
        return False
        
    uid = user.get("uid")
    
    # Verify MongoDB
    user_doc = db.users.find_one({"_id": ObjectId(uid)})
    if not user_doc:
        print("User not found in MongoDB")
        return False
        
    return True

run_test("Create a new user", test_create_user)

# 2. Login with JWT
def test_login():
    global token
    res = requests.post(f"{API_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    
    if res.status_code != 200:
        print("API Response Error:", res.json())
        return False
        
    data = res.json()
    token = data.get("token")
    if not token:
        return False
        
    return True

run_test("Login with JWT", test_login)

# Now elevate user to 'seller' so they can create a product
def test_elevate_to_seller():
    # Update directly in DB for testing purposes
    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"role": "seller", "isApproved": True}})
    
    # Re-login to get updated token
    global token
    res = requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": test_password})
    token = res.json().get("token")
    return True

run_test("Elevate user to seller (Setup)", test_elevate_to_seller)

# 3. Create a product
def test_create_product():
    global product_id
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{API_URL}/seller/products", json={
        "name": f"Test Product {unique_id}",
        "category": "vegetables",
        "price": 50,
        "unit": "kg",
        "stock": 100,
        "description": "Fresh test product"
    }, headers=headers)
    
    if res.status_code != 201:
        print("API Response Error:", res.json())
        return False
        
    product_id = res.json().get("productId")
    if not product_id:
        return False
        
    # Verify MongoDB
    prod_doc = db.products.find_one({"_id": ObjectId(product_id)})
    if not prod_doc:
        print("Product not found in MongoDB")
        return False
        
    return True

run_test("Create a product", test_create_product)

# 4. Fetch products
def test_fetch_products():
    # Approve product first
    db.products.update_one({"_id": ObjectId(product_id)}, {"$set": {"isApproved": True, "isAvailable": True}})
    
    res = requests.get(f"{API_URL}/buyer/products")
    
    if res.status_code != 200:
        print("API Response Error:", res.json())
        return False
        
    products = res.json().get("products", [])
    
    # Check if our created product is in the list
    found = False
    for p in products:
        if p.get("id") == product_id:
            found = True
            break
            
    if not found:
        print("Created product not found in fetch list")
        return False
        
    return True

run_test("Fetch products", test_fetch_products)

# Revert to buyer role
def test_revert_to_buyer():
    db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"role": "buyer"}})
    global token
    res = requests.post(f"{API_URL}/auth/login", json={"email": test_email, "password": test_password})
    token = res.json().get("token")
    return True

run_test("Revert user to buyer (Setup)", test_revert_to_buyer)

# 5. Create an order
def test_create_order():
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{API_URL}/buyer/orders", json={
        "items": [
            {
                "productId": product_id,
                "name": "Test Product",
                "price": 50,
                "quantity": 2
            }
        ],
        "totalAmount": 100,
        "deliveryAddress": "123 Test St",
        "paymentMethod": "cod"
    }, headers=headers)
    
    if res.status_code != 201:
        print("API Response Error:", res.json())
        return False
        
    order_id = res.json().get("orderId")
    if not order_id:
        return False
        
    # Verify MongoDB
    order_doc = db.orders.find_one({"_id": ObjectId(order_id)})
    if not order_doc:
        print("Order not found in MongoDB")
        return False
        
    return True

run_test("Create an order", test_create_order)

# 6. Add wishlist item
def test_add_wishlist():
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{API_URL}/buyer/wishlists", json={
        "productId": product_id,
        "productName": "Test Product",
        "price": 50
    }, headers=headers)
    
    if res.status_code != 200:
        print("API Response Error:", res.json())
        return False
        
    # Verify MongoDB
    wishlist_doc = db.wishlists.find_one({"buyerId": uid, "productId": product_id})
    if not wishlist_doc:
        print("Wishlist item not found in MongoDB")
        return False
        
    return True

run_test("Add wishlist item", test_add_wishlist)

# 7. Submit loan request
def test_submit_loan():
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{API_URL}/buyer/loans", json={
        "fullName": "Test User",
        "phone": "9876543210",
        "loanType": "Kisan Credit Card",
        "loanAmount": "50000",
        "purpose": "Seeds",
        "repaymentPeriod": "12"
    }, headers=headers)
    
    if res.status_code != 201:
        print("API Response Error:", res.json())
        return False
        
    app_id = res.json().get("applicationId")
    if not app_id:
        return False
        
    # Verify MongoDB
    loan_doc = db.loanApplications.find_one({"_id": ObjectId(app_id)})
    if not loan_doc:
        print("Loan application not found in MongoDB")
        return False
        
    return True

run_test("Submit loan request", test_submit_loan)

print("\n--- FINAL REPORT ---")
with open("validation_report.txt", "w", encoding="utf-8") as f:
    f.write("Post-Migration Validation Audit Report\n")
    f.write("=======================================\n\n")
    for name, status in results:
        # Don't include setup
        if "Setup" in name: continue
        line = f"{status} - {name}\n"
        print(line, end="")
        f.write(line)
