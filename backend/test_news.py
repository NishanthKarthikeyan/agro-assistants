import requests, os
from dotenv import load_dotenv
load_dotenv()
url = 'https://newsapi.org/v2/everything?q=agriculture&language=en&apiKey=' + os.getenv('NEWS_API_KEY')
print(requests.get(url).json())
