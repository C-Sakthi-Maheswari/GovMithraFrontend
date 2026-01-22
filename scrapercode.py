import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://services.india.gov.in/service/listing"
headers = {
    "User-Agent": "Mozilla/5.0"
}

output_file = "traveltourism_services.json"
all_services = []

# Loop through 27 pages
for page in range(1, 28):
    print(f"Scraping page {page}...")

    params = {
        "cat_id": 6,
        "ln": "en",
        "page_no": page
    }

    response = requests.get(BASE_URL, headers=headers, params=params)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Find all links
    links = soup.find_all("a", href=True)

    for link in links:
        href = link["href"]

        if "service_url_redirect" in href:
            service_name = link.get_text(strip=True)
            service_url = href

            all_services.append({
                "name": service_name,
                "url": service_url
            })

    time.sleep(1)  # polite delay

# Save to JSON
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(all_services, f, indent=4, ensure_ascii=False)

print(f"\n✅ Scraping completed!")
print(f"📁 Total records saved: {len(all_services)}")
print(f"📄 File created: {output_file}")
