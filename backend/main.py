import os
import base64
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.uploader
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google import genai
from google.genai import types
from googleapiclient.discovery import build
from auth_utils import require_jwt


load_dotenv(override=True)

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://ai-agroassistant.vercel.app"
])

# ─── Register Blueprints ────────────────────────────────────────────────────
try:
    from routes.auth import auth_bp
    from routes.buyer import buyer_bp
    from routes.admin import admin_bp
    from routes.delivery import delivery_bp
    from routes.payment import payment_bp
    from routes.notifications import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(buyer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(delivery_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(notifications_bp)
    print("All API blueprints registered successfully.")
except ImportError as e:
    print(f"WARNING: Could not import blueprints: {e}")


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

GEMINI_PLANNER_API_KEY = os.getenv("GEMINI_PLANNER_API_KEY")
planner_client = genai.Client(api_key=GEMINI_PLANNER_API_KEY) if GEMINI_PLANNER_API_KEY else gemini_client

GEMINI_CHATBOT_API_KEY = os.getenv("GEMINI_CHATBOT_API_KEY")
chatbot_client = genai.Client(api_key=GEMINI_CHATBOT_API_KEY) if GEMINI_CHATBOT_API_KEY else gemini_client

GEMINI_DISEASE_API_KEY = os.getenv("GEMINI_DISEASE_API_KEY")
disease_client = genai.Client(api_key=GEMINI_DISEASE_API_KEY) if GEMINI_DISEASE_API_KEY else gemini_client
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
GOOGLE_CSE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")

try:
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
    print("Cloudinary configured successfully.")
except Exception as e:
    print(f"Error configuring Cloudinary: {e}")

try:
    with open('prices.json', 'r', encoding='utf-8') as f:
        all_prices_data = json.load(f)
    print("prices.json loaded successfully.")
except FileNotFoundError:
    all_prices_data = None
    print("WARNING: prices.json not found. The /prices endpoint might have reduced functionality.")
except json.JSONDecodeError:
    all_prices_data = None
    print("ERROR: Could not decode prices.json. Check syntax.")

# Primary model: gemini-flash-lite-latest (high availability, high quota)
TEXT_MODEL = 'gemini-flash-lite-latest'
FALLBACK_MODEL = 'gemini-2.0-flash-lite'

def gemini_generate(contents, config=None, client=None):
    """Smart generate_content with automatic model fallback on quota errors."""
    target_client = client or gemini_client
    if not target_client:
        raise RuntimeError("Gemini client not initialized (missing API key)")
    try:
        kwargs = dict(model=TEXT_MODEL, contents=contents)
        if config:
            kwargs['config'] = config
        return target_client.models.generate_content(**kwargs)
    except Exception as e:
        if '429' in str(e) or 'RESOURCE_EXHAUSTED' in str(e):
            print(f"WARNING: {TEXT_MODEL} quota hit, retrying with {FALLBACK_MODEL}...")
            try:
                kwargs['model'] = FALLBACK_MODEL
                return target_client.models.generate_content(**kwargs)
            except Exception as e2:
                print(f"ERROR: Fallback model also failed: {e2}")
                raise e2
        raise e

def get_image_url_from_google(query):
    """Searches for an image using Google Custom Search API and returns the first result."""
    try:
        if not GOOGLE_CSE_API_KEY or not GOOGLE_CSE_ID:
            print("WARNING: Google CSE API Key or ID is not set. Cannot search for image.")
            return None

        service = build("customsearch", "v1", developerKey=GOOGLE_CSE_API_KEY)
        res = service.cse().list(
            q=query,
            cx=GOOGLE_CSE_ID,
            searchType='image',
            num=1,
            safe='high'
        ).execute()

        if 'items' in res and len(res['items']) > 0:
            return res['items'][0]['link']
        else:
            return None
    except Exception as e:
        print(f"ERROR during Google Image Search: {e}")
        return None

def get_price_info_from_google(vegetable, location):
    """Searches for vegetable prices using Google Custom Search API and returns snippets."""
    try:
        if not GOOGLE_CSE_API_KEY or not GOOGLE_CSE_ID:
            print("WARNING: Google CSE API Key or ID is not set. Cannot search for price info.")
            return None

        service = build("customsearch", "v1", developerKey=GOOGLE_CSE_API_KEY)
        query = f"current market price of {vegetable} in {location} India today"
        res = service.cse().list(
            q=query,
            cx=GOOGLE_CSE_ID,
            num=3
        ).execute()

        snippets = []
        if 'items' in res:
            for item in res['items']:
                snippets.append(item.get('snippet', ''))

        return " | ".join(snippets) if snippets else None
    except Exception as e:
        print(f"ERROR during Google Price Search: {e}")
        return None


def extract_json(text):
    """Extracts a JSON object from a string that might contain markdown backticks or extra text."""
    try:
        # Look for the first '{' and last '}'
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            json_str = text[start:end+1]
            return json.loads(json_str)
        return json.loads(text)  # Fallback to direct parse
    except Exception as e:
        print(f"JSON EXTRACTION ERROR: {e}. Text: {text[:200]}...")
        raise e

@app.route("/")
def index():
    """Renders the main page."""
    return jsonify({"status": "AI Agro Assistant Backend is running!", "version": "2.0"})

@app.route("/ask-agro-assistant", methods=["POST"])
def ask_agro_assistant():
    """Handles chatbot queries using the Gemini API."""
    try:
        data = request.get_json()
        user_question = data.get("question", "").strip()

        if not user_question:
            return jsonify({"error": "No question provided."}), 400

        system_prompt = """
        You are 'Agro Assistant', a friendly, highly knowledgeable AI farming companion and expert agricultural consultant.
        Your primary purpose is to DIRECTLY answer any agricultural, farming, or crop-related questions the user asks. 
        You MUST provide exact, detailed, and actionable agricultural information (e.g., if asked about Kharif crops, list the actual crops, soil needs, and farming tips directly).
        
        CRITICAL RULES:
        1. YOU MUST ONLY TALK ABOUT AGRICULTURE, FARMING, CROPS, WEATHER, AND THE APP ITSELF.
        2. If the user asks a question completely unrelated to agriculture or the app, politely refuse to answer and state that you are an agricultural assistant.
        3. Do NOT just redirect the user to use other features of the app when they ask an agricultural question. Answer the question directly with your knowledge.

        App Information & Development Team:
        - App Name: AI Agro Assistant
        - Purpose: Empowering Indian Farmers with AI, offering direct farm-to-buyer marketplace, AI crop disease detection, weather insights, market prices, and loans.
        - Developed By: Karthickkumar, Gopika, Priyadharshini, Nishanth, Lokesh, Sarjan, and Vinithprakash.
        - Mentors: Dr. P. Thangavelu (Principal) and Dr. R. Senthil Kumar (HOD).
        """

        if not GEMINI_CHATBOT_API_KEY or not chatbot_client:
            return jsonify({"error": "Gemini Chatbot API Key is missing in .env file."}), 500

        response = gemini_generate(
            f"System Prompt: {system_prompt}\n\nUser Question: {user_question}",
            client=chatbot_client
        )

        result_text = response.text
        return jsonify({"answer": result_text})

    except Exception as e:
        print(f"CHATBOT ERROR: {e}")
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

@app.route("/voice-intelligence", methods=["POST"])
def voice_intelligence():
    """Processes voice transcripts using Gemini for intent parsing and AI responses."""
    try:
        data = request.get_json()
        transcript = data.get("transcript", "").strip()

        if not transcript:
            return jsonify({"error": "No transcript provided."}), 400

        # Local Regex Fallback for common actions
        def get_fallback_intent(txt):
            txt = txt.lower()
            if any(k in txt for k in ["weather", "வானிலை", "மழை", "forecast"]):
                city_match = txt.split("in")[-1].strip() if "in" in txt else ""
                return {"type": "command", "action": "weather", "params": {"city": city_match}, "answer": "Opening weather...", "speech": "Sure, let me check the weather."}
            if any(k in txt for k in ["price", "விலை", "market", "market prices"]):
                return {"type": "command", "action": "price", "answer": "Checking market prices...", "speech": "Sure, checking the latest commodity prices."}
            if any(k in txt for k in ["planner", "திட்டம்", "plan", "guide"]):
                return {"type": "command", "action": "planner", "answer": "Opening AI Planner...", "speech": "Switching to the farming planner."}
            if any(k in txt for k in ["scan", "disease", "நோய்", "leaf"]):
                return {"type": "command", "action": "disease", "answer": "Opening leaf scanner...", "speech": "Ready to scan for crop diseases."}
            if any(k in txt for k in ["sell", "buy", "marketplace", "market"]):
                return {"type": "command", "action": "buysell", "answer": "Opening marketplace...", "speech": "Taking you to the buy and sell section."}
            return None

        fallback = get_fallback_intent(transcript)

        system_prompt = """
        You are the 'Agro Intelligence' engine. Your job is to parse the user's voice transcript (which could be in English or Tamil) and determine if it's a 'command' to navigate the app or a 'question' to be answered.

        **App Commands:**
        - weather: Show weather results. Requires 'city'.
        - disease: Navigate to Crop Guide (scan leaf).
        - price: Navigate to Market Prices. Requires 'vegetable' and 'location'.
        - planner: Navigate to AI Planner.
        - news: Navigate to Agri News.
        - loan: Navigate to Agri Loan.

        **Response Format:**
        Your response must be a single block of JSON.
        {
            "type": "command" or "answer",
            "action": "weather", "disease", "price", "planner", "news", or "loan" (only if type is command),
            "params": {"city": "...", "vegetable": "...", "location": "..."} (only if command needs them),
            "answer": "Your concise AI response here" (if type is answer or if you want to 'speak' back the action),
            "speech": "A natural sounding sentence to be spoken via TTS"
        }

        **Tamil Keywords Examples:**
        - 'வானிலை' (Vannilai - Weather)
        - 'மழை' (Mazhai - Rain/Weather)
        - 'விலை' (Vilai - Price)
        - 'திட்டம்' (Thittam - Planner)
        - 'நோய்' (Noi - Disease)
        """

        if not GEMINI_CHATBOT_API_KEY or not chatbot_client:
            if fallback:
                return jsonify(fallback)
            return jsonify({"type": "answer", "answer": "Gemini API Key missing in .env.", "speech": "I am missing the Gemini API key."}), 500

        try:
            response = gemini_generate(
                f"System Prompt: {system_prompt}\n\nUser Transcript: {transcript}",
                client=chatbot_client
            )
            result_json = response.text
            return jsonify(extract_json(result_json))
        except Exception as e:
            print(f"Gemini Fetch Exception: {e}")
            if fallback:
                fallback["answer"] = "(Safe Mode) " + fallback["answer"]
                return jsonify(fallback), 200
            return jsonify({"type": "answer", "answer": "AI Engine busy. Using basic commands.", "speech": "My AI brain is busy, using basic navigation."}), 500

    except Exception as e:
        print(f"VOICE INTEL ERROR: {e}")
        return jsonify({"type": "answer", "answer": f"Something went wrong while connecting to Gemini: {str(e)}", "speech": "I am having trouble connecting to my brain right now."}), 500

@app.route("/explain-results", methods=["POST"])
def explain_results():
    """Generates a natural language explanation for specific data (weather, prices, etc.)"""
    try:
        data = request.get_json()
        context_type = data.get("type", "general")
        raw_data = data.get("data", {})

        system_prompt = f"""
        You are the 'Agro Speaker'. Your task is to provide a friendly, detailed spoken summary of the provided {context_type} data.
        If the data is in English, you can summarize in English but keep it natural.
        If the user context (Tamil) is detected, provide the explanation in Tamil (Tanglish or pure Tamil is fine, but make it very clear for a farmer).
        The goal is to explain the most important details (e.g., temperature, rain chances, or market prices) out loud.
        """

        if not GEMINI_CHATBOT_API_KEY or not chatbot_client:
            return jsonify({"explanation": f"Here is the {context_type} information. (AI summary unavailable)"})

        try:
            response = gemini_generate(
                f"System Prompt: {system_prompt}\n\nRaw Data: {json.dumps(raw_data)}",
                client=chatbot_client
            )
            explanation = response.text
            return jsonify({"explanation": explanation})
        except Exception as e:
            print(f"Explain Results Exception: {e}")
            return jsonify({"explanation": f"I've updated the {context_type} for you. Look at the screen for more info."})

    except Exception as e:
        return jsonify({"explanation": "I'm sorry, I couldn't summarize the results right now."}), 500

@app.route("/upload-item-image", methods=["POST"])
def upload_item_image():
    """Handles image uploads for marketplace items to Cloudinary."""
    if 'item_image' not in request.files:
        return jsonify({"error": "No 'item_image' file part"}), 400
    file_to_upload = request.files['item_image']
    if file_to_upload.filename == '':
        return jsonify({"error": "No file selected"}), 400
    try:
        upload_result = cloudinary.uploader.upload(file_to_upload, folder="agri_assistant_items")
        return jsonify({"imageUrl": upload_result.get('secure_url')})
    except Exception as e:
        print(f"CLOUDINARY UPLOAD ERROR: {e}")
        return jsonify({"error": f"Failed to upload image: {e}"}), 500

@app.route('/upload-profile-image', methods=['POST'])
def upload_profile_image():
    """Handles profile image uploads to Cloudinary with debugging."""
    print("INFO: Received request for /upload-profile-image")
    if 'profile_image' not in request.files:
        print("ERROR: 'profile_image' not in request.files")
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['profile_image']

    if file.filename == '':
        print("ERROR: No file selected by user")
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            print("INFO: Uploading file to Cloudinary...")
            upload_result = cloudinary.uploader.upload(file, folder="agro_assistant_profiles")
            secure_url = upload_result.get('secure_url')
            print(f"SUCCESS: Cloudinary URL is {secure_url}")
            return jsonify({'message': 'Image uploaded successfully', 'secure_url': secure_url}), 200
        except Exception as e:
            print(f"CLOUDINARY PROFILE UPLOAD ERROR: {e}")
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'An unknown error occurred'}), 500

# Legacy /add-item and /get-items removed — use /api/buyer/products and /api/admin/products instead.

@app.route("/agri-news", methods=["GET"])
def agri_news():
    if not NEWS_API_KEY:
        return jsonify({"error": "News API key is not configured."}), 500

    search_query = "agriculture OR farming OR farmers OR crops OR monsoon"
    
    url = (f"https://gnews.io/api/v4/search?"
           f"q={search_query}"
           f"&lang=en&country=in&max=20"
           f"&apikey={NEWS_API_KEY}")

    # Build premium dynamic fallback news
    fallback_news = [
        {
            "title": "Government Announces New Subsidy for Organic Fertilizers",
            "description": "A new initiative to promote organic farming across major states in India by offering up to 50% discount on bio-fertilizers.",
            "source": {"name": "Ministry of Agriculture"},
            "publishedAt": (datetime.utcnow() - timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600",
            "url": "https://agricoop.nic.in",
            "category": "Organic"
        },
        {
            "title": "Southwest Monsoon Expected to Arrive Early in Tamil Nadu",
            "description": "Meteorological department predicts early rainfall, advising farmers to prepare soil for Kharif sowing ahead of schedule.",
            "source": {"name": "Weather Bureau India"},
            "publishedAt": (datetime.utcnow() - timedelta(hours=6)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=600",
            "url": "https://mausam.imd.gov.in",
            "category": "Weather"
        },
        {
            "title": "Tomato and Onion Mandi Rates Steady Across Tamil Nadu Markets",
            "description": "Mandi arrivals remain consistent in Coimbatore and Oddanchatram markets, keeping retail prices stable between Rs 35-45/kg.",
            "source": {"name": "Market Intelligence Cell"},
            "publishedAt": (datetime.utcnow() - timedelta(hours=12)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600",
            "url": "https://agmarknet.gov.in",
            "category": "Market"
        },
        {
            "title": "Smart Drone Technology Adopted for Precision Pesticide Spraying",
            "description": "Farmers in Trichy district report a 40% reduction in chemical costs after shifting to drone-based micro-sprinkling systems.",
            "source": {"name": "Tech Farming Daily"},
            "publishedAt": (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&q=80&w=600",
            "url": "https://www.icar.org.in",
            "category": "Technology"
        },
        {
            "title": "New High-Yield Paddy Variety 'CO 54' Released for Tamil Nadu Farmers",
            "description": "TNAU introduces drought-resistant paddy variety with an average yield potential of 6.2 tonnes per hectare.",
            "source": {"name": "TNAU Research Center"},
            "publishedAt": (datetime.utcnow() - timedelta(days=1, hours=5)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
            "url": "https://tnau.ac.in",
            "category": "Farming"
        },
        {
            "title": "Central Government Launches PM-Kisan 17th Installment Release",
            "description": "Over 9.5 crore farmers across the country receive direct bank transfers under the PM-Kisan Samman Nidhi scheme.",
            "source": {"name": "National Press Bureau"},
            "publishedAt": (datetime.utcnow() - timedelta(days=2)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1599148400620-8e1ff0bf28d8?auto=format&fit=crop&q=80&w=600",
            "url": "https://pmkisan.gov.in",
            "category": "Government Schemes"
        },
        {
            "title": "Organic Farming Area Increases by 15% in Western Ghats Belt",
            "description": "More smallholder farmers are shifting to natural compost and vermicompost, targeting premium export markets.",
            "source": {"name": "Organic Certification Body"},
            "publishedAt": (datetime.utcnow() - timedelta(days=2, hours=8)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
            "url": "https://apeda.gov.in",
            "category": "Organic"
        },
        {
            "title": "Precision Drip Irrigation Schemes Extended for Horti Crops",
            "description": "Government announces 80% subsidy for small and marginal farmers installing modern drip-irrigation kits this month.",
            "source": {"name": "Horticulture Department"},
            "publishedAt": (datetime.utcnow() - timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=600",
            "url": "https://tnhorticulture.tn.gov.in",
            "category": "Government Schemes"
        },
        {
            "title": "AI Soil Testers Help Farmers Reduce Nitrogen Overuse",
            "description": "Portable digital soil testers connected to mobile apps help farmers determine NPK values in under 5 minutes.",
            "source": {"name": "Agritech Hub India"},
            "publishedAt": (datetime.utcnow() - timedelta(days=4)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600",
            "url": "https://www.dst.gov.in",
            "category": "Technology"
        },
        {
            "title": "Pre-Monsoon Storage Levels in Bhavani Sagar Dam Reach Healthy Highs",
            "description": "Water release planned for Lower Bhavani Project canal to irrigate over 2 lakh acres of farmland next week.",
            "source": {"name": "Irrigation Division Office"},
            "publishedAt": (datetime.utcnow() - timedelta(days=5)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            "image": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600",
            "url": "https://wrd.tn.gov.in",
            "category": "Weather"
        }
    ]

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        news_data = response.json()
        articles = news_data.get("articles", [])
        
        # Format the GNews results to match categories dynamically
        formatted = []
        for i, article in enumerate(articles):
            if article.get("title") == "[Removed]":
                continue
            # Try to assign category based on title keyword matching
            title_lower = article.get("title", "").lower()
            desc_lower = article.get("description", "").lower()
            
            cat = "Farming"
            if "organic" in title_lower or "organic" in desc_lower:
                cat = "Organic"
            elif "weather" in title_lower or "rain" in title_lower or "monsoon" in title_lower:
                cat = "Weather"
            elif "market" in title_lower or "price" in title_lower or "rate" in title_lower or "mandi" in title_lower:
                cat = "Market"
            elif "scheme" in title_lower or "subsidy" in title_lower or "govt" in title_lower:
                cat = "Government Schemes"
            elif "technology" in title_lower or "drone" in title_lower or "sensor" in title_lower or "ai " in title_lower:
                cat = "Technology"

            formatted.append({
                "title": article.get("title"),
                "description": article.get("description"),
                "source": article.get("source", {"name": "News Agency"}),
                "publishedAt": article.get("publishedAt"),
                "image": article.get("image") or article.get("urlToImage") or "",
                "url": article.get("url"),
                "category": cat
            })
            
        if formatted:
            return jsonify({"articles": formatted})
    except Exception as e:
        print(f"NEWS API WARNING: {e}. Returning high-quality fallback database.")

    return jsonify({"articles": fallback_news})

@app.route("/predict", methods=["POST"])
@require_jwt()
def predict():
    """Analyzes a leaf image and returns a comprehensive farming guide."""
    if 'leaf' not in request.files:
        return jsonify({"error": "No 'leaf' file part in the request"}), 400

    file = request.files['leaf']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    source = request.form.get("source", "upload")
    is_brief = request.form.get("brief", "false").lower() == "true"

    try:
        image_bytes = file.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt_text = f"""
        You are an advanced AI Crop Disease Prediction Engine.
        Analyze the provided leaf image and generate a structured, farmer-friendly diagnosis report.

        { "SOURCE: Analyzed using live camera image" if source == "camera" else "" }

        GENERAL RULES:
        - Output must be clean, readable plain text.
        - NO JSON, no markdown symbols (no asterisks, no hashes, no backticks).
        - Use simple, professional, and practical language.
        - Default language is English.
        - Be short, sweet, and confident.
        - End with: "This problem is common and controllable. Timely action will protect your crop."

        { "MODE: BRIEF MODE. Show ONLY: Disease Name, Severity, What to Do Today, Medicine Name." if is_brief else "MODE: FULL ANALYSIS" }

        OUTPUT STRUCTURE (Use these exact headings in order):

        CROP IDENTIFICATION
        - Crop name
        - Confidence: High / Medium / Low

        LEAF CONDITION
        - Healthy / Disease Detected / Pest Attack / Nutrient Deficiency

        DISEASE ANALYSIS
        - Disease name
        - Category: Fungal / Bacterial / Viral / Pest / Nutrient
        - Stage: Early / Moderate / Severe

        PRIORITY STATUS
        🟢 Normal – no action needed (Use only if Healthy)
        🟡 Watch – monitor closely (Use for Early stage or minor issues)
        🔴 Urgent – treat immediately (Use for Moderate/Severe or high risk)

        WHY THIS PROBLEM OCCURRED
        - Briefly explain (Weather, Watering, Soil, or Pest reason).

        KEY ACTION BLOCK
        Disease Name:
        Severity:
        What to Do Today:
        Medicine Name:

        TREATMENT GUIDANCE
        Organic Treatment:
        - Remedy and Dosage.
        Chemical Treatment:
        - Indian medicine name, Dosage, and Spray interval.

        DO NOT DO
        - Common mistakes to avoid.

        RECOVERY & PREVENTION
        - Expected recovery time and signs of improvement.
        - Simple prevention tips.

        FINAL SHORT ADVICE
        - 1–2 sentences of reassurance.
        """

        response = gemini_generate(
            [
                types.Part.from_text(text=prompt_text),
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            ],
            client=disease_client
        )

        prediction_report_text = response.text

        # Extract disease name for the notification
        disease_name = "Scan Completed"
        for line in prediction_report_text.split("\n"):
            if "disease name:" in line.lower() or "disease name :" in line.lower():
                parts = line.split(":")
                if len(parts) > 1:
                    disease_name = parts[1].strip().replace("*", "").replace("_", "")
                    break

        # Send real-time native push notification
        try:
            from routes.notifications import send_user_push_notification
            send_user_push_notification(
                user_id=request.uid,
                title="🔬 Crop Health Scan Completed",
                body=f"Leaf analysis result: {disease_name}. View recommended medicines and nearby shops.",
                payload_type="disease_reports"
            )
        except Exception as push_err:
            print(f"WARNING: Failed to send disease scan push: {push_err}")

        return jsonify({"prediction_text": prediction_report_text})

    except Exception as e:
        print(f"PREDICTION ERROR: {e}")
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__) or "exceeded your current quota" in str(e):
             return jsonify({"prediction_text": "CROP IDENTIFICATION\n- Crop name: Mock Crop (API Limit)\n- Confidence: High\n\nLEAF CONDITION\n- Healthy\n\nDISEASE ANALYSIS\n- Disease name: None (API Limit Reached)\n- Category: None\n- Stage: None\n\nPRIORITY STATUS\n🟡 Watch – monitor closely\n\nWHY THIS PROBLEM OCCURRED\n- The AI API free tier rate limit was exceeded. Please wait 60 seconds and try again.\n\nKEY ACTION BLOCK\nDisease Name: API Quota Limit\nSeverity: Moderate\nWhat to Do Today: Wait 60 seconds and try again.\nMedicine Name: None\n\nTREATMENT GUIDANCE\nOrganic Treatment:\n- Wait a minute.\nChemical Treatment:\n- Upgrade to a paid API key.\n\nDO NOT DO\n- Do not continuously hit the submit button.\n\nRECOVERY & PREVENTION\n- Expected recovery time is 1 minute.\n- Upgrade API limits to prevent this.\n\nFINAL SHORT ADVICE\n- This problem is common and controllable. Timely action will protect your crop."})
        return jsonify({"error": f"An unexpected error occurred on the server: {e}"}), 500

@app.route("/translate-report", methods=["POST"])
def translate_report():
    """Translates the analysis report text into the target language."""
    try:
        data = request.get_json()
        text = data.get("text", "")
        target_lang = data.get("language", "English")

        if not text:
            return jsonify({"error": "No text provided"}), 400

        prompt = f"""
        Translate the following Crop Disease Analysis report into {target_lang}.
        Maintain the "Govt agriculture style" and farmer-friendly tone.
        Ensure all technical terms are explained simply.
        Do not change the meaning or the structure of the report.
        Keep the original headings but translated.
        Output only the translated text, no other comments.

        Report Text:
        {text}
        """

        response = gemini_generate(
            prompt,
            client=disease_client
        )
        translated_text = response.text
        return jsonify({"translated_text": translated_text})

    except Exception as e:
        print(f"TRANSLATION ERROR: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/ask-leaf-followup", methods=["POST"])
def ask_leaf_followup():
    """Handles follow-up questions related to the analyzed leaf."""
    try:
        data = request.get_json()
        question = data.get("question", "")
        report_context = data.get("report", "")

        if not question or not report_context:
            return jsonify({"error": "Missing question or report context"}), 400

        prompt = f"""
        The user has a follow-up question about their plant which was just analyzed.
        Original Analysis:
        {report_context}

        User Question:
        {question}

        RULES:
        - Answer ONLY related to this leaf & original result.
        - Keep answers short and practical.
        - Do not repeat the full report.
        - Be supportive and clear.
        - If the question is unrelated, politely redirect to the report.
        """

        response = gemini_generate(
            prompt,
            client=disease_client
        )
        answer = response.text
        return jsonify({"answer": answer})

    except Exception as e:
        print(f"FOLLOWUP ERROR: {e}")
        return jsonify({"error": str(e)}), 500


import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth (in km)."""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 2)


@app.route("/nearby-agri-shops", methods=["GET"])
def nearby_agri_shops():
    """Finds nearby agricultural/pesticide shops using Overpass API and recommends medicines via Gemini."""
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    radius = request.args.get("radius", "5000")  # meters, default 5km
    disease_name = request.args.get("disease", "").strip()

    if not lat or not lon:
        return jsonify({"error": "lat and lon parameters are required"}), 400

    try:
        lat = float(lat)
        lon = float(lon)
        radius = int(radius)
    except ValueError:
        return jsonify({"error": "Invalid lat, lon, or radius values"}), 400

    # ─── 1. Query Overpass API for nearby agricultural shops ─────────────────
    overpass_endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
    ]
    overpass_query = (
        f'[out:json][timeout:25];'
        f'(node["shop"="agrarian"](around:{radius},{lat},{lon});'
        f'node["shop"="farm"](around:{radius},{lat},{lon});'
        f'node["shop"="garden"](around:{radius},{lat},{lon});'
        f'node["shop"="hardware"](around:{radius},{lat},{lon});'
        f'node["amenity"="pharmacy"](around:{radius},{lat},{lon});'
        f'node["name"~"Agri|Pesticide|Fertilizer|Krishi|Seed|Farm",i](around:{radius},{lat},{lon});'
        f'way["shop"="agrarian"](around:{radius},{lat},{lon});'
        f'way["shop"="farm"](around:{radius},{lat},{lon});'
        f'way["name"~"Agri|Pesticide|Fertilizer|Krishi|Seed|Farm",i](around:{radius},{lat},{lon});'
        f');out center body;'
    )

    shops = []
    try:
        print(f"INFO: Querying Overpass API for agri shops near ({lat}, {lon}), radius={radius}m...")
        overpass_response = None
        for endpoint_url in overpass_endpoints:
            try:
                overpass_response = requests.get(
                    endpoint_url,
                    params={"data": overpass_query},
                    timeout=30
                )
                if overpass_response.status_code == 200:
                    print(f"INFO: Overpass endpoint {endpoint_url} returned 200 OK.")
                    break
                else:
                    print(f"WARNING: {endpoint_url} returned {overpass_response.status_code}, trying next...")
            except Exception as ep_err:
                print(f"WARNING: {endpoint_url} failed: {ep_err}, trying next...")
                continue

        if not overpass_response or overpass_response.status_code != 200:
            print(f"WARNING: All Overpass endpoints failed.")
            overpass_response = None

        if overpass_response and overpass_response.status_code == 200:
            overpass_data = overpass_response.json()
            elements = overpass_data.get("elements", [])
            print(f"INFO: Overpass returned {len(elements)} elements.")

            seen_names = set()
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name", "").strip()
                if not name:
                    continue

                # Deduplicate by name
                name_key = name.lower()
                if name_key in seen_names:
                    continue
                seen_names.add(name_key)

                # Get coordinates (node vs way)
                shop_lat = el.get("lat") or el.get("center", {}).get("lat")
                shop_lon = el.get("lon") or el.get("center", {}).get("lon")
                if not shop_lat or not shop_lon:
                    continue

                distance = haversine_distance(lat, lon, shop_lat, shop_lon)

                shop_info = {
                    "name": name,
                    "lat": shop_lat,
                    "lon": shop_lon,
                    "distance_km": distance,
                    "address": ", ".join(filter(None, [
                        tags.get("addr:street", ""),
                        tags.get("addr:city", ""),
                        tags.get("addr:district", ""),
                        tags.get("addr:state", ""),
                        tags.get("addr:postcode", "")
                    ])) or tags.get("addr:full", "Nearby location"),
                    "phone": tags.get("phone", tags.get("contact:phone", "")),
                    "opening_hours": tags.get("opening_hours", ""),
                    "shop_type": tags.get("shop", tags.get("amenity", "shop")),
                    "website": tags.get("website", tags.get("contact:website", "")),
                }
                shops.append(shop_info)

            # Sort by distance
            shops.sort(key=lambda s: s["distance_km"])
            shops = shops[:15]  # Limit to 15 nearest

    except requests.exceptions.Timeout:
        print("WARNING: Overpass API timed out. Returning empty shops list.")
    except Exception as e:
        print(f"WARNING: Overpass API error: {e}")

    # ─── 2. Generate medicine recommendations via Gemini ─────────────────────
    medicines = []
    if disease_name and disease_name.lower() not in ["none", "healthy", "api quota limit", "mock crop"]:
        try:
            medicine_prompt = f"""
            You are an expert Indian agricultural advisor. A farmer has detected the following crop disease:
            Disease: {disease_name}

            Provide exactly 5 recommended medicines/treatments available in Indian agricultural stores.
            Return ONLY a valid JSON array. No extra text, no markdown.

            Each item must have:
            - "name": Brand name available in India (e.g., "Bavistin", "Mancozeb")
            - "generic": Active ingredient name
            - "type": "Chemical" or "Organic" or "Bio-fungicide"
            - "dosage": How to use (e.g., "2g per liter of water, spray on leaves")
            - "price_range": Estimated price in INR (e.g., "Rs. 150-250 per 100g")
            - "effectiveness": "High" or "Medium" or "Low"

            Example format:
            [
              {{"name": "Bavistin", "generic": "Carbendazim 50% WP", "type": "Chemical", "dosage": "1g per liter of water", "price_range": "Rs. 120-180 per 100g", "effectiveness": "High"}}
            ]
            """

            response = gemini_generate(
                medicine_prompt,
                client=disease_client
            )
            raw_text = response.text.strip()

            # Extract JSON array
            start = raw_text.find('[')
            end = raw_text.rfind(']')
            if start != -1 and end != -1:
                medicines = json.loads(raw_text[start:end+1])
                print(f"INFO: Generated {len(medicines)} medicine recommendations for '{disease_name}'")
            else:
                print(f"WARNING: Could not parse medicine recommendations JSON: {raw_text[:200]}")

        except Exception as e:
            print(f"WARNING: Medicine recommendation generation failed: {e}")
            # Fallback medicines
            medicines = [
                {"name": "Bavistin", "generic": "Carbendazim 50% WP", "type": "Chemical", "dosage": "1g per liter of water, spray on affected areas", "price_range": "Rs. 120-180 per 100g", "effectiveness": "High"},
                {"name": "Mancozeb", "generic": "Mancozeb 75% WP", "type": "Chemical", "dosage": "2.5g per liter of water", "price_range": "Rs. 150-250 per 250g", "effectiveness": "High"},
                {"name": "Neem Oil", "generic": "Azadirachtin", "type": "Organic", "dosage": "5ml per liter of water", "price_range": "Rs. 200-350 per 500ml", "effectiveness": "Medium"},
                {"name": "Trichoderma", "generic": "Trichoderma viride", "type": "Bio-fungicide", "dosage": "5g per liter of water", "price_range": "Rs. 100-200 per 250g", "effectiveness": "Medium"},
                {"name": "Copper Oxychloride", "generic": "Copper Oxychloride 50% WP", "type": "Chemical", "dosage": "3g per liter of water", "price_range": "Rs. 180-280 per 250g", "effectiveness": "High"},
            ]

    return jsonify({
        "shops": shops,
        "medicines": medicines,
        "location": {"lat": lat, "lon": lon},
        "radius_m": radius,
        "total_shops_found": len(shops)
    })


@app.route("/weather", methods=["GET"])
def weather():
    """Fetches comprehensive weather data from OpenWeatherMap OneCall API."""
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    city_name_query = request.args.get("city")

    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "Weather API key not configured"}), 500

    final_city_name = city_name_query

    try:
        if city_name_query:
            geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city_name_query}&limit=1&appid={OPENWEATHER_API_KEY}"
            geo_response = requests.get(geo_url)
            geo_response.raise_for_status()
            geo_data = geo_response.json()
            if not geo_data:
                return jsonify({"error": f"City '{city_name_query}' not found. Please check spelling."}), 404
            lat = geo_data[0]['lat']
            lon = geo_data[0]['lon']

        elif lat and lon:
            reverse_geo_url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={OPENWEATHER_API_KEY}"
            reverse_geo_response = requests.get(reverse_geo_url)
            reverse_geo_response.raise_for_status()
            reverse_geo_data = reverse_geo_response.json()
            if reverse_geo_data:
                loc = reverse_geo_data[0]
                final_city_name = f"{loc.get('name', 'Unknown')}, {loc.get('state', '')} {loc.get('country', '')}".strip(', ')

        if not lat or not lon:
            return jsonify({"error": "City name or latitude/longitude are required"}), 400

        # Try OneCall 3.0 first (Modern/Detailed)
        try:
            one_call_url = f"https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&exclude=minutely&units=metric&appid={OPENWEATHER_API_KEY}"
            weather_response = requests.get(one_call_url, timeout=10)
            weather_response.raise_for_status()
            weather_data = weather_response.json()
        except Exception as e:
            print(f"OneCall 3.0 failed: {e}. Falling back to 2.5 API...")
            current_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={OPENWEATHER_API_KEY}"
            forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&appid={OPENWEATHER_API_KEY}"

            curr_res = requests.get(current_url, timeout=10)
            curr_res.raise_for_status()
            curr_data = curr_res.json()

            fore_res = requests.get(forecast_url, timeout=10)
            fore_res.raise_for_status()
            fore_data = fore_res.json()

            weather_data = {
                "lat": lat, "lon": lon,
                "timezone": curr_data.get("name", "Unknown"),
                "current": {
                    "dt": curr_data["dt"],
                    "temp": curr_data["main"]["temp"],
                    "feels_like": curr_data["main"]["feels_like"],
                    "humidity": curr_data["main"]["humidity"],
                    "pressure": curr_data["main"]["pressure"],
                    "weather": curr_data["weather"],
                    "wind_speed": curr_data["wind"]["speed"],
                    "wind_deg": curr_data["wind"]["deg"],
                    "sunrise": curr_data["sys"]["sunrise"],
                    "sunset": curr_data["sys"]["sunset"],
                    "visibility": curr_data.get("visibility", 10000),
                    "uvi": 0
                },
                "hourly": [{"dt": i["dt"], "temp": i["main"]["temp"], "weather": i["weather"]} for i in fore_data["list"][:24]],
                "daily": [{"dt": i["dt"], "temp": {"day": i["main"]["temp"], "night": i["main"]["temp"] - 5}, "weather": i["weather"]} for i in fore_data["list"][::8]]
            }

        # Fetch air pollution data
        try:
            air_pollution_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
            air_response = requests.get(air_pollution_url, timeout=5)
            air_response.raise_for_status()
            air_data = air_response.json()
            weather_data['air_quality'] = air_data.get('list', [{}])[0]
        except Exception as ae:
            print(f"Air pollution fetch failed: {ae}")
            weather_data['air_quality'] = {"main": {"aqi": "N/A"}}

        weather_data['city_name'] = final_city_name or weather_data.get('timezone', 'Unknown').split('/')[-1].replace('_', ' ')
        weather_data['lat'] = lat
        weather_data['lon'] = lon

        current_hour = datetime.now().hour
        is_night = current_hour < 6 or current_hour > 18

        def get_moon_phase(d):
            diff = d - datetime(2001, 1, 1)
            days = diff.days + diff.seconds / 86400.0
            lunations = 0.20439731 + (days * 0.03386319269)
            return lunations % 1.0

        moon_phase_val = get_moon_phase(datetime.now())
        moon_phase_name = "New Moon" if moon_phase_val < 0.06 or moon_phase_val > 0.94 else \
                          "Waxing Crescent" if moon_phase_val < 0.25 else \
                          "First Quarter" if moon_phase_val < 0.31 else \
                          "Waxing Gibbous" if moon_phase_val < 0.5 else \
                          "Full Moon" if moon_phase_val < 0.56 else \
                          "Waning Gibbous" if moon_phase_val < 0.75 else \
                          "Last Quarter" if moon_phase_val < 0.81 else "Waning Crescent"

        humidity = weather_data['current'].get('humidity', 0)
        temp = weather_data['current'].get('temp', 0)
        dew_point = weather_data['current'].get('dew_point', temp - ((100 - humidity) / 5))
        visibility = weather_data['current'].get('visibility', 10000) / 1000

        temp_diff = abs(temp - dew_point)
        fog_prob = 0
        if temp_diff < 3:
            fog_prob = min(90, (100 - (temp_diff * 30)) * (humidity / 100))

        frost_risk = "None"
        if temp < 4 and temp_diff < 2: frost_risk = "Low"
        if temp < 2: frost_risk = "Moderate"
        if temp < 0: frost_risk = "High"

        weather_data['intelligence'] = {
            "is_night": is_night,
            "fog_probability": f"{int(max(0, fog_prob))}%",
            "night_temp_drop": f"{int(weather_data['daily'][0]['temp'].get('day', 0) - weather_data['daily'][0]['temp'].get('night', -5))}°C",
            "uv_risk_level": "Low" if weather_data['current'].get('uvi', 0) < 3 else "Moderate" if weather_data['current'].get('uvi', 0) < 6 else "High",
            "moon_phase": moon_phase_name,
            "moon_phase_val": round(moon_phase_val, 2),
            "visibility_km": f"{round(visibility, 1)}km",
            "dew_point_c": f"{round(dew_point, 1)}°C",
            "frost_risk": frost_risk,
            "cloud_cover": f"{weather_data['current'].get('clouds', 0)}%"
        }

        return jsonify(weather_data)

    except requests.exceptions.RequestException as e:
        print(f"WEATHER ERROR (502): {e}")
        return jsonify({"error": f"Could not connect to weather service: {e}"}), 502
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

@app.route("/weather-intelligence", methods=["GET"])
def weather_intelligence():
    """Generates AI farming advice based on current weather for a city."""
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "City is required"}), 400
    
    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "Weather API key not configured"}), 500
        
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&units=metric&appid={OPENWEATHER_API_KEY}"
        weather_res = requests.get(url, timeout=10)
        weather_res.raise_for_status()
        data = weather_res.json()
        
        condition = data['weather'][0]['description']
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        
        prompt = f"The current weather in {city} is {temp}°C with {humidity}% humidity and {condition}. Provide a short, practical 3-sentence farming advice for local farmers based on these conditions. Focus on irrigation, crop protection, or harvesting. Use simple English without markdown formatting."
        response = gemini_generate(
            prompt,
            client=chatbot_client
        )
        return jsonify({"advice": response.text})
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"WEATHER INTELLIGENCE ERROR: {e}\n{err_msg}", flush=True)
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__) or "exceeded your current quota" in str(e):
             return jsonify({"advice": "AI quota exceeded. Please ensure crops have adequate water and monitor for pests. Wait a minute and refresh for tailored AI advice."})
        return jsonify({"error": f"Could not generate weather intelligence: {str(e)}"}), 500


@app.route("/weather-history", methods=["GET"])
def weather_history():
    """Fetches historical weather data for the last 7 days."""
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "Weather API key not configured"}), 500

    historical_data = []
    today = datetime.utcnow()

    try:
        for i in range(1, 8):
            past_date = today - timedelta(days=i)
            timestamp = int(past_date.timestamp())

            history_url = f"https://api.openweathermap.org/data/3.0/onecall/timemachine?lat={lat}&lon={lon}&dt={timestamp}&units=metric&appid={OPENWEATHER_API_KEY}"

            response = requests.get(history_url)
            response.raise_for_status()
            day_data = response.json()

            if day_data and day_data.get('data'):
                hourly_temps = [hour['temp'] for hour in day_data['data'][0]['hourly']]
                max_temp = max(hourly_temps) if hourly_temps else None
                min_temp = min(hourly_temps) if hourly_temps else None
                daily_summary = day_data['data'][0]

                historical_data.append({
                    "date": past_date.strftime('%Y-%m-%d'),
                    "temp_max": max_temp,
                    "temp_min": min_temp,
                    "condition": daily_summary['weather'][0]['main'],
                    "icon": daily_summary['weather'][0]['icon'],
                    "humidity": daily_summary['humidity'],
                    "wind_speed": daily_summary['wind_speed']
                })

        return jsonify({"history": historical_data[::-1]})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Could not connect to weather history service: {e}"}), 502
    except Exception as e:
        print(f"WEATHER HISTORY ERROR: {e}")
        return jsonify({"error": f"An unexpected error occurred while fetching history: {e}"}), 500


@app.route("/prices", methods=["GET"])
def prices():
    """Fetches vegetable prices using a smart, two-step approach with data.gov.in and fallback."""
    location_raw = request.args.get('location', '').strip()
    vegetable_query = request.args.get('vegetable', '').strip()

    if not location_raw or not vegetable_query:
        return jsonify({"error": "Location and vegetable parameters are required."}), 400

    # Clean location (e.g. "Coimbatore, Tamil Nadu" -> "Coimbatore")
    location_query = location_raw.split(',')[0].strip()

    try:
        print(f"INFO: Attempting to fetch real-time price for {vegetable_query} in {location_query} from data.gov.in...")
        resource_id = "9ef84268-d588-465a-a308-a864a43d0070"
        gov_api_url = (f"https://api.data.gov.in/resource/{resource_id}?"
                       f"api-key={DATA_GOV_API_KEY}&format=json&"
                       f"filters[market]={location_query.title()}&"
                       f"filters[commodity]={vegetable_query.title()}")

        response = requests.get(gov_api_url, timeout=10)

        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            if records:
                print("SUCCESS: Found real-time price.")
                latest_record = records[-1]
                modal_price = latest_record.get('modal_price', '')
                if modal_price:
                    # Convert per quintal to per kg
                    try:
                        price_per_kg = round(float(modal_price) / 100)
                        return jsonify({
                            "vegetable": vegetable_query.title(),
                            "location": location_query.title(),
                            "price": f"₹{price_per_kg}/kg",
                            "displayPrice": f"₹{price_per_kg}/kg",
                            "trend": "stable"
                        })
                    except ValueError:
                        pass
    except Exception as e:
        print(f"WARNING: Real-time API request failed: {e}. Proceeding to fallback.")

    # Fallback to estimate based on seed value
    val = sum(ord(c) for c in vegetable_query) % 40 + 25
    return jsonify({
        "vegetable": vegetable_query.title(),
        "location": location_query.title(),
        "price": f"₹{val}/kg",
        "displayPrice": f"₹{val}/kg",
        "trend": "stable"
    })

@app.route("/vegetable-info", methods=["GET"])
def vegetable_info():
    """Fetches detailed information about a vegetable using the Gemini API."""
    vegetable_name = request.args.get('name', '').strip()
    if not vegetable_name:
        return jsonify({"error": "Vegetable name is required."}), 400

    try:
        prompt = f"""
        Provide a detailed guide for the vegetable '{vegetable_name}'.
        Your entire response MUST be a single, valid JSON object with no markdown or any other text.
        Use this exact structure:
        {{
          "name": "{vegetable_name.title()}",
          "image_search_term": "A simple search term to find a high-quality photo, e.g., 'Fresh {vegetable_name}'",
          "history": "A brief, interesting history of the vegetable's origin and its journey to India (2-3 sentences).",
          "cultivation": {{
            "soil": "Ideal soil type and pH range for this vegetable.",
            "water": "Watering requirements (e.g., frequency, amount).",
            "climate": "Suitable climate conditions (e.g., temperature range, sunlight)."
          }},
          "nutrition": [
            {{"nutrient": "Calories", "value": "Approx. value per 100g"}},
            {{"nutrient": "Vitamin C", "value": "Approx. value or % of Daily Value"}},
            {{"nutrient": "Potassium", "value": "Approx. value per 100g"}},
            {{"nutrient": "Fiber", "value": "Approx. value per 100g"}}
          ]
        }}
        """

        response = gemini_generate(
            prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        veg_data = extract_json(response.text)

        search_term = veg_data.get("image_search_term", vegetable_name)
        image_url = get_image_url_from_google(search_term)
        veg_data["image_url"] = image_url or f"https://source.unsplash.com/400x400/?{vegetable_name.replace(' ', '+')}"

        return jsonify(veg_data)

    except Exception as e:
        print(f"VEGETABLE INFO ERROR: {e}")
        return jsonify({"error": f"Could not retrieve details for {vegetable_name}."}), 500


def get_current_indian_season():
    """Determines the current Indian agricultural season."""
    current_month = datetime.now().month
    if 6 <= current_month <= 10:
        return "Kharif (Monsoon Crop)"
    elif 11 <= current_month or current_month <= 3:
        return "Rabi (Winter Crop)" 
    else:
        return "Zaid (Summer Crop)"


# ── Static soil knowledge base for Indian districts ──────────────────────────
SOIL_KNOWLEDGE_BASE = {
    "coimbatore":   {"type": "Red Loamy Soil", "ph": "6.0–7.5", "nitrogen": "Medium", "phosphorus": "Low–Medium", "potassium": "High", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "700–900", "climate": "Semi-arid tropical", "best_crops": ["Cotton", "Groundnut", "Maize", "Sorghum", "Turmeric"]},
    "salem":        {"type": "Red Sandy Loam", "ph": "6.0–7.0", "nitrogen": "Low–Medium", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "800–1000", "climate": "Hot semi-arid", "best_crops": ["Mango", "Tapioca", "Groundnut", "Maize", "Banana"]},
    "madurai":      {"type": "Black Cotton Soil (Vertisol)", "ph": "7.5–8.5", "nitrogen": "Medium", "phosphorus": "Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Poor–Moderate", "rainfall_mm": "850–950", "climate": "Tropical semi-arid", "best_crops": ["Cotton", "Sorghum", "Sunflower", "Pulses", "Paddy"]},
    "trichy":       {"type": "Alluvial Clay Loam", "ph": "6.5–7.5", "nitrogen": "Medium–High", "phosphorus": "Medium", "potassium": "Medium", "organic_matter": "Medium", "drainage": "Moderate", "rainfall_mm": "900–1100", "climate": "Tropical wet-dry", "best_crops": ["Paddy", "Banana", "Sugarcane", "Groundnut", "Pulses"]},
    "erode":        {"type": "Red Laterite", "ph": "5.5–6.5", "nitrogen": "Low", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "650–800", "climate": "Semi-arid", "best_crops": ["Turmeric", "Coconut", "Banana", "Groundnut", "Cotton"]},
    "tirunelveli":  {"type": "Alluvial + Sandy", "ph": "6.5–7.5", "nitrogen": "Medium", "phosphorus": "Low–Medium", "potassium": "Medium", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "600–800", "climate": "Tropical arid", "best_crops": ["Banana", "Paddy", "Cotton", "Groundnut", "Cashew"]},
    "chennai":      {"type": "Sandy Clay Loam", "ph": "6.5–7.5", "nitrogen": "Low", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "1200–1400", "climate": "Tropical coastal", "best_crops": ["Coconut", "Paddy", "Vegetables", "Flowers", "Tapioca"]},
    "mumbai":       {"type": "Laterite + Clay", "ph": "6.0–7.0", "nitrogen": "Medium", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Medium", "drainage": "Moderate", "rainfall_mm": "2200–2400", "climate": "Tropical monsoon", "best_crops": ["Rice", "Vegetables", "Coconut", "Cashew", "Mango"]},
    "delhi":        {"type": "Sandy Loam (Alluvial)", "ph": "7.5–8.5", "nitrogen": "Medium", "phosphorus": "Medium", "potassium": "High", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "600–800", "climate": "Semi-arid subtropical", "best_crops": ["Wheat", "Mustard", "Paddy", "Vegetables", "Sugarcane"]},
    "bangalore":    {"type": "Red Sandy Loam", "ph": "5.5–7.0", "nitrogen": "Low–Medium", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "900–1000", "climate": "Tropical highland", "best_crops": ["Ragi", "Maize", "Tomato", "Grapes", "Flowers"]},
    "hyderabad":    {"type": "Black Soil (Deccan)", "ph": "7.5–8.5", "nitrogen": "Medium", "phosphorus": "Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Slow", "rainfall_mm": "800–950", "climate": "Semi-arid tropical", "best_crops": ["Cotton", "Sorghum", "Maize", "Sunflower", "Paddy"]},
    "pune":         {"type": "Mixed Red & Black", "ph": "6.5–7.5", "nitrogen": "Medium", "phosphorus": "Low–Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Moderate", "rainfall_mm": "700–900", "climate": "Tropical semi-arid", "best_crops": ["Sugarcane", "Grapes", "Onion", "Wheat", "Vegetables"]},
    "nagpur":       {"type": "Deep Black Cotton Soil", "ph": "7.5–8.0", "nitrogen": "High", "phosphorus": "Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Poor", "rainfall_mm": "1100–1300", "climate": "Tropical wet-dry", "best_crops": ["Cotton", "Orange", "Soybean", "Sorghum", "Wheat"]},
    "patna":        {"type": "Alluvial (Gangetic)", "ph": "7.0–8.0", "nitrogen": "Medium–High", "phosphorus": "Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Moderate", "rainfall_mm": "1100–1200", "climate": "Sub-tropical humid", "best_crops": ["Paddy", "Wheat", "Maize", "Lentils", "Sugarcane"]},
    "lucknow":      {"type": "Alluvial Clay Loam", "ph": "7.5–8.5", "nitrogen": "Medium", "phosphorus": "Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Moderate", "rainfall_mm": "900–1000", "climate": "Sub-tropical", "best_crops": ["Wheat", "Paddy", "Sugarcane", "Mango", "Pulses"]},
    "jaipur":       {"type": "Sandy Desert Soil", "ph": "7.5–9.0", "nitrogen": "Low", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Very Low", "drainage": "Excessive", "rainfall_mm": "300–500", "climate": "Arid hot", "best_crops": ["Bajra", "Cluster Bean", "Mustard", "Sesame", "Date Palm"]},
    "ahmedabad":    {"type": "Sandy Loam + Calcareous", "ph": "7.5–8.5", "nitrogen": "Low", "phosphorus": "Low", "potassium": "Medium", "organic_matter": "Low", "drainage": "Well-drained", "rainfall_mm": "700–800", "climate": "Semi-arid tropical", "best_crops": ["Cotton", "Groundnut", "Tobacco", "Castor", "Bajra"]},
    "bhopal":       {"type": "Black Soil (Vertisol)", "ph": "7.0–8.0", "nitrogen": "Medium", "phosphorus": "Low–Medium", "potassium": "High", "organic_matter": "Medium", "drainage": "Poor–Moderate", "rainfall_mm": "1200–1400", "climate": "Tropical wet-dry", "best_crops": ["Soybean", "Wheat", "Cotton", "Gram", "Linseed"]},
    "kolkata":      {"type": "Alluvial (Deltaic)", "ph": "6.0–7.5", "nitrogen": "High", "phosphorus": "Medium", "potassium": "Medium", "organic_matter": "High", "drainage": "Poor (waterlogged)", "rainfall_mm": "1600–1800", "climate": "Tropical humid", "best_crops": ["Paddy", "Jute", "Vegetables", "Mustard", "Potato"]},
}

@app.route("/soil-data", methods=["GET"])
def get_soil_data():
    """Returns soil profile data for a given location using knowledge base + Gemini fallback."""
    location = request.args.get("location", "").strip().lower()
    if not location:
        return jsonify({"error": "Location is required"}), 400

    # Try exact match first
    soil_info = SOIL_KNOWLEDGE_BASE.get(location)

    # Try partial match (e.g. "coimbatore district" → "coimbatore")
    if not soil_info:
        for key in SOIL_KNOWLEDGE_BASE:
            if key in location or location in key:
                soil_info = SOIL_KNOWLEDGE_BASE[key]
                break

    if soil_info:
        print(f"SOIL-DATA: Served from knowledge base for '{location}'")
        return jsonify({
            "location": location.title(),
            "source": "knowledge_base",
            **soil_info
        })

    # Fallback: ask Gemini
    prompt = f"""
    You are an Indian agricultural soil scientist. For the location "{location.title()}" in India,
    provide soil and climate data as a valid JSON object with NO markdown and NO extra text.
    Use this exact structure:
    {{
      "type": "Primary soil type name",
      "ph": "pH range e.g. 6.0-7.5",
      "nitrogen": "Low/Medium/High",
      "phosphorus": "Low/Medium/High",
      "potassium": "Low/Medium/High",
      "organic_matter": "Low/Medium/High",
      "drainage": "Description e.g. Well-drained",
      "rainfall_mm": "Annual range e.g. 800-1000",
      "climate": "Climate classification",
      "best_crops": ["crop1", "crop2", "crop3", "crop4", "crop5"]
    }}
    """
    try:
        response = gemini_generate(prompt)
        raw = response.text
        result = extract_json(raw)
        return jsonify({"location": location.title(), "source": "ai_generated", **result})
    except Exception as e:
        error_msg = str(e)
        print(f"SOIL-DATA GEMINI ERROR: {error_msg}")
        # Return a generic fallback so frontend doesn't break
        return jsonify({
            "location": location.title(),
            "source": "estimated",
            "type": "Mixed Soil",
            "ph": "6.5–7.5",
            "nitrogen": "Medium",
            "phosphorus": "Medium",
            "potassium": "Medium",
            "organic_matter": "Low–Medium",
            "drainage": "Moderate",
            "rainfall_mm": "800–1200",
            "climate": "Tropical",
            "best_crops": ["Paddy", "Wheat", "Maize", "Vegetables", "Pulses"]
        })


@app.route("/planner", methods=["POST"])
@require_jwt()
def planner():
    """Generates personalized crop planting cost estimation and schedule using location soil data."""
    data = request.get_json() or {}
    land = data.get("land", "").strip()
    unit = data.get("unit", "Acres").strip()
    location = data.get("location", "").strip()
    crop_name = data.get("crop_name", "").strip()
    soil_profile = data.get("soil_profile", {})

    if not land or not crop_name or not location:
        return jsonify({"error": "Land area, Location/District, and Crop name are required"}), 400

    soil_context = f"""
    - Soil Type: {soil_profile.get('type', 'Not specified')}
    - Soil pH: {soil_profile.get('ph', 'N/A')}
    - Nitrogen Level: {soil_profile.get('nitrogen', 'N/A')}
    - Phosphorus Level: {soil_profile.get('phosphorus', 'N/A')}
    - Potassium Level: {soil_profile.get('potassium', 'N/A')}
    - Organic Matter: {soil_profile.get('organic_matter', 'N/A')}
    - Drainage: {soil_profile.get('drainage', 'N/A')}
    - Annual Rainfall: {soil_profile.get('rainfall_mm', 'N/A')} mm
    - Climate: {soil_profile.get('climate', 'N/A')}
    """

    prompt = f"""
    You are an expert agricultural economist and master agronomist in India. Provide a detailed planting cost estimation and farming plan for growing "{crop_name}" on {land} {unit} in the district of {location} using the following local soil profile:
    {soil_context}

    Calculate exact estimated Indian Rupee (₹) costs based on the land area of {land} {unit} for this crop.

    Your entire response MUST be a single, valid JSON object with no markdown, no backticks, and no other text.
    Use this exact nested structure:
    {{
      "crop_name": "{crop_name}",
      "land_details": "{land} {unit} in {location}",
      "soil_suitability": "Explain how suitable the soil type ({soil_profile.get('type', 'N/A')}), pH ({soil_profile.get('ph', 'N/A')}), and nutrients are for growing {crop_name}.",
      
      "financials": {{
        "seed_cost": "Estimated seed or seedling cost in ₹ for {land} {unit}",
        "land_preparation": "Ploughing, weeding, and tilling cost in ₹ for {land} {unit}",
        "fertilizer_pesticide": "Fertilizer, manure, and pest control cost in ₹ for {land} {unit}",
        "irrigation": "Water pump electricity or supply cost in ₹ for {land} {unit}",
        "labor": "Sowing, maintenance, and harvesting labor cost in ₹ for {land} {unit}",
        "total_cost": "Total cost of cultivation in ₹ (sum of the above)",
        "expected_yield": "Expected harvest yield (e.g. 15-20 Tonnes)",
        "expected_revenue": "Expected total revenue in ₹ based on typical mandi price",
        "net_profit": "Expected net profit in ₹ (revenue minus total cost)"
      }},
      
      "timeline": [
        {{
          "stage": "Week 1-2: Land Preparation",
          "action": "Till land twice. Apply manure. Prepare sowing channels."
        }},
        {{
          "stage": "Week 3: Sowing",
          "action": "Sow seeds at recommended depth and spacing."
        }},
        {{
          "stage": "Week 4-10: Growth & Intercultural",
          "action": "Apply nitrogen and fertilizers based on local soil needs. Perform weeding."
        }},
        {{
          "stage": "Week 12+: Harvesting",
          "action": "Harvest mature produce during early morning hours."
        }}
      ],
      
      "nutrient_recommendation": "Recommendations on how to fix soil deficiencies or enhance the soil for {crop_name}.",
      "irrigation_recommendation": "Watering requirements (e.g., Drip irrigation every 3 days) based on soil drainage and rainfall."
    }}
    """

    if not GEMINI_PLANNER_API_KEY or not planner_client:
        print("ERROR: GEMINI_PLANNER_API_KEY is missing!")
        return jsonify({"error": "AI configuration error. Please contact support."}), 500

    try:
        print(f"DEBUG: AI Planner Inputs - Land: {land} {unit}, Location: {location}, CropName: {crop_name}, SoilProfile: {bool(soil_profile)}")
        response = gemini_generate(prompt, client=planner_client)

        if not response.candidates:
            feedback = getattr(response, 'prompt_feedback', 'No feedback available')
            print(f"ERROR: No response candidates. Feedback: {feedback}")
            return jsonify({"error": "AI could not generate this plan. Please try with different phrasing."}), 500

        raw_text = response.text
        if not raw_text:
            print("ERROR: AI returned empty text.")
            return jsonify({"error": "AI returned an empty response. Please try again."}), 500

        print(f"DEBUG: AI Raw Text Received (Length: {len(raw_text)})")
        result = extract_json(raw_text)

        # Send real-time native push notification
        try:
            from routes.notifications import send_user_push_notification
            send_user_push_notification(
                user_id=request.uid,
                title="🌱 AI Crop Plan Generated",
                body=f"Cultivation cost report and farming schedule for {crop_name} is ready.",
                payload_type="general"
            )
        except Exception as push_err:
            print(f"WARNING: Failed to send planner push: {push_err}")

        return jsonify(result)
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"PLANNER ERROR: {error_msg}")
        traceback.print_exc()
        if "429" in error_msg or "quota" in error_msg.lower() or "ResourceExhausted" in error_msg:
            return jsonify({"plan": [{"crop": "Mock Wheat (Quota Exceeded)", "duration": "120 days", "roi": "High", "tips": "API rate limit reached. Please wait a minute and try again."}]})
        return jsonify({"error": "Could not generate a farming plan. Please try again later."}), 500


@app.route("/loan-eligibility", methods=["POST"])
def loan_eligibility():
    """AI-powered agricultural loan eligibility checker."""
    try:
        data = request.get_json()
        monthly_income = data.get("monthly_income", 0)
        land_acres = data.get("land_acres", 0)
        loan_amount = data.get("loan_amount", 0)
        purpose = data.get("purpose", "")
        state = data.get("state", "")

        prompt = f"""
        You are an Indian agricultural loan advisor. Analyze this farmer's loan application:
        - Monthly Income: ₹{monthly_income}
        - Land Owned: {land_acres} acres
        - Loan Amount Requested: ₹{loan_amount}
        - Purpose: {purpose}
        - State: {state}

        Respond ONLY with a valid JSON object (no markdown, no backticks):
        {{
          "eligible": true or false,
          "score": "a score from 0-100",
          "verdict": "one line verdict",
          "schemes": ["list of 2-3 relevant govt schemes like PM-KISAN, KCC, NABARD"],
          "tips": ["2-3 improvement tips if not eligible"],
          "monthly_emi": "estimated EMI at 4% interest"
        }}
        """

        if not GEMINI_API_KEY:
            return jsonify({"error": "Gemini API Key is missing in .env file."}), 500

        response = gemini_generate(
            prompt
        )
        result = extract_json(response.text)
        return jsonify(result)
    except Exception as e:
        print(f"LOAN ELIGIBILITY ERROR: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/moderate-post", methods=["POST"])
def moderate_post():
    """AI moderation for community posts — checks if content is appropriate for the farming community."""
    try:
        data = request.get_json()
        content = data.get("content", "")

        if not content:
            return jsonify({"approved": True, "reason": ""}), 200

        prompt = f"""
        You are a content moderator for an Indian farmers' community forum.
        Check if this post is appropriate for the farming community.

        Post: "{content}"

        Respond ONLY with JSON (no markdown, no backticks):
        {{"approved": true or false, "reason": "brief reason if rejected"}}
        """

        if not GEMINI_API_KEY:
            # Default approve if AI unavailable
            return jsonify({"approved": True, "reason": ""}), 200

        response = gemini_generate(
            prompt
        )
        result = extract_json(response.text)
        return jsonify(result)
    except Exception as e:
        print(f"MODERATE POST ERROR: {e}")
        # Default to approved on error — don't block community posts due to AI downtime
        return jsonify({"approved": True, "reason": ""}), 200


@app.route("/prices-all", methods=["GET"])
def prices_all():
    """Fetches or estimates market prices for all vegetables in a single request."""
    location_raw = request.args.get('location', 'Coimbatore').strip()
    simulate = request.args.get('simulate', 'false').lower() == 'true'
    
    # Clean location (e.g. "Coimbatore, Tamil Nadu" -> "Coimbatore")
    location_query = location_raw.split(',')[0].strip()
 
    # Pre-calculated realistic base prices for Tamil Nadu districts
    base_prices = {
        "Tomato": 45, "Onion": 32, "Potato": 28, "Brinjal": 38,
        "Carrot": 55, "Cabbage": 24, "Cauliflower": 42, "Ladies Finger": 30
    }
 
    try:
        print(f"INFO: Fetching all vegetable prices for {location_query} (simulate={simulate}) from data.gov.in...")
        resource_id = "9ef84268-d588-465a-a308-a864a43d0070"
        
        # Query data.gov.in for the market
        gov_api_url = (f"https://api.data.gov.in/resource/{resource_id}?"
                       f"api-key={DATA_GOV_API_KEY}&format=json&limit=50&"
                       f"filters[market]={location_query.title()}")
        
        response = requests.get(gov_api_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            if records:
                print(f"SUCCESS: Found {len(records)} records for {location_query} market on data.gov.in.")
                
                # Map records to our format
                mapped_prices = []
                import random
                sim_offset = random.choice([-8, -6, -4, 4, 6, 8]) if simulate else 0
                for veg in base_prices.keys():
                    match = None
                    for r in records:
                        if veg.lower() in r.get('commodity', '').lower():
                            match = r
                            break
                    
                    if match and match.get('modal_price'):
                        try:
                            price_per_kg = round(float(match.get('modal_price')) / 100)
                            if simulate and veg == "Tomato":
                                price_per_kg = max(10, price_per_kg + sim_offset)
                            mapped_prices.append({
                                "vegetable": veg,
                                "price": price_per_kg,
                                "trend": "up" if price_per_kg > base_prices[veg] else "down" if price_per_kg < base_prices[veg] else "stable"
                            })
                        except ValueError:
                            price_val = base_prices[veg]
                            if simulate and veg == "Tomato":
                                price_val = max(10, price_val + sim_offset)
                            mapped_prices.append({
                                "vegetable": veg,
                                "price": price_val,
                                "trend": "stable"
                            })
                    else:
                        price_val = base_prices[veg]
                        if simulate and veg == "Tomato":
                            price_val = max(10, price_val + sim_offset)
                        mapped_prices.append({
                            "vegetable": veg,
                            "price": price_val,
                            "trend": "stable"
                        })
                return jsonify({"prices": mapped_prices})
    except Exception as e:
        print(f"WARNING: data.gov.in query failed for prices-all: {e}. Falling back to estimates.")
 
    # Safe Fallback Dataset: Seeded values so they are stable but realistic
    import datetime as dt_mod
    day_seed = dt_mod.datetime.now().day
    seed = sum(ord(c) for c in location_query) + day_seed
    
    import random
    sim_offset = random.choice([-8, -6, -4, 4, 6, 8]) if simulate else 0

    estimated_prices = []
    for veg, base in base_prices.items():
        variation = (seed + len(veg)) % 11 - 5
        current_price = max(10, base + variation)
        if simulate and veg == "Tomato":
            current_price = max(10, current_price + sim_offset)
        trend = "up" if variation > 2 else "down" if variation < -2 else "stable"
        estimated_prices.append({
            "vegetable": veg,
            "price": current_price,
            "trend": trend
        })
        
    return jsonify({"prices": estimated_prices})


if __name__ == "__main__":
    print("Starting Flask server (backend/main.py)...")
    app.run(host='0.0.0.0', port=5002, debug=True)
