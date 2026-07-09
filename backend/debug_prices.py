from google import genai
from google.genai import types
import os, json
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=key)
print("API Key loaded:", bool(key))

vegetable_query = "Tomato"
location_query = "Coimbatore"

prompt = (
    "As an agricultural market expert, provide a single, average estimated market price "
    f"for '{vegetable_query}' in the '{location_query}' region of India.\n\n"
    "Context from web search:\nNo recent search data available.\n\n"
    "Your entire response MUST be only a single, valid JSON object with no markdown.\n"
    'Use this exact structure: {"estimated_price": "Approx. Rs25 per Kg"}'
)

print("--- Prompt ---")
print(prompt[:200])
print()

try:
    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    txt = response.text
    print("response.text type:", type(txt))
    print("response.text repr:", repr(txt[:500]) if txt else "NONE/EMPTY")
    
    # Try extract_json logic
    if txt:
        start = txt.find('{')
        end = txt.rfind('}')
        print(f"start={start}, end={end}")
        if start != -1 and end != -1:
            json_str = txt[start:end+1]
            print("JSON slice:", json_str[:200])
            parsed = json.loads(json_str)
            print("PARSED OK:", parsed)
        else:
            print("NO JSON BRACES FOUND")
    else:
        print("EMPTY RESPONSE TEXT")
        # Check candidates
        for c in response.candidates:
            print("Candidate finish_reason:", c.finish_reason)
            for p in c.content.parts:
                print("Part:", type(p), getattr(p, 'text', None)[:100] if getattr(p, 'text', None) else "no text")
                
except Exception as e:
    import traceback
    print("EXCEPTION:", e)
    traceback.print_exc()
