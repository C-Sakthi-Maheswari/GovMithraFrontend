import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import urljoin

class InternshipScraper:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def get_internship_listings(self, search_url):
        """Fetch the main listing page"""
        try:
            response = self.session.get(search_url, timeout=10)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            print(f"Error fetching listings: {e}")
            return None
    
    def extract_listing_info(self, listing_card):
        """Extract basic info from a listing card"""
        info = {}
        
        try:
            # Extract title (h3 or h2 tag)
            title_elem = listing_card.find(['h2', 'h3', 'h4'])
            info['title'] = title_elem.get_text(strip=True) if title_elem else 'N/A'
            
            # Extract company name (h5 tag)
            company_elem = listing_card.find('h5')
            info['company'] = company_elem.get_text(strip=True) if company_elem else 'N/A'
            
            # Extract all text to find type, location, and date
            all_text = listing_card.get_text()
            
            # Extract internship type
            if 'Virtual Internship' in all_text:
                info['type'] = 'Virtual Internship'
            elif 'Part Time' in all_text:
                info['type'] = 'Part Time'
            elif 'Full Time' in all_text:
                info['type'] = 'Full Time'
            else:
                info['type'] = 'N/A'
            
            # Extract location (usually near an icon or specific pattern)
            location_text = listing_card.find(string=lambda s: s and 'Pan India' in s)
            if location_text:
                info['location'] = location_text.strip()
            else:
                # Try to find location from list items or spans
                loc_items = listing_card.find_all('li')
                for item in loc_items:
                    text = item.get_text(strip=True)
                    if len(text) > 3 and ',' in text:
                        info['location'] = text
                        break
                else:
                    info['location'] = 'N/A'
            
            # Extract structured details (Start date, Duration, Stipend, Apply by)
            detail_items = listing_card.find_all(['li', 'div'])
            for item in detail_items:
                text = item.get_text(strip=True)
                
                if 'Start date' in text or 'Immediately' in text:
                    info['start_date'] = text.replace('Start date', '').strip()
                elif 'Duration' in text and 'Week' in text:
                    info['duration'] = text.replace('Duration', '').strip()
                elif 'Stipend' in text or '₹' in text:
                    info['stipend'] = text.replace('Stipend', '').strip()
                elif 'Apply by' in text:
                    info['apply_by'] = text.replace('Apply by', '').strip()
            
            # Extract detail page link (look for href with internship-details.php)
            detail_link = listing_card.find('a', href=lambda h: h and 'internship-details.php' in h)
            if detail_link:
                info['detail_url'] = urljoin(self.base_url, detail_link['href'])
            else:
                info['detail_url'] = None
                
        except Exception as e:
            print(f"Error extracting listing info: {e}")
        
        return info
    
    def get_detailed_info(self, detail_url):
        """Fetch detailed information from the detail page"""
        if not detail_url:
            return {}
        
        try:
            response = self.session.get(detail_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            details = {}
            
            # Extract description
            desc_elem = soup.find('div', class_='description') or soup.find('div', class_='details')
            details['description'] = desc_elem.get_text(strip=True) if desc_elem else 'N/A'
            
            # Extract skills required
            skills_elem = soup.find('div', class_='skills') or soup.find(text='Skills Required')
            if skills_elem:
                skills_container = skills_elem.find_next('div') if hasattr(skills_elem, 'find_next') else skills_elem.parent
                details['skills'] = [skill.get_text(strip=True) for skill in skills_container.find_all('span', class_='skill')]
            else:
                details['skills'] = []
            
            # Extract eligibility
            eligibility_elem = soup.find('div', class_='eligibility') or soup.find(text='Eligibility')
            details['eligibility'] = eligibility_elem.get_text(strip=True) if eligibility_elem else 'N/A'
            
            # Extract responsibilities
            resp_elem = soup.find('div', class_='responsibilities') or soup.find(text='Responsibilities')
            details['responsibilities'] = resp_elem.get_text(strip=True) if resp_elem else 'N/A'
            
            # Extract number of openings
            openings_elem = soup.find(text=lambda t: t and 'opening' in t.lower())
            details['openings'] = openings_elem.strip() if openings_elem else 'N/A'
            
            time.sleep(1)  # Be polite to the server
            return details
            
        except requests.RequestException as e:
            print(f"Error fetching detail page: {e}")
            return {}
    
    def scrape_all_internships(self, search_url, fetch_details=True):
        """Main function to scrape all internships"""
        print("Starting scraper...")
        
        soup = self.get_internship_listings(search_url)
        if not soup:
            return []
        
        # Find all internship listing cards
        listings = soup.find_all('div', class_='card') or soup.find_all('div', class_='internship-card')
        
        print(f"Found {len(listings)} internship listings")
        
        all_internships = []
        
        for idx, listing in enumerate(listings, 1):
            print(f"Processing internship {idx}/{len(listings)}...")
            
            internship_data = self.extract_listing_info(listing)
            
            if fetch_details and internship_data.get('detail_url'):
                detailed_info = self.get_detailed_info(internship_data['detail_url'])
                internship_data.update(detailed_info)
            
            all_internships.append(internship_data)
        
        return all_internships
    
    def save_to_json(self, data, filename='internships.json'):
        """Save scraped data to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            print(f"Data successfully saved to {filename}")
        except Exception as e:
            print(f"Error saving to JSON: {e}")


# Usage
if __name__ == "__main__":
    # Your search URL from the portal
    search_url = "https://internship.aicte-india.org/fetch_city.php?city=Q2hlbm5haQ=="
    
    # Initialize scraper
    scraper = InternshipScraper("https://internship.aicte-india.org")
    
    # Scrape internships (set fetch_details=False to only get basic info faster)
    internships = scraper.scrape_all_internships(search_url, fetch_details=True)
    
    # Save to JSON
    scraper.save_to_json(internships, 'aicte_internships.json')
    
    print(f"\nTotal internships scraped: {len(internships)}")
    print("\nSample data:")
    if internships:
        print(json.dumps(internships[0], indent=2))