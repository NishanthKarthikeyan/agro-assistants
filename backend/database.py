import os
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK
_SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

if not firebase_admin._apps:
    if os.path.exists(_SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized from serviceAccountKey.json.")
    else:
        print("WARNING: serviceAccountKey.json not found. Trying Application Default Credentials...")
        firebase_admin.initialize_app()

db = firestore.client()
print("Firestore client initialized successfully.")
