import requests
from bs4 import BeautifulSoup
import json

URL = "https://www.tnesevai.tn.gov.in/citizen/Pages/ServiceList.aspx"


def scrape_esevai_services():
    response = requests.get(URL, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table")

    if not table:
        raise Exception("Service table not found. Page structure may have changed.")

    services = []
    service_id = 1

    rows = table.find_all("tr")[1:]  # skip header row

    for row in rows:
        tds = row.find_all("td")
        if len(tds) < 7:
            continue

        department = tds[1].get_text(strip=True)
        service_name = tds[2].get_text(strip=True)
        application_fee = tds[4].get_text(strip=True)
        service_charge = tds[5].get_text(strip=True)

        # ⚠️ Documents are NOT provided in this page
        documents_required = []

        # Apply link (generic)
        link_tag = tds[-1].find("a")
        apply_url = (
            link_tag["href"].strip()
            if link_tag and link_tag.has_attr("href")
            else "https://www.tnesevai.tn.gov.in/"
        )

        service_json = {
            "id": f"TN_ESEVAI_{service_id:04d}",
            "name": service_name,
            "url": apply_url,
            "service_type": "Government Service",
            "domain": "e-Sevai",
            "state": "Tamil Nadu",
            "target_roles": [],
            "eligible_categories": [],
            "level": "State",
            "tags": [
                department,
                service_name
            ],
            "documents_required": documents_required,
            "documents_note": (
                "Document list is not available in the e-Sevai service catalog. "
                "Refer operator manual or department portal."
            ),
            "fee": {
                "application_fee": application_fee,
                "service_charge": service_charge
            }
        }

        services.append(service_json)
        service_id += 1

    return services


if __name__ == "__main__":
    data = scrape_esevai_services()

    with open("tn_esevai_services.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Successfully scraped {len(data)} services")
    print("📄 Output saved to tn_esevai_services.json")
