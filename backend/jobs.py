import requests
from bs4 import BeautifulSoup
import json
import os

# URL of the Jobs services page

URL = "https://services.india.gov.in/service/listing?cat_id=96&ln=en"

headers = {
    "User-Agent": "Mozilla/5.0"
}

response = requests.get(URL, headers=headers)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

new_services = []

service_links = soup.find_all("a", href=True)

for link in service_links:
    href = link["href"]

    if "service_url_redirect" in href:
        service_name = link.get_text(strip=True)
        service_url = "https://services.india.gov.in" + href

        new_services.append({
            "name": service_name,
            "url": service_url
        })

# ---------- APPEND LOGIC STARTS HERE ----------

file_name = "citizenshippassport_services.json"

# If file exists, load existing data
if os.path.exists(file_name):
    with open(file_name, "r", encoding="utf-8") as f:
        try:
            existing_data = json.load(f)
        except json.JSONDecodeError:
            existing_data = []
else:
    existing_data = []

# Append new data
existing_data.extend(new_services)

# Write back to JSON
with open(file_name, "w", encoding="utf-8") as f:
    json.dump(existing_data, f, indent=4, ensure_ascii=False)

print(f"Added {len(new_services)} services to {file_name}")
