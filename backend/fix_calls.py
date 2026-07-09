import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("Original length:", len(content))

# Replace all: gemini_client.models.generate_content(\n            model=TEXT_MODEL,\n            contents=X\n        )
# with: gemini_generate(X)

# Pattern 1: standard contents=X (no config)
old = 'gemini_client.models.generate_content(\n            model=TEXT_MODEL,\n            contents='
new = 'gemini_generate(\n            '
content = content.replace(old, new)

# Pattern 2: with config= on its own line
old2 = 'gemini_client.models.generate_content(\n            model=TEXT_MODEL,\n            contents=prompt,\n            config=types.GenerateContentConfig(response_mime_type="application/json")\n        )'
new2 = 'gemini_generate(\n            prompt,\n            config=types.GenerateContentConfig(response_mime_type="application/json")\n        )'
content = content.replace(old2, new2)

# Pattern 3: vision call with list (image)
old3 = 'gemini_client.models.generate_content(\n            model=TEXT_MODEL,\n            contents=[\n                types.Part.from_text(text=prompt_text),\n                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")\n            ]\n        )'
new3 = 'gemini_generate(\n            [\n                types.Part.from_text(text=prompt_text),\n                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")\n            ]\n        )'
content = content.replace(old3, new3)

# Verify no old references remain (excluding the function def itself)
remaining = content.count('gemini_client.models.generate_content')
print("Remaining gemini_client.models.generate_content calls:", remaining)
print("gemini_generate calls:", content.count('gemini_generate('))

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done! File saved.")
