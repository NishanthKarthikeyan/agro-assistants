"""
Test script: Send a push notification to all registered users via FCM.
Run with: python test_notification.py
"""
import os
import sys
import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv(override=True)

# Initialize Firebase
from database import db
from firebase_admin import messaging

def send_test_notification():
    print("=" * 50)
    print("FCM Push Notification Test")
    print("=" * 50)

    # 1. Find all users with FCM tokens
    users_ref = db.collection('users').stream()
    tokens_found = []

    for user_doc in users_ref:
        user_data = user_doc.to_dict()
        fcm_token = user_data.get('fcmToken')
        name = user_data.get('name', user_data.get('displayName', 'Unknown'))
        role = user_data.get('role', 'buyer')
        
        if fcm_token:
            tokens_found.append({
                'uid': user_doc.id,
                'name': name,
                'role': role,
                'token': fcm_token
            })
            print(f"  [OK] Found token for: {name} ({role}) - {fcm_token[:20]}...")
        else:
            print(f"  [NO TOKEN] No FCM token for: {name} ({role})")

    if not tokens_found:
        print("\n[WARNING] No users have FCM tokens registered!")
        print("   -> Open the app in browser & allow notifications first.")
        print("   -> Check browser console for 'FCM Token resolved: ...'")
        return

    print(f"\nSending test notification to {len(tokens_found)} user(s)...")

    # 2. Send notification to each user
    success_count = 0
    for user in tokens_found:
        try:
            message = messaging.Message(
                token=user['token'],
                notification=messaging.Notification(
                    title="Price Alert!",
                    body="Tomato prices dropped 15% in Salem market today!"
                ),
                data={
                    'type': 'market_prices',
                    'title': 'Price Alert!',
                    'body': 'Tomato prices dropped 15% in Salem market today!',
                    'click_action': 'FLUTTER_NOTIFICATION_CLICK'
                }
            )
            response = messaging.send(message)
            print(f"  [SENT] Sent to {user['name']}: {response}")
            success_count += 1

            # Also log in Firestore notifications collection
            db.collection('notifications').add({
                'userId': user['uid'],
                'title': 'Price Alert!',
                'body': 'Tomato prices dropped 15% in Salem market today!',
                'type': 'market_prices',
                'isRead': False,
                'timestamp': datetime.datetime.utcnow()
            })
            print(f"  [LOG] Logged notification in Firestore for {user['name']}")

        except Exception as e:
            print(f"  [FAILED] Failed for {user['name']}: {e}")

    print(f"\n{'=' * 50}")
    print(f"Done! {success_count}/{len(tokens_found)} notifications sent.")
    print(f"{'=' * 50}")


if __name__ == '__main__':
    send_test_notification()
