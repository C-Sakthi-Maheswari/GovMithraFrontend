import requests
from bs4 import BeautifulSoup
import csv
import json

URL = "https://www.studyiq.com/articles/schemes-of-indian-government/"  # replace with the actual webpage URL

r = requests.get(URL)
soup = BeautifulSoup(r.text, "html.parser")

# Find the table
table = soup.find("table")

data = []

# Iterate through rows, skipping the header
for row in table.find_all("tr")[1:]:
    cells = row.find_all(["td", "th"])
    if len(cells) >= 3:
        ministry = cells[0].get_text(strip=True)
        scheme = cells[1].get_text(strip=True)
        details = cells[2].get_text(strip=True)
        data.append({
            "ministry": ministry,
            "scheme": scheme,
            "objective_details": details
        })

# Save to CSV
with open("gov_schemes_table.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["ministry", "scheme", "objective_details"])
    writer.writeheader()
    writer.writerows(data)

# Save to JSON
with open("gov_schemes_table.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print(f"Scraped {len(data)} schemes successfully!")
