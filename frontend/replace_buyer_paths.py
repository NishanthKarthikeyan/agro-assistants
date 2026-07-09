import os

REPLACEMENTS = [
    ("navigate('/buyer/checkout')", "navigate('/checkout')"),
    ("buyer: '/buyer'", "buyer: '/dashboard'"),
    ("'/buyer/profile'", "'/profile'"),
    ('to="/buyer/orders"', 'to="/orders"'),
    ('to="/buyer/profile"', 'to="/profile"'),
    ("to: '/buyer',", "to: '/dashboard',"),
    ("to: '/buyer/profile',", "to: '/profile',"),
    ('<Link to="/buyer"', '<Link to="/dashboard"'),
    ("to={`/buyer/orders/", "to={`/orders/"),
    ("navigate(`/buyer/orders/", "navigate(`/orders/"),
    ("navigate('/buyer')", "navigate('/dashboard')"),
    ("'/buyer/shop'", "'/shop'"),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in REPLACEMENTS:
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(r"F:\Thanthi\AgroPulse AI\frontend\src"):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))

