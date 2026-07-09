"""
Buyer Blueprint — marketplace browsing, order placement and tracking.
Migrated from MongoDB to Firebase Firestore.
"""
from flask import Blueprint, request, jsonify
from database import db
from auth_utils import require_jwt
from datetime import datetime

buyer_bp = Blueprint('buyer', __name__, url_prefix='/api/buyer')

require_buyer = require_jwt(required_role='buyer')
require_auth = require_jwt()


def _doc_to_dict(doc):
    d = doc.to_dict()
    d['id'] = doc.id
    return d


# ─── Products (public browse) ────────────────────────────────────────────────

@buyer_bp.route('/products', methods=['GET'])
def get_products():
    """Returns all approved & available products. Public route."""
    category = request.args.get('category')
    search = request.args.get('search', '').lower()
    try:
        col = db.collection('products')
        query = col.where('isApproved', '==', True).where('isAvailable', '==', True)
        if category:
            query = query.where('category', '==', category)
        docs = query.stream()
        products = []
        for doc in docs:
            p = _doc_to_dict(doc)
            if search and search not in p.get('name', '').lower() and search not in p.get('description', '').lower():
                continue
            products.append(p)
        return jsonify({'products': products})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/products/<product_id>', methods=['GET'])
def get_product_detail(product_id):
    """Returns details for a single product with reviews. Public route."""
    try:
        doc = db.collection('products').document(product_id).get()
        if not doc.exists:
            return jsonify({'error': 'Product not found'}), 404
        p = _doc_to_dict(doc)

        reviews_docs = db.collection('reviews').where('productId', '==', product_id).stream()
        p['reviews'] = [_doc_to_dict(r) for r in reviews_docs]
        return jsonify(p)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/products', methods=['POST'])
@require_buyer
def add_buyer_product():
    data = request.get_json()
    required = ['name', 'description', 'price', 'stock', 'unit', 'category']
    for r in required:
        if not data.get(r):
            return jsonify({'error': f'Missing {r}'}), 400

    product = {
        'name': data['name'],
        'description': data['description'],
        'price': float(data['price']),
        'stock': int(data['stock']),
        'unit': data['unit'],
        'category': data['category'].lower(),
        'imageUrl': data.get('imageUrl', ''),
        'sellerId': request.uid,
        'sellerName': request.user.get('displayName', 'Unknown User'),
        'sellerLocation': request.user.get('address', 'Unknown Location'),
        'isApproved': True,
        'isAvailable': True,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    ref = db.collection('products').add(product)
    product['id'] = ref[1].id
    return jsonify(product), 201


# ─── Orders ─────────────────────────────────────────────────────────────────

@buyer_bp.route('/orders', methods=['POST'])
@require_buyer
def place_order():
    """Place a new order and notify the seller."""
    data = request.get_json()
    required = ['items', 'totalAmount', 'deliveryAddress']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing: {field}'}), 400

    if not data['items']:
        return jsonify({'error': 'Order must have at least one item'}), 400

    # Get sellerId from first item's product
    try:
        first_product_id = data['items'][0].get('productId')
        product_snap = db.collection('products').document(first_product_id).get()
        if not product_snap.exists:
            return jsonify({'error': 'Product not found'}), 404
        product_data = product_snap.to_dict()
        seller_id = product_data.get('sellerId', '')
        seller_name = product_data.get('sellerName', '')
    except Exception:
        seller_id = data.get('sellerId', '')
        seller_name = data.get('sellerName', '')

    order = {
        'buyerId': request.uid,
        'buyerName': request.user.get('displayName', ''),
        'buyerPhone': request.user.get('phone', ''),
        'sellerId': seller_id,
        'sellerName': seller_name,
        'deliveryAgentId': None,
        'items': data['items'],
        'totalAmount': float(data['totalAmount']),
        'status': 'pending',
        'paymentStatus': 'pending',
        'paymentMethod': data.get('paymentMethod', 'cod'),
        'razorpayOrderId': data.get('razorpayOrderId', ''),
        'razorpayPaymentId': '',
        'deliveryAddress': data['deliveryAddress'],
        'deliveryNotes': data.get('deliveryNotes', ''),
        'estimatedDelivery': None,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }

    try:
        # Decrement stock for each ordered item
        for item in data['items']:
            pid = item.get('productId')
            qty = int(item.get('quantity', 1))
            prod_snap = db.collection('products').document(pid).get()
            if prod_snap.exists:
                current_stock = prod_snap.to_dict().get('stock', 0)
                new_stock = max(0, current_stock - qty)
                db.collection('products').document(pid).update({
                    'stock': new_stock,
                    'updatedAt': datetime.utcnow(),
                })

        ref = db.collection('orders').add(order)
        order_id = ref[1].id

        # Send push notification using the notifications helper
        from routes.notifications import send_user_push_notification
        
        # 1. Notify buyer
        try:
            send_user_push_notification(
                user_id=request.uid,
                title="🛒 Order Placed Successfully!",
                body=f"Your order for ₹{data['totalAmount']} has been placed successfully.",
                payload_type="general",
                extra_data={'orderId': order_id}
            )
        except Exception as buyer_push_err:
            print(f"WARNING: Failed to send buyer order push: {buyer_push_err}")

        # 2. Notify seller
        if seller_id:
            try:
                send_user_push_notification(
                    user_id=seller_id,
                    title="📦 New Order Received!",
                    body=f"{request.user.get('displayName', 'A buyer')} placed an order for ₹{data['totalAmount']}.",
                    payload_type="general",
                    extra_data={'orderId': order_id}
                )
            except Exception as seller_push_err:
                print(f"WARNING: Failed to send seller order push: {seller_push_err}")

        return jsonify({'success': True, 'orderId': order_id}), 201
    except Exception as e:
        print(f'PLACE ORDER ERROR: {e}')
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/orders', methods=['GET'])
@require_buyer
def get_orders():
    try:
        docs = db.collection('orders').where('buyerId', '==', request.uid).stream()
        orders = [_doc_to_dict(d) for d in docs]
        orders.sort(key=lambda x: x.get('createdAt') or datetime.min, reverse=True)
        return jsonify({'orders': orders})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/orders/<order_id>', methods=['GET'])
@require_buyer
def get_order_detail(order_id):
    try:
        doc = db.collection('orders').document(order_id).get()
        if not doc.exists:
            return jsonify({'error': 'Order not found'}), 404
        order = _doc_to_dict(doc)
        if order.get('buyerId') != request.uid:
            return jsonify({'error': 'Forbidden'}), 403
        return jsonify(order)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/orders/<order_id>/cancel', methods=['PUT'])
@require_buyer
def cancel_order(order_id):
    try:
        doc = db.collection('orders').document(order_id).get()
        if not doc.exists:
            return jsonify({'error': 'Order not found'}), 404
        order = doc.to_dict()
        if order.get('buyerId') != request.uid:
            return jsonify({'error': 'Forbidden'}), 403
        if order.get('status') != 'pending':
            return jsonify({'error': 'Only pending orders can be cancelled'}), 400

        db.collection('orders').document(order_id).update({
            'status': 'cancelled',
            'updatedAt': datetime.utcnow(),
        })

        # Restore stock
        for item in order.get('items', []):
            pid = item.get('productId')
            qty = int(item.get('quantity', 1))
            prod_snap = db.collection('products').document(pid).get()
            if prod_snap.exists:
                current_stock = prod_snap.to_dict().get('stock', 0)
                db.collection('products').document(pid).update({
                    'stock': current_stock + qty,
                    'updatedAt': datetime.utcnow(),
                })

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Reviews ─────────────────────────────────────────────────────────────────

@buyer_bp.route('/reviews', methods=['POST'])
@require_buyer
def add_review():
    data = request.get_json()
    rating = int(data.get('rating', 0))
    if not 1 <= rating <= 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400

    review = {
        'productId': data.get('productId'),
        'buyerId': request.uid,
        'buyerName': request.user.get('displayName', ''),
        'rating': rating,
        'comment': data.get('comment', ''),
        'createdAt': datetime.utcnow(),
    }

    try:
        db.collection('reviews').add(review)
        product_id = data.get('productId')
        reviews_docs = list(db.collection('reviews').where('productId', '==', product_id).stream())
        ratings = [r.to_dict().get('rating', 0) for r in reviews_docs]
        avg = round(sum(ratings) / len(ratings), 1) if ratings else 0

        db.collection('products').document(product_id).update({
            'rating': avg,
            'reviewCount': len(ratings),
            'updatedAt': datetime.utcnow(),
        })
        return jsonify({'success': True}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Loans ──────────────────────────────────────────────────────────────────

@buyer_bp.route('/loans', methods=['POST'])
@require_auth
def apply_loan():
    data = request.get_json()
    application = {
        'userId': request.uid,
        'userName': data.get('fullName', ''),
        'phone': data.get('phone', ''),
        'aadhar': data.get('aadhar', ''),
        'address': data.get('address', ''),
        'landArea': data.get('landArea', ''),
        'farmType': data.get('farmType', ''),
        'loanType': data.get('loanType', ''),
        'loanAmount': data.get('loanAmount', ''),
        'purpose': data.get('purpose', ''),
        'repaymentPeriod': data.get('repaymentPeriod', ''),
        'bankName': data.get('bankName', ''),
        'accountNumber': data.get('accountNumber', ''),
        'ifscCode': data.get('ifscCode', ''),
        'status': 'submitted',
        'estimatedEmi': data.get('estimatedEmi', 0),
        'createdAt': datetime.utcnow(),
    }
    try:
        ref = db.collection('loanApplications').add(application)
        app_id = ref[1].id
        
        # Send push notification to the applicant
        try:
            from routes.notifications import send_user_push_notification
            send_user_push_notification(
                user_id=request.uid,
                title="🌾 Loan Application Submitted",
                body=f"Your application for a {data.get('loanType', 'Agri Loan')} of ₹{data.get('loanAmount', '0')} has been submitted successfully.",
                payload_type="loan_status",
                extra_data={'applicationId': app_id}
            )
        except Exception as loan_push_err:
            print(f"WARNING: Failed to send loan application push: {loan_push_err}")

        return jsonify({'success': True, 'applicationId': app_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Wishlists ──────────────────────────────────────────────────────────────

@buyer_bp.route('/wishlists', methods=['GET'])
@require_buyer
def get_wishlists():
    try:
        docs = db.collection('wishlists').where('buyerId', '==', request.uid).stream()
        items = {}
        for doc in docs:
            d = _doc_to_dict(doc)
            items[d.get('productId')] = d
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/wishlists', methods=['POST'])
@require_buyer
def add_to_wishlist():
    data = request.get_json()
    product_id = data.get('productId')
    if not product_id:
        return jsonify({'error': 'productId required'}), 400

    doc = {
        'buyerId': request.uid,
        'productId': product_id,
        'productName': data.get('productName', ''),
        'price': data.get('price', 0),
        'unit': data.get('unit', 'kg'),
        'imageUrl': data.get('imageUrl', ''),
        'sellerId': data.get('sellerId', ''),
        'sellerName': data.get('sellerName', ''),
        'stock': data.get('stock', 0),
        'addedAt': datetime.utcnow(),
    }
    try:
        # Use compound key: buyerId_productId as document ID for upsert
        wish_id = f"{request.uid}_{product_id}"
        db.collection('wishlists').document(wish_id).set(doc)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@buyer_bp.route('/wishlists/<product_id>', methods=['DELETE'])
@require_buyer
def remove_from_wishlist(product_id):
    try:
        wish_id = f"{request.uid}_{product_id}"
        db.collection('wishlists').document(wish_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
