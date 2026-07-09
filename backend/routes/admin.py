"""
Admin Blueprint — Full platform management: users, products, orders, analytics.
Migrated from MongoDB to Firebase Firestore.
"""
from flask import Blueprint, request, jsonify
from database import db
from auth_utils import require_jwt
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
require_admin = require_jwt(required_role='admin')


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _doc_to_dict(doc):
    """Convert a Firestore document snapshot to a plain dict with 'id'."""
    d = doc.to_dict()
    d['id'] = doc.id
    return d


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_stats():
    """KPI dashboard: users, orders, revenue, pending approvals."""
    try:
        users = [_doc_to_dict(d) for d in db.collection('users').stream()]
        buyers = sum(1 for u in users if u.get('role') == 'buyer')
        delivery_agents = sum(1 for u in users if u.get('role') == 'delivery')

        orders = [_doc_to_dict(d) for d in db.collection('orders').stream()]
        total_revenue = sum(o.get('totalAmount', 0) for o in orders if o.get('paymentStatus') == 'paid')
        pending_orders = sum(1 for o in orders if o.get('status') == 'pending')

        products = [_doc_to_dict(d) for d in db.collection('products').stream()]

        return jsonify({
            'totalUsers': len(users),
            'buyers': buyers,
            'deliveryAgents': delivery_agents,
            'totalOrders': len(orders),
            'pendingOrders': pending_orders,
            'totalRevenue': total_revenue,
            'totalProducts': len(products),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── User Management ─────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@require_admin
def get_users():
    role_filter = request.args.get('role')
    try:
        col = db.collection('users')
        if role_filter:
            docs = col.where('role', '==', role_filter).stream()
        else:
            docs = col.stream()
        users = [_doc_to_dict(d) for d in docs]
        return jsonify({'users': users})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<user_id>/toggle-active', methods=['PUT'])
@require_admin
def toggle_user_active(user_id):
    data = request.get_json()
    is_active = data.get('isActive', True)
    try:
        db.collection('users').document(user_id).update({
            'isActive': is_active,
            'updatedAt': datetime.utcnow(),
        })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['PUT'])
@require_admin
def update_user(user_id):
    data = request.get_json()
    data['updatedAt'] = datetime.utcnow()
    try:
        db.collection('users').document(user_id).update(data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
@require_admin
def change_user_role(user_id):
    data = request.get_json()
    new_role = data.get('role')
    if not new_role:
        return jsonify({'error': 'Role is required'}), 400
    try:
        db.collection('users').document(user_id).update({
            'role': new_role,
            'updatedAt': datetime.utcnow(),
        })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Product Moderation ───────────────────────────────────────────────────────

@admin_bp.route('/products/pending', methods=['GET'])
@require_admin
def get_pending_products():
    try:
        docs = db.collection('products').where('isApproved', '==', False).stream()
        products = [_doc_to_dict(d) for d in docs]
        return jsonify({'products': products})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/products', methods=['GET'])
@require_admin
def get_all_products():
    approval_filter = request.args.get('approved')
    try:
        col = db.collection('products')
        if approval_filter == 'true':
            docs = col.where('isApproved', '==', True).stream()
        elif approval_filter == 'false':
            docs = col.where('isApproved', '==', False).stream()
        else:
            docs = col.stream()
        products = [_doc_to_dict(d) for d in docs]
        return jsonify({'products': products})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/products/<product_id>/approve', methods=['PUT'])
@require_admin
def approve_product(product_id):
    data = request.get_json() or {}
    approved = data.get('isApproved', True)
    try:
        db.collection('products').document(product_id).update({
            'isApproved': approved,
            'updatedAt': datetime.utcnow(),
        })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        ref = db.collection('products').add(product)
        doc_id = ref[1].id
        return jsonify({'success': True, 'productId': doc_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/products/<product_id>', methods=['PUT'])
@require_admin
def edit_product(product_id):
    data = request.get_json()
    data['updatedAt'] = datetime.utcnow()
    try:
        db.collection('products').document(product_id).update(data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/products/<product_id>', methods=['DELETE'])
@require_admin
def delete_product(product_id):
    try:
        db.collection('products').document(product_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Order Management ─────────────────────────────────────────────────────────

@admin_bp.route('/orders', methods=['GET'])
@require_admin
def get_all_orders():
    status_filter = request.args.get('status')
    try:
        col = db.collection('orders')
        if status_filter:
            docs = col.where('status', '==', status_filter).stream()
        else:
            docs = col.stream()
        orders = [_doc_to_dict(d) for d in docs]
        orders.sort(key=lambda x: x.get('createdAt') or datetime.min, reverse=True)
        return jsonify({'orders': orders})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/orders/<order_id>/assign', methods=['PUT'])
@require_admin
def assign_delivery_agent(order_id):
    data = request.get_json()
    agent_id = data.get('agentId')
    if not agent_id:
        return jsonify({'error': 'agentId is required'}), 400
    try:
        agent_snap = db.collection('users').document(agent_id).get()
        agent_name = agent_snap.to_dict().get('displayName', '') if agent_snap.exists else ''

        db.collection('orders').document(order_id).update({
            'deliveryAgentId': agent_id,
            'deliveryAgentName': agent_name,
            'updatedAt': datetime.utcnow(),
        })

        # Mark agent unavailable
        agents = db.collection('deliveryAgents').where('userId', '==', agent_id).stream()
        for a in agents:
            a.reference.update({'isAvailable': False, 'currentOrderId': order_id})

        # Notify agent
        db.collection('notifications').add({
            'userId': agent_id,
            'type': 'order_update',
            'title': '📦 New Delivery Assigned',
            'message': 'A new order has been assigned to you for delivery.',
            'isRead': False,
            'orderId': order_id,
            'createdAt': datetime.utcnow(),
        })

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/orders/<order_id>/status', methods=['PUT'])
@require_admin
def override_order_status(order_id):
    data = request.get_json()
    new_status = data.get('status')
    valid_statuses = ['pending', 'confirmed', 'packed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status: {new_status}'}), 400
    try:
        db.collection('orders').document(order_id).update({
            'status': new_status,
            'updatedAt': datetime.utcnow(),
        })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Delivery Agents ──────────────────────────────────────────────────────────

@admin_bp.route('/delivery-agents', methods=['GET'])
@require_admin
def get_delivery_agents():
    try:
        docs = db.collection('deliveryAgents').stream()
        agents = [_doc_to_dict(d) for d in docs]
        return jsonify({'agents': agents})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/delivery-agents', methods=['POST'])
@require_admin
def create_delivery_agent():
    data = request.get_json()
    agent = {
        'userId': data.get('userId', ''),
        'name': data.get('name', ''),
        'phone': data.get('phone', ''),
        'isAvailable': True,
        'currentOrderId': None,
        'totalDeliveries': 0,
        'rating': 0,
        'createdAt': datetime.utcnow(),
    }
    try:
        ref = db.collection('deliveryAgents').add(agent)
        return jsonify({'success': True, 'agentId': ref[1].id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/delivery-agents/<agent_id>', methods=['PUT'])
@require_admin
def update_delivery_agent(agent_id):
    data = request.get_json()
    try:
        db.collection('deliveryAgents').document(agent_id).update(data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Analytics ────────────────────────────────────────────────────────────────

@admin_bp.route('/analytics', methods=['GET'])
@require_admin
def get_analytics():
    try:
        from dateutil.relativedelta import relativedelta
        import calendar

        orders_data = [_doc_to_dict(d) for d in db.collection('orders').stream()]
        products_docs = {d.id: d.to_dict() for d in db.collection('products').stream()}

        category_revenue = {}
        product_revenue = {}
        for order in orders_data:
            if order.get('paymentStatus') == 'paid':
                for item in order.get('items', []):
                    pid = item.get('productId', '')
                    category = products_docs.get(pid, {}).get('category', 'other')
                    rev = item.get('price', 0) * item.get('quantity', 1)
                    category_revenue[category] = category_revenue.get(category, 0) + rev
                    name = item.get('productName', 'Unknown')
                    product_revenue[name] = product_revenue.get(name, 0) + rev

        top_products = sorted(product_revenue.items(), key=lambda x: x[1], reverse=True)[:8]

        monthly_data = []
        user_growth = []
        now = datetime.utcnow()
        users_data = [_doc_to_dict(d) for d in db.collection('users').stream()]

        for i in range(5, -1, -1):
            target_date = now - relativedelta(months=i)
            target_month = target_date.month
            target_year = target_date.year
            month_label = calendar.month_abbr[target_month]

            month_rev = sum(
                o.get('totalAmount', 0) for o in orders_data
                if o.get('paymentStatus') == 'paid'
                and isinstance(o.get('createdAt'), datetime)
                and o['createdAt'].month == target_month
                and o['createdAt'].year == target_year
            )
            monthly_data.append({'month': month_label, 'revenue': round(month_rev)})

            month_users = sum(
                1 for u in users_data
                if isinstance(u.get('createdAt'), datetime)
                and u['createdAt'].month == target_month
                and u['createdAt'].year == target_year
            )
            user_growth.append({'month': month_label, 'users': month_users})

        paid_orders = [o for o in orders_data if o.get('paymentStatus') == 'paid']

        return jsonify({
            'categoryRevenue': category_revenue,
            'topProducts': [{'name': k, 'revenue': v} for k, v in top_products],
            'totalOrders': len(orders_data),
            'paidOrdersCount': len(paid_orders),
            'totalUsers': len(users_data),
            'totalRevenue': sum(o.get('totalAmount', 0) for o in paid_orders),
            'monthlyData': monthly_data,
            'userGrowth': user_growth,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
