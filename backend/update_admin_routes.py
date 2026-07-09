import re

with open('F:/Thanthi/AgroPulse AI/backend/routes/admin.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove approve/reject seller routes
text = re.sub(r'@admin_bp\.route\(\'/sellers/<seller_id>/approve\', methods=\[\'PUT\'\]\).*?except Exception as e:\s*return jsonify\(\{\'error\': str\(e\)\}\), 500\n\n', '', text, flags=re.DOTALL)
text = re.sub(r'@admin_bp\.route\(\'/sellers/<seller_id>/reject\', methods=\[\'PUT\'\]\).*?except Exception as e:\s*return jsonify\(\{\'error\': str\(e\)\}\), 500\n\n', '', text, flags=re.DOTALL)

# 2. Update stats route
text = re.sub(r'pending_sellers = sum\(.*?not u\.get\(\'isApproved\', False\)\n\s*\)\n', '', text, flags=re.DOTALL)
text = re.sub(r'sellers = sum\(1 for u in users if u\.get\(\'role\'\) == \'seller\'\)', '', text)
text = re.sub(r'pending_products = sum\(1 for p in products if not p\.get\(\'isApproved\', False\)\)', '', text)
text = re.sub(r'\'sellers\': sellers,', '', text)
text = re.sub(r'\'pendingSellerApprovals\': pending_sellers,', '', text)
text = re.sub(r'\'pendingProductApprovals\': pending_products,', '', text)

# 3. Add POST/PUT/DELETE products routes
new_routes = """
@admin_bp.route('/products', methods=['POST'])
@require_admin
def add_product():
    data = request.get_json()
    product = {
        'sellerId': 'admin',
        'sellerName': 'AgroPulse Admin',
        'name': data.get('name'),
        'description': data.get('description', ''),
        'category': data.get('category', 'vegetables'),
        'price': float(data.get('price', 0)),
        'unit': data.get('unit', 'kg'),
        'stock': int(data.get('stock', 0)),
        'imageUrl': data.get('imageUrl', ''),
        'images': data.get('images', []),
        'isApproved': True,
        'isAvailable': True,
        'rating': 0,
        'reviewCount': 0,
        'location': data.get('location', ''),
        'tags': data.get('tags', []),
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    try:
        result = db.products.insert_one(product)
        return jsonify({'success': True, 'productId': str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/products/<product_id>', methods=['PUT'])
@require_admin
def update_product(product_id):
    data = request.get_json()
    try:
        data['updatedAt'] = datetime.utcnow()
        db.products.update_one({'_id': ObjectId(product_id)}, {'$set': data})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/products/<product_id>', methods=['DELETE'])
@require_admin
def delete_product(product_id):
    try:
        db.products.delete_one({'_id': ObjectId(product_id)})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

"""

# Insert new routes before @admin_bp.route('/products/<product_id>/approve'
text = text.replace("@admin_bp.route('/products/<product_id>/approve', methods=['PUT'])", new_routes + "@admin_bp.route('/products/<product_id>/approve', methods=['PUT'])")

# 4. Remove approve/reject product routes
text = re.sub(r'@admin_bp\.route\(\'/products/<product_id>/approve\', methods=\[\'PUT\'\]\).*?except Exception as e:\s*return jsonify\(\{\'error\': str\(e\)\}\), 500\n\n', '', text, flags=re.DOTALL)
text = re.sub(r'@admin_bp\.route\(\'/products/<product_id>/reject\', methods=\[\'PUT\'\]\).*?except Exception as e:\s*return jsonify\(\{\'error\': str\(e\)\}\), 500\n\n', '', text, flags=re.DOTALL)


with open('F:/Thanthi/AgroPulse AI/backend/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(text)
