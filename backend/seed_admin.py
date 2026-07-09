"""
seed_admin.py — Creates the admin user in Firebase Auth and Firestore.

Run once:
    python seed_admin.py

Admin credentials:
    Email:    lokesh152005@gmail.com
    Password: Lokesh@152005
"""
import os
import datetime
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv

load_dotenv(override=True)

ADMIN_EMAIL = "lokesh152005@gmail.com"
ADMIN_PASSWORD = "Lokesh@152005"
ADMIN_DISPLAY_NAME = "Lokesh (Admin)"

SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

# Initialize Firebase Admin
if not firebase_admin._apps:
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        print("[OK] Firebase Admin initialized.")
    else:
        print("[ERROR] serviceAccountKey.json not found!")
        print("   Please download it from Firebase Console > Project Settings > Service Accounts")
        exit(1)

db = firestore.client()


def create_admin():
    # 1. Create or get user in Firebase Auth
    try:
        user = auth.get_user_by_email(ADMIN_EMAIL)
        print(f"[INFO] Firebase Auth user already exists: {user.uid}")
        uid = user.uid
        # Update password if needed
        auth.update_user(uid, password=ADMIN_PASSWORD, display_name=ADMIN_DISPLAY_NAME)
        print(f"[OK] Password updated for existing user.")
    except auth.UserNotFoundError:
        user = auth.create_user(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            display_name=ADMIN_DISPLAY_NAME,
            email_verified=True,
        )
        uid = user.uid
        print(f"[OK] Firebase Auth admin user created: {uid}")

    # 2. Create or update Firestore user document
    user_ref = db.collection('users').document(uid)
    user_snap = user_ref.get()

    if user_snap.exists:
        user_ref.update({
            'role': 'admin',
            'isApproved': True,
            'isActive': True,
            'displayName': ADMIN_DISPLAY_NAME,
            'updatedAt': datetime.datetime.utcnow(),
        })
        print(f"[OK] Firestore user doc updated -> role: admin")
    else:
        user_ref.set({
            'email': ADMIN_EMAIL,
            'displayName': ADMIN_DISPLAY_NAME,
            'role': 'admin',
            'phone': '',
            'address': {},
            'profileImageUrl': '',
            'isApproved': True,
            'isActive': True,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow(),
        })
        print(f"[OK] Firestore user doc created -> role: admin")

    print("\n" + "="*50)
    print("[SUCCESS] Admin user ready!")
    print(f"   Email   : {ADMIN_EMAIL}")
    print(f"   Password: {ADMIN_PASSWORD}")
    print(f"   UID     : {uid}")
    print("="*50)


if __name__ == '__main__':
    create_admin()
