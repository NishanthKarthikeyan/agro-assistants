"""
Auth Blueprint — Profile management.
Firebase Auth handles login/register/Google sign-in on the client.
This blueprint handles Firestore user doc sync and profile CRUD.
"""
import datetime
from flask import Blueprint, request, jsonify
from database import db
from auth_utils import require_jwt
from firebase_admin import auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# ─── Sync User ────────────────────────────────────────────────────────────────
# Called after first Firebase login to create/update Firestore user document.

@auth_bp.route('/sync-user', methods=['POST'])
def sync_user():
    """
    Frontend calls this after Firebase sign-in to ensure a Firestore user doc exists.
    Creates the doc on first login; updates display info on subsequent logins.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization required'}), 401

    id_token = auth_header.replace('Bearer ', '').strip()

    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded['uid']
        email = decoded.get('email', '')

        data = request.get_json() or {}
        display_name = data.get('displayName', decoded.get('name', ''))
        profile_image = data.get('profileImageUrl', decoded.get('picture', ''))
        role = data.get('role', 'buyer')  # Only used on first creation

        # Allowed roles
        if role not in ['buyer', 'seller', 'delivery']:
            role = 'buyer'

        user_ref = db.collection('users').document(uid)
        user_snap = user_ref.get()

        if not user_snap.exists:
            # First-time user — create profile
            user_profile = {
                'email': email,
                'displayName': display_name,
                'role': role,
                'phone': data.get('phone', ''),
                'address': data.get('address', {}),
                'profileImageUrl': profile_image,
                'isApproved': role not in ['seller', 'delivery'],
                'isActive': True,
                'createdAt': datetime.datetime.utcnow(),
                'updatedAt': datetime.datetime.utcnow(),
            }
            if role == 'seller':
                user_profile['farmName'] = data.get('farmName', '')
                user_profile['farmLocation'] = data.get('farmLocation', '')
                user_profile['produceType'] = data.get('produceType', '')

            user_ref.set(user_profile)
            user_data = user_profile
            user_data['id'] = uid
        else:
            # Existing user — update last-seen info
            user_ref.update({
                'displayName': display_name or user_snap.to_dict().get('displayName', ''),
                'profileImageUrl': profile_image or user_snap.to_dict().get('profileImageUrl', ''),
                'updatedAt': datetime.datetime.utcnow(),
            })
            user_data = user_snap.to_dict()
            user_data['id'] = uid

        return jsonify({
            'success': True,
            'user': {
                'id': uid,
                'uid': uid,
                'email': email,
                'displayName': user_data.get('displayName', ''),
                'role': user_data.get('role', 'buyer'),
                'isApproved': user_data.get('isApproved', False),
                'profileImageUrl': user_data.get('profileImageUrl', ''),
            }
        })

    except Exception as e:
        print(f"SYNC USER ERROR: {e}")
        return jsonify({'error': str(e)}), 500


# ─── Profile ──────────────────────────────────────────────────────────────────

@auth_bp.route('/profile', methods=['GET'])
@require_jwt()
def get_profile():
    uid = request.uid
    try:
        user_snap = db.collection('users').document(uid).get()
        if not user_snap.exists:
            return jsonify({'error': 'User not found'}), 404

        user = user_snap.to_dict()
        profile = {
            'id': uid,
            'email': user.get('email', ''),
            'displayName': user.get('displayName', ''),
            'role': user.get('role', 'buyer'),
            'isApproved': user.get('isApproved', False),
            'phone': user.get('phone', ''),
            'address': user.get('address', {}),
            'profileImageUrl': user.get('profileImageUrl', ''),
            'farmName': user.get('farmName', ''),
            'farmLocation': user.get('farmLocation', ''),
            'produceType': user.get('produceType', ''),
        }
        return jsonify({'profile': profile})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/profile', methods=['PUT'])
@require_jwt()
def update_profile():
    data = request.get_json()
    uid = request.uid

    updates = {'updatedAt': datetime.datetime.utcnow()}
    allowed_fields = [
        'displayName', 'phone', 'address', 'profileImageUrl',
        'role', 'isApproved', 'isActive', 'farmLocation',
        'produceType', 'sellerProfile', 'deliveryProfile', 'farmName'
    ]
    for field in allowed_fields:
        if field in data:
            updates[field] = data[field]

    try:
        db.collection('users').document(uid).update(updates)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
