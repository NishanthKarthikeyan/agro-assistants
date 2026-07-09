"""
Delivery Agent Blueprint — View and update assigned orders, toggle availability.
Migrated from MongoDB to Firebase Firestore.
"""
from flask import Blueprint, request, jsonify
from database import db
from auth_utils import require_jwt
from datetime import datetime

delivery_bp = Blueprint('delivery', __name__, url_prefix='/api/delivery')
require_delivery = require_jwt(required_role='delivery')


def _doc_to_dict(doc):
    d = doc.to_dict()
    d['id'] = doc.id
    return d


@delivery_bp.route('/orders', methods=['GET'])
@require_delivery
def get_assigned_orders():
    try:
        docs = db.collection('orders').where('deliveryAgentId', '==', request.uid).stream()
        orders = [_doc_to_dict(d) for d in docs]
        orders.sort(key=lambda x: x.get('createdAt') or datetime.min, reverse=True)
        return jsonify({'orders': orders})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@delivery_bp.route('/orders/<order_id>/status', methods=['PUT'])
@require_delivery
def update_delivery_status(order_id):
    data = request.get_json()
    new_status = data.get('status')

    valid_transitions = {
        'packed': 'dispatched',
        'dispatched': 'out_for_delivery',
        'out_for_delivery': 'delivered',
    }

    try:
        doc = db.collection('orders').document(order_id).get()
        if not doc.exists:
            return jsonify({'error': 'Order not found'}), 404

        order_data = doc.to_dict()
        if order_data.get('deliveryAgentId') != request.uid:
            return jsonify({'error': 'This order is not assigned to you'}), 403

        current_status = order_data.get('status')
        if valid_transitions.get(current_status) != new_status:
            return jsonify({'error': f'Cannot transition from {current_status} to {new_status}'}), 400

        update_data = {
            'status': new_status,
            'updatedAt': datetime.utcnow(),
        }
        if new_status == 'delivered' and data.get('proofImageUrl'):
            update_data['deliveryProofUrl'] = data.get('proofImageUrl')

        db.collection('orders').document(order_id).update(update_data)

        # Notify buyer
        status_messages = {
            'dispatched': '🚚 Your order has been dispatched!',
            'out_for_delivery': '📍 Your order is out for delivery!',
            'delivered': '🎉 Your order has been delivered!',
        }
        db.collection('notifications').add({
            'userId': order_data.get('buyerId'),
            'type': 'order_update',
            'title': 'Order Update',
            'message': status_messages.get(new_status, f'Order status: {new_status}'),
            'isRead': False,
            'orderId': order_id,
            'createdAt': datetime.utcnow(),
        })

        # If delivered, mark agent available again
        if new_status == 'delivered':
            agents = db.collection('deliveryAgents').where('userId', '==', request.uid).stream()
            for a in agents:
                agent_data = a.to_dict()
                a.reference.update({
                    'isAvailable': True,
                    'currentOrderId': None,
                    'totalDeliveries': agent_data.get('totalDeliveries', 0) + 1,
                })

        return jsonify({'success': True, 'newStatus': new_status})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@delivery_bp.route('/availability', methods=['PUT'])
@require_delivery
def toggle_availability():
    data = request.get_json()
    is_available = data.get('isAvailable', True)
    try:
        agents = db.collection('deliveryAgents').where('userId', '==', request.uid).stream()
        found = False
        for a in agents:
            a.reference.update({'isAvailable': is_available})
            found = True
        if not found:
            return jsonify({'error': 'Delivery agent record not found. Contact admin.'}), 404
        return jsonify({'success': True, 'isAvailable': is_available})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@delivery_bp.route('/profile', methods=['GET'])
@require_delivery
def get_delivery_profile():
    try:
        agents = list(db.collection('deliveryAgents').where('userId', '==', request.uid).stream())
        if not agents:
            return jsonify({'error': 'Delivery agent record not found.'}), 404
        agent_data = _doc_to_dict(agents[0])
        profile = {
            **request.user,
            'agentData': agent_data,
        }
        return jsonify({'profile': profile})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
