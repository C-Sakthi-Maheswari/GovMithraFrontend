import requests
from bs4 import BeautifulSoup
import csv
import re

URL = 'https://www.studyiq.com/articles/schemes-of-indian-government/'
OUTPUT_FILENAME = 'government_schemes_cleaned.csv'

def scrape_govt_schemes(url):
    """
    Initial scraping function (same as before) to extract the primary content blocks.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')
    content_div = soup.find('div', class_='entry-content') or soup.find('article')

    if content_div is None:
        print("Could not find the main article content container.")
        return []

    elements = content_div.find_all(['h2', 'h3', 'p', 'ul', 'li'])

    schemes_data = []
    current_scheme = None
    
    for element in elements:
        text = element.get_text(strip=True)
        
        # Identify a new main scheme title (e.g., '1. Viksit Bharat by 2047' or a general heading)
        is_scheme_title = element.name in ['h2', 'h3'] or re.match(r'^\d+\.\s', text)
        
        if is_scheme_title:
            if current_scheme:
                current_scheme['Details'] = '\n'.join(current_scheme['Details'])
                schemes_data.append(current_scheme)
            
            # Start tracking the new scheme
            current_scheme = {
                'Scheme_Name': text,
                'Objective': '',
                'Details': []
            }
            continue

        if current_scheme:
            if 'Objective:' in text and not current_scheme['Objective']:
                current_scheme['Objective'] = text.replace('Objective:', '', 1).strip()
            
            elif text and not text.startswith(('Batch Starting', 'Sharing is caring', 'Download Govt Schemes List')):
                if element.name == 'li':
                    current_scheme['Details'].append('  • ' + text)
                elif element.name == 'p':
                    current_scheme['Details'].append(text)

    if current_scheme:
        current_scheme['Details'] = '\n'.join(current_scheme['Details'])
        schemes_data.append(current_scheme)
        
    return schemes_data

def process_and_clean_data(raw_data):
    """
    Takes the raw scraped data and cleans up entries where multiple schemes 
    were dumped into the 'Details' field, splitting them into separate rows.
    """
    cleaned_data = []
    
    # Regex to identify a scheme title within the 'Details' field (starts with bullet, then a title)
    # The pattern looks for a bullet point followed by a scheme name, optionally followed by an Objective/Feature/Benefit tag.
    SCHEME_PATTERN = re.compile(r'^\s*•\s*(.*?(?:Yojana|Mission|Scheme|Abhiyan|Initiative|TTP)\b.*)', re.IGNORECASE)
    
    # Secondary pattern for State Schemes which are just names
    STATE_SCHEME_PATTERN = re.compile(r'^\s*•\s*([A-Za-z].*)\b')

    for entry in raw_data:
        # Case 1: Broad, aggregated list (like "Government Schemes 2025")
        if entry['Details']:
            details_list = entry['Details'].split('\n')
            
            # Use a temporary list to hold details for the current sub-scheme
            current_sub_scheme = None
            
            for line in details_list:
                line = line.strip()
                
                # Check for a new scheme title
                match = SCHEME_PATTERN.match(line)
                
                # Handle special case for State Government Schemes which are listed simply
                is_state_scheme_list = 'State Government Schemes' in entry['Scheme_Name']
                if is_state_scheme_list:
                    match = STATE_SCHEME_PATTERN.match(line)

                if match:
                    # Save the previous sub-scheme before starting a new one
                    if current_sub_scheme:
                        cleaned_data.append(current_sub_scheme)
                    
                    # Start a new sub-scheme
                    title = match.group(1).split(',')[0].strip() # Take only the part before the first comma
                    current_sub_scheme = {
                        'Scheme_Name': title,
                        'Objective': entry['Objective'] if 'Government Schemes List 2025' in entry['Scheme_Name'] else '',
                        'Details': line
                    }
                elif current_sub_scheme:
                    # Append details to the current sub-scheme
                    current_sub_scheme['Details'] += ('\n' + line)
                else:
                    # If line is a title like 'Karnataka', treat it as a category and skip for now
                    if not is_state_scheme_list:
                        # For other general sections, keep the original structure if no clear sub-scheme is found
                        cleaned_data.append(entry)
                        break # Exit and move to the next raw entry
            
            # Save the very last sub-scheme
            if current_sub_scheme and current_sub_scheme not in cleaned_data:
                cleaned_data.append(current_sub_scheme)

        # Case 2: Clean, single scheme entry (which didn't happen much in your result, but is good practice)
        else:
            cleaned_data.append(entry)
            
    # Final pass to remove duplicates that might have been added in the cleanup process
    unique_data = []
    seen_names = set()
    for item in cleaned_data:
        if item['Scheme_Name'] not in seen_names:
            unique_data.append(item)
            seen_names.add(item['Scheme_Name'])

    return unique_data

def save_to_csv(data, filename):
    """Saves the cleaned list of dictionaries to a CSV file."""
    if not data:
        print("No data was scraped to save.")
        return

    fieldnames = ['Scheme_Name', 'Objective', 'Details']
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(data)

    print(f"\n✅ Successfully cleaned and saved {len(data)} schemes to '{filename}'")
    print(f"Now you should have one row per individual scheme!")

# --- Execution ---
if __name__ == "__main__":
    print(f"Starting scraping job for: {URL}")
    raw_data = scrape_govt_schemes(URL)
    cleaned_data = process_and_clean_data(raw_data)
    save_to_csv(cleaned_data, OUTPUT_FILENAME)