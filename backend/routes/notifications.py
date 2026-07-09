import datetime
from flask import Blueprint, request, jsonify
from database import db
from auth_utils import require_jwt
from firebase_admin import messaging

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

# --- Synchronize/Register FCM Token ---
@notifications_bp.route('/register-token', methods=['POST'])
@require_jwt()
def register_token():
    uid = request.uid
    data = request.get_json() or {}
    token = data.get('fcmToken')

    if not token:
        return jsonify({'error': 'FCM Token required'}), 400

    try:
        db.collection('users').document(uid).update({
            'fcmToken': token,
            'updatedAt': datetime.datetime.utcnow()
        })
        return jsonify({'success': True, 'message': 'FCM Token registered successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Admin Trigger Alert (FCM Message) ---
@notifications_bp.route('/trigger-alert', methods=['POST'])
@require_jwt(required_role='admin')
def trigger_alert():
    data = request.get_json() or {}
    target_type = data.get('targetType') # 'broadcast', 'district', 'user'
    target = data.get('target') # e.g. district name, userId, or 'all'
    title = data.get('title')
    body = data.get('body')
    alert_type = data.get('type', 'general')

    if not title or not body or not target_type or not target:
        return jsonify({'error': 'title, body, targetType, and target are required'}), 400

    try:
        # Construct message payload
        payload = {
            'click_action': 'FLUTTER_NOTIFICATION_CLICK',
            'type': alert_type,
            'title': title,
            'body': body
        }

        if target_type == 'user':
            # Get user token
            user_snap = db.collection('users').document(target).get()
            if not user_snap.exists:
                return jsonify({'error': 'User not found'}), 404
            
            fcm_token = user_snap.to_dict().get('fcmToken')
            if not fcm_token:
                return jsonify({'error': 'User has no registered FCM Token'}), 400

            message = messaging.Message(
                token=fcm_token,
                notification=messaging.Notification(title=title, body=body),
                data=payload
            )
            response = messaging.send(message)
            
            # Log notification
            db.collection('notifications').add({
                'userId': target,
                'title': title,
                'body': body,
                'type': alert_type,
                'payload': payload,
                'isRead': False,
                'timestamp': datetime.datetime.utcnow()
            })

        elif target_type == 'district':
            # Broadcast to a topic representing the district
            topic = f"district_{target.lower().replace(' ', '_')}"
            message = messaging.Message(
                topic=topic,
                notification=messaging.Notification(title=title, body=body),
                data=payload
            )
            response = messaging.send(message)

        else: # broadcast
            message = messaging.Message(
                topic="all_users",
                notification=messaging.Notification(title=title, body=body),
                data=payload
            )
            response = messaging.send(message)

        return jsonify({'success': True, 'message': 'Push notification sent successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Log Analytics Events ---
@notifications_bp.route('/log-analytics', methods=['POST'])
@require_jwt()
def log_analytics():
    uid = request.uid
    data = request.get_json() or {}
    event = data.get('event') # 'delivered', 'clicked', 'opened', 'ignored', 'dismissed'
    notification_id = data.get('notificationId', '')

    if not event:
        return jsonify({'error': 'Event type required'}), 400

    try:
        db.collection('analytics').add({
            'userId': uid,
            'notificationId': notification_id,
            'event': event,
            'timestamp': datetime.datetime.utcnow()
        })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def send_user_push_notification(user_id, title, body, payload_type="general", extra_data=None):
    """Utility function to send a real-time native push notification via FCM to a specific user."""
    try:
        user_snap = db.collection('users').document(user_id).get()
        if not user_snap.exists:
            print(f"NOTIFICATION ERROR: User {user_id} not found in DB")
            return False

        user_data = user_snap.to_dict()
        fcm_token = user_data.get('fcmToken')
        if not fcm_token:
            print(f"NOTIFICATION INFO: User {user_id} has no registered FCM token")
            return False

        # Add to Firestore notification logs so the user sees it in their notification center
        import datetime as dt_module
        notification_doc = {
            'userId': user_id,
            'title': title,
            'body': body,
            'type': payload_type,
            'isRead': False,
            'timestamp': dt_module.datetime.utcnow()
        }
        if extra_data:
            notification_doc.update(extra_data)
        db.collection('notifications').add(notification_doc)

        # Send native push alert via Firebase Cloud Messaging
        payload = {
            'click_action': 'FLUTTER_NOTIFICATION_CLICK',
            'type': payload_type,
            'title': title,
            'body': body
        }
        if extra_data:
            for k, v in extra_data.items():
                payload[k] = str(v)

        # Trigger OneSignal push notification as well
        from services.onesignal_push import send_push_to_user
        onesignal_success = send_push_to_user(user_id, title, body, data=payload)
        print(f"NOTIFICATION INFO: OneSignal push status for user {user_id}: {onesignal_success}")

        # Fallback / parallel FCM
        if fcm_token:
            try:
                message = messaging.Message(
                    token=fcm_token,
                    notification=messaging.Notification(title=title, body=body),
                    data=payload
                )
                response = messaging.send(message)
                print(f"NOTIFICATION SUCCESS: Real-time native FCM push sent to user {user_id}: {response}")
            except Exception as fcm_err:
                print(f"NOTIFICATION WARNING: FCM send failed (OneSignal was run): {fcm_err}")

        return True
    except Exception as e:
        print(f"NOTIFICATION FAILURE: Failed to send push to {user_id}: {e}")
        return False


def send_price_alert_to_subscribers(vegetable, title, body):
    """Queries all users subscribed to the given vegetable and triggers push notifications."""
    try:
        users = db.collection('users').stream()
        count = 0
        for u in users:
            u_data = u.to_dict()
            notif_settings = u_data.get('notificationSettings', {})
            subscribed_veggies = notif_settings.get('subscribedVegetables')
            # Fallback to default subscription list if empty/not set
            if not isinstance(subscribed_veggies, list) or len(subscribed_veggies) == 0:
                subscribed_veggies = ['Tomato', 'Onion', 'Potato']
            if vegetable in subscribed_veggies:
                send_user_push_notification(u.id, title, body, payload_type="price_alert")
                count += 1
        print(f"INFO: Sent price alert for {vegetable} to {count} users.")
    except Exception as e:
        print(f"ERROR: Failed to broadcast price alert for {vegetable}: {e}")


# --- Trigger Price Alert Endpoint ---
@notifications_bp.route('/trigger-price-alert', methods=['POST'])
def trigger_price_alert():
    """Compares incoming prices with historical Firestore snapshots and fires OneSignal notifications on changes."""
    data = request.get_json() or {}
    location = data.get('location', 'Coimbatore')
    prices = data.get('prices', [])

    if not prices:
        return jsonify({'error': 'prices list required'}), 400

    try:
        loc_key = location.lower().replace(' ', '_').replace(',', '')
        snap_ref = db.collection('price_snapshots').document(loc_key)
        snap = snap_ref.get()

        old_prices = {}
        if snap.exists:
            old_prices = snap.to_dict().get('prices', {})

        alerts_sent = []
        new_prices = {item['vegetable']: float(item['price']) for item in prices}

        for veg, new_price in new_prices.items():
            if veg in old_prices:
                old_price = float(old_prices[veg])
                if new_price < old_price:
                    # Price dropped!
                    title = "📉 Grab it now!"
                    body = f"Grab it now! {veg} price dropped to ₹{int(new_price)}/kg!"
                    send_price_alert_to_subscribers(veg, title, body)
                    alerts_sent.append({"vegetable": veg, "type": "drop", "old": old_price, "new": new_price})
                elif new_price > old_price:
                    # Price increased!
                    title = "📈 Price Increased Alert"
                    body = f"Alert! {veg} price has increased to ₹{int(new_price)}/kg."
                    send_price_alert_to_subscribers(veg, title, body)
                    alerts_sent.append({"vegetable": veg, "type": "increase", "old": old_price, "new": new_price})

        # Save new snapshot
        snap_ref.set({
            'location': location,
            'prices': new_prices,
            'updatedAt': datetime.datetime.utcnow()
        })

        return jsonify({'success': True, 'alerts_sent': alerts_sent})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

