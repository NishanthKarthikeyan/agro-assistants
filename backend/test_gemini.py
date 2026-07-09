import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(override=True)
API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=API_KEY)

VISION_MODEL = genai.GenerativeModel("gemini-flash-latest")

print(f"API Key Valid? {'Yes' if API_KEY else 'No'}")
print(f"Loaded Key Prefix: {API_KEY[:10] if API_KEY else 'None'}")

print("Available Models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)

print("Using hardcoded 1x1 valid JPEG image...")
image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x03\x02\x02\x02\x02\x02\x03\x02\x02\x02\x03\x03\x03\x03\x04\x06\x04\x04\x04\x04\x04\x08\x06\x06\x05\x06\t\x08\n\n\t\x08\t\t\n\x0c\x0f\x0c\n\x0b\x0e\x0b\t\t\r\x11\r\x0e\x0f\x10\x10\x11\x10\n\x0c\x12\x13\x12\x10\x13\x0f\x10\x10\x10\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\x00\xff\xd9'
print(f"Image ready. Size: {len(image_bytes)} bytes.")

prompt_text = "Analyze this crop leaf."

print("Calling Gemini API...")
try:
    response = VISION_MODEL.generate_content([
        prompt_text,
        {"mime_type": "image/jpeg", "data": image_bytes}
    ])
    print(f"HTTP Status: OK (Library call)")
    print(f"Valid payload? Yes")
    print("\n--- Gemini Response ---")
    print(response.text)
    print("-----------------------")
except Exception as e:
    print(f"HTTP Status: Failed")
    print(f"Valid payload? Unclear due to error")
    print(f"\n--- Runtime Error ---")
    print(str(e))
    import traceback
    traceback.print_exc()
    print("-----------------------")
