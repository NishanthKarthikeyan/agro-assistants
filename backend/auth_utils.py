"""
auth_utils.py — Firebase Auth token verification middleware.
Verifies Firebase ID tokens sent as Bearer tokens in Authorization header.
"""
import os
from functools import wraps
from flask import request, jsonify
from firebase_admin import auth
from database import db


def require_jwt(required_role=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Authorization token required'}), 401

            id_token = auth_header.replace('Bearer ', '').strip()
            if not id_token:
                return jsonify({'error': 'Authorization token required'}), 401

            try:
                # Verify Firebase ID token
                decoded = auth.verify_id_token(id_token)
                uid = decoded['uid']

                # Fetch user document from Firestore
                user_ref = db.collection('users').document(uid)
                user_snap = user_ref.get()

                if not user_snap.exists:
                    return jsonify({'error': 'User not found in database'}), 404

                user_data = user_snap.to_dict()
                user_data['id'] = uid

                actual_role = user_data.get('role', 'buyer')
                # Treat sellers as buyers for role checks
                if actual_role == 'seller':
                    actual_role = 'buyer'
                    user_data['role'] = 'buyer'

                if required_role and actual_role != required_role:
                    return jsonify({'error': f'{required_role} access required'}), 403

                request.uid = uid
                request.user = user_data
                return f(*args, **kwargs)

            except auth.ExpiredIdTokenError:
                return jsonify({'error': 'Token expired'}), 401
            except auth.InvalidIdTokenError:
                return jsonify({'error': 'Invalid token'}), 401
            except Exception as e:
                print(f"AUTH ERROR: {e}")
                return jsonify({'error': str(e)}), 401

        return decorated
    return decorator
