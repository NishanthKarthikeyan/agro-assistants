import os
import requests
import json

ONESIGNAL_APP_ID = os.getenv("ONESIGNAL_APP_ID")
ONESIGNAL_REST_API_KEY = os.getenv("ONESIGNAL_REST_API_KEY")

def send_push_to_user(external_user_id, title, body, data=None):
  """Sends a push notification targeting a specific user ID via OneSignal."""
  if not ONESIGNAL_APP_ID or ONESIGNAL_APP_ID == 'YOUR_ONESIGNAL_APP_ID':
    print("ONESIGNAL WARNING: ONESIGNAL_APP_ID is not configured. Push skipped.")
    return False

  headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": f"Basic {ONESIGNAL_REST_API_KEY}"
  }

  payload = {
    "app_id": ONESIGNAL_APP_ID,
    "include_external_user_ids": [str(external_user_id)],
    "headings": {"en": title},
    "contents": {"en": body}
  }

  if data:
    payload["data"] = data

  try:
    response = requests.post(
      "https://onesignal.com/api/v1/notifications",
      headers=headers,
      data=json.dumps(payload),
      timeout=8
    )
    res_data = response.json()
    print(f"OneSignal user push response: {res_data}")
    return response.status_code == 200
  except Exception as e:
    print(f"OneSignal user push exception: {e}")
    return False

def send_push_to_all(title, body, data=None):
  """Broadcasts a push notification to all subscribed users via OneSignal."""
  if not ONESIGNAL_APP_ID or ONESIGNAL_APP_ID == 'YOUR_ONESIGNAL_APP_ID':
    print("ONESIGNAL WARNING: ONESIGNAL_APP_ID is not configured. Broadcast skipped.")
    return False

  headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": f"Basic {ONESIGNAL_REST_API_KEY}"
  }

  payload = {
    "app_id": ONESIGNAL_APP_ID,
    "included_segments": ["Subscribed Users"],
    "headings": {"en": title},
    "contents": {"en": body}
  }

  if data:
    payload["data"] = data

  try:
    response = requests.post(
      "https://onesignal.com/api/v1/notifications",
      headers=headers,
      data=json.dumps(payload),
      timeout=8
    )
    res_data = response.json()
    print(f"OneSignal broadcast response: {res_data}")
    return response.status_code == 200
  except Exception as e:
    print(f"OneSignal broadcast exception: {e}")
    return False
