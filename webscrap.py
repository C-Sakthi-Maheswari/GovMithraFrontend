import requests
from bs4 import BeautifulSoup
import json
import time

# Base URL
base_url = "https://services.india.gov.in/service/listing?cat_id=1&ln=en&page_no={}"

all_services = []

# Loop through pages 1 to 137
for page in range(1, 138):
    print(f"Scraping page {page}...")
    url = base_url.format(page)
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Failed to fetch page {page}")
        continue
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Each service is in a div with class 'edu-lern-con'
    service_divs = soup.find_all('div', class_='edu-lern-con')
    
    for div in service_divs:
        a_tag = div.find('a', class_='ext-link')
        if a_tag:
            service_name = a_tag.text.strip()
            service_url = a_tag['href'].strip()
            
            all_services.append({
                "name": service_name,
                "url": service_url
            })
    
    # polite scraping
    time.sleep(1)

# Save to JSON
with open("india_services.json", "w", encoding='utf-8') as f:
    json.dump(all_services, f, ensure_ascii=False, indent=4)

print(f"Scraped {len(all_services)} services in total!")
