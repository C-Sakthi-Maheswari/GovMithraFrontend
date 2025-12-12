import requests
from bs4 import BeautifulSoup
import csv
import json
import time
import random

BASE_URL = "https://services.india.gov.in/service/listing"
PARAMS = {
    "cat_id": 1,   # Education & Learning
    "ln": "en"
}

all_schemes = []

def scrape_scheme_details(scheme_url):
    """Scrape additional details from the scheme's detail page"""
    try:
        r = requests.get(scheme_url, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        return {
            "eligibility": "",
            "documents": "",
            "benefits": "",
            "last_date": "",
            "application_link": ""
        }

    soup = BeautifulSoup(r.text, "html.parser")

    # Extract commonly available fields
    eligibility_tag = soup.select_one(".field-name-field-eligibility")
    documents_tag = soup.select_one(".field-name-field-documents-required")
    benefits_tag = soup.select_one(".field-name-field-benefits")
    last_date_tag = soup.select_one(".field-name-field-last-date")
    apply_link_tag = soup.select_one(".field-name-field-apply-online a")

    return {
        "eligibility": eligibility_tag.text.strip() if eligibility_tag else "",
        "documents": documents_tag.text.strip() if documents_tag else "",
        "benefits": benefits_tag.text.strip() if benefits_tag else "",
        "last_date": last_date_tag.text.strip() if last_date_tag else "",
        "application_link": apply_link_tag["href"].strip() if apply_link_tag else ""
    }


def scrape_page(page):
    print(f"Scraping page {page} ...")

    params = PARAMS.copy()
    params["page"] = page

    try:
        r = requests.get(BASE_URL, params=params, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        print("Failed page:", page)
        return False

    soup = BeautifulSoup(r.text, "html.parser")
    items = soup.select(".service-block")
    if not items:
        return False  # No more pages

    for item in items:
        title_tag = item.select_one(".service-title")
        desc_tag = item.select_one(".service-description")
        link_tag = item.select_one("a")

        link = link_tag["href"] if link_tag else ""
        if link and not link.startswith("http"):
            link = "https://services.india.gov.in" + link

        scheme = {
            "title": title_tag.text.strip() if title_tag else "",
            "description": desc_tag.text.strip() if desc_tag else "",
            "link": link,
        }

        # Scrape additional details from scheme page
        if link:
            details = scrape_scheme_details(link)
            scheme.update(details)
            time.sleep(random.uniform(1, 2))  # polite delay

        all_schemes.append(scheme)

    return True


# Loop pages until no data
page = 1
while True:
    if not scrape_page(page):
        break
    page += 1
    time.sleep(random.uniform(1, 2))  # polite delay

# Save JSON
with open("gov_schemes.json", "w", encoding="utf-8") as f:
    json.dump(all_schemes, f, indent=4, ensure_ascii=False)

# Save CSV
with open("gov_schemes.csv", "w", newline="", encoding="utf-8") as f:
    fieldnames = ["title", "description", "link", "eligibility", "documents", "benefits", "last_date", "application_link"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(all_schemes)

print("\nScraping Completed!")
print(f"Total services scraped: {len(all_schemes)}")
