from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import json
from datetime import datetime

def scrape_rates(url, metal):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # run without opening browser
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.get(url)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    rates = {}
    rows = soup.find_all("tr")
    for row in rows:
        cols = row.find_all("td")
        if len(cols) >= 2:
            name = cols[0].get_text(strip=True)
            price = cols[1].get_text(strip=True)
            if "₹" in price:
                price_clean = price.replace("₹", "").replace(",", "").strip()
                try:
                    rates[name] = float(price_clean)
                except:
                    pass
    return rates

def scrape_all():
    urls = {
        "Gold": "https://www.goodreturns.in/gold-rates/",
        "Silver": "https://www.goodreturns.in/silver-rates/",
        "Platinum": "https://www.goodreturns.in/platinum-rates/"
    }

    data = {"date": datetime.today().strftime("%Y-%m-%d"), "metal_rates": {}}

    for metal, url in urls.items():
        print(f"Scraping {metal}...")
        rates = scrape_rates(url, metal)
        if rates:
            data["metal_rates"][metal] = rates

    with open("metal_rates.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    print("✅ Data saved to metal_rates.json")

if __name__ == "__main__":
    scrape_all()
