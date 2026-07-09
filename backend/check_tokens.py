"""Check all users in database and their FCM tokens."""
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from database import db

users = db.collection('users').stream()
print("="*60)
print("REGISTERED USERS & TOKENS:")
print("="*60)
for user in users:
    d = user.to_dict()
    name = d.get('name', d.get('displayName', 'Unknown'))
    email = d.get('email', 'No Email')
    fcm = d.get('fcmToken', None)
    print(f"User: {name} ({email})")
    print(f"  UID: {user.id}")
    print(f"  FCM Token: {fcm if fcm else '❌ NONE'}")
    print("-"*60)
