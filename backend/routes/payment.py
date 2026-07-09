"""
Payment Blueprint — Razorpay order creation, verification, webhooks, and refunds.
Migrated from MongoDB to Firebase Firestore.
"""
import os
import hmac
import hashlib
import razorpay
from flask import Blueprint, request, jsonify
from database import db
from auth_utils import require_jwt
from datetime import datetime

payment_bp = Blueprint('payment', __name__, url_prefix='/api/payment')

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')


def get_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


require_auth = require_jwt()
require_admin = require_jwt(required_role='admin')


# ─── Create Razorpay Order ────────────────────────────────────────────────────

@payment_bp.route('/create-order', methods=['POST'])
@require_auth
def create_order():
    data = request.get_json()
    amount = data.get('amount')
    order_id = data.get('orderId', '')

    if not amount or amount <= 0:
        return jsonify({'error': 'Valid amount is required'}), 400

    client = get_razorpay_client()
    if not client:
        mock_id = f"mock_{order_id}"
        if order_id:
            db.collection('orders').document(order_id).update({
                'razorpayOrderId': mock_id,
                'updatedAt': datetime.utcnow(),
            })
        return jsonify({
            'razorpay_order_id': mock_id,
            'amount': int(amount * 100),
            'currency': 'INR',
        })

    try:
        amount_paise = int(float(amount) * 100)
        options = {
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': order_id,
            'payment_capture': 1,
        }
        razorpay_order = client.order.create(data=options)

        if order_id:
            db.collection('orders').document(order_id).update({
                'razorpayOrderId': razorpay_order['id'],
                'updatedAt': datetime.utcnow(),
            })

        return jsonify({
            'razorpay_order_id': razorpay_order['id'],
            'amount': razorpay_order['amount'],
            'currency': razorpay_order['currency'],
        })
    except Exception as e:
        print(f'RAZORPAY CREATE ORDER ERROR: {e}')
        return jsonify({'error': str(e)}), 500


# ─── Verify Payment ───────────────────────────────────────────────────────────

@payment_bp.route('/verify', methods=['POST'])
@require_auth
def verify_payment():
    data = request.get_json()
    razorpay_order_id = data.get('razorpay_order_id', '')
    razorpay_payment_id = data.get('razorpay_payment_id', '')
    razorpay_signature = data.get('razorpay_signature', '')
    order_id = data.get('order_id', '')

    # Handle mock payments
    if razorpay_order_id.startswith('mock_'):
        if order_id:
            db.collection('orders').document(order_id).update({
                'paymentStatus': 'paid',
                'razorpayOrderId': razorpay_order_id,
                'razorpayPaymentId': 'mock_payment',
                'updatedAt': datetime.utcnow(),
            })
        return jsonify({'success': True, 'mock': True})

    client = get_razorpay_client()
    if not client:
        return jsonify({'error': 'Payment gateway not configured'}), 500

    try:
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        }
        client.utility.verify_payment_signature(params_dict)

        if order_id:
            order_snap = db.collection('orders').document(order_id).get()
            if order_snap.exists:
                order_doc = order_snap.to_dict()
                db.collection('orders').document(order_id).update({
                    'paymentStatus': 'paid',
                    'razorpayOrderId': razorpay_order_id,
                    'razorpayPaymentId': razorpay_payment_id,
                    'updatedAt': datetime.utcnow(),
                })

                seller_id = order_doc.get('sellerId')
                if seller_id:
                    db.collection('notifications').add({
                        'userId': seller_id,
                        'type': 'payment',
                        'title': '💰 Payment Received!',
                        'message': f"A payment of ₹{order_doc.get('totalAmount', 0)} was successful for Order #{order_id[-6:].upper()}",
                        'isRead': False,
                        'createdAt': datetime.utcnow(),
                    })

        return jsonify({'success': True})
    except razorpay.errors.SignatureVerificationError:
        return jsonify({'error': 'Invalid payment signature'}), 400
    except Exception as e:
        print(f'RAZORPAY VERIFY ERROR: {e}')
        return jsonify({'error': str(e)}), 500


# ─── Razorpay Webhook ─────────────────────────────────────────────────────────

@payment_bp.route('/webhook', methods=['POST'])
def razorpay_webhook():
    if not RAZORPAY_WEBHOOK_SECRET:
        return jsonify({'status': 'webhook secret not configured'}), 200

    payload = request.get_data(as_text=True)
    received_signature = request.headers.get('X-Razorpay-Signature', '')

    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, received_signature):
        return jsonify({'error': 'Invalid webhook signature'}), 400

    event = request.get_json()
    event_type = event.get('event', '')

    if event_type == 'payment.captured':
        payment = event.get('payload', {}).get('payment', {}).get('entity', {})
        order_id = payment.get('notes', {}).get('order_id', '')
        if order_id:
            db.collection('orders').document(order_id).update({
                'paymentStatus': 'paid',
                'razorpayPaymentId': payment.get('id', ''),
                'updatedAt': datetime.utcnow(),
            })

    return jsonify({'status': 'ok'}), 200


# ─── Refund ───────────────────────────────────────────────────────────────────

@payment_bp.route('/refund/<order_id>', methods=['POST'])
@require_admin
def initiate_refund(order_id):
    try:
        order_snap = db.collection('orders').document(order_id).get()
        if not order_snap.exists:
            return jsonify({'error': 'Order not found'}), 404

        order_data = order_snap.to_dict()
        payment_id = order_data.get('razorpayPaymentId', '')

        if not payment_id or payment_id == 'mock_payment':
            db.collection('orders').document(order_id).update({
                'paymentStatus': 'refunded',
                'updatedAt': datetime.utcnow(),
            })
            return jsonify({'success': True, 'mock': True})

        client = get_razorpay_client()
        if not client:
            return jsonify({'error': 'Payment gateway not configured'}), 500

        amount_paise = int(order_data.get('totalAmount', 0) * 100)
        refund = client.payment.refund(payment_id, {'amount': amount_paise})

        db.collection('orders').document(order_id).update({
            'paymentStatus': 'refunded',
            'razorpayRefundId': refund.get('id', ''),
            'updatedAt': datetime.utcnow(),
        })

        db.collection('notifications').add({
            'userId': order_data.get('buyerId'),
            'type': 'payment',
            'title': '💸 Refund Initiated',
            'message': f"Your refund of ₹{order_data.get('totalAmount')} has been initiated and will reflect in 5-7 business days.",
            'isRead': False,
            'orderId': order_id,
            'createdAt': datetime.utcnow(),
        })

        return jsonify({'success': True, 'refundId': refund.get('id')})
    except Exception as e:
        print(f'REFUND ERROR: {e}')
        return jsonify({'error': str(e)}), 500
