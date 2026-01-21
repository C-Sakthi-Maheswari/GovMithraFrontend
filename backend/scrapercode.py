import requests
from bs4 import BeautifulSoup
import json
import os
import time

BASE_URL = "https://services.india.gov.in/service/listing"
headers = {
    "User-Agent": "Mozilla/5.0"
}

file_name = "justice_services.json"

# Load existing data if file exists
if os.path.exists(file_name):
    with open(file_name, "r", encoding="utf-8") as f:
        try:
            existing_data = json.load(f)
        except json.JSONDecodeError:
            existing_data = []
else:
    existing_data = []

# Track URLs to avoid duplicates
existing_urls = {item["url"] for item in existing_data}

all_new_services = []

# Loop through 120 pages
for page in range(1, 121):
    print(f"Scraping page {page}...")

    params = {
        "cat_id": 10,
        "ln": "en",
        "page_no": page
    }

    response = requests.get(BASE_URL, headers=headers, params=params)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    service_links = soup.find_all("a", href=True)

    for link in service_links:
        href = link["href"]

        if "service_url_redirect" in href:
            service_name = link.get_text(strip=True)
            service_url = href

            if service_url not in existing_urls:
                all_new_services.append({
                    "name": service_name,
                    "url": service_url
                })
                existing_urls.add(service_url)

    time.sleep(1)  # polite delay

# Save all services to JSON
existing_data.extend(all_new_services)

with open(file_name, "w", encoding="utf-8") as f:
    json.dump(existing_data, f, indent=4, ensure_ascii=False)

print("\n✅ Justice services scraping completed!")
print(f"🆕 New records added: {len(all_new_services)}")
print(f"📁 Total records in {file_name}: {len(existing_data)}")
