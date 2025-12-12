import pandas as pd
import requests
import re

# --- Step 1: Configuration ---
# Using the raw content URL which provides pure text.
GITHUB_README_URL = "https://raw.githubusercontent.com/krisnendu29/Internship-list/main/Readme.md" 

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# --- Step 2: Fetch Content from GitHub ---
def fetch_readme_content(url):
    """Fetches the raw text content from the specified GitHub URL."""
    try:
        print(f"Attempting to fetch content from: {url}")
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status() 
        print("✅ Content successfully fetched.")
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching the file. Check the URL and internet connection: {e}")
        return None

# -----------------------------------------------------------
# 3. Parsing Functions 
# -----------------------------------------------------------

def parse_corporate_internships(text):
    """Parses the corporate internships table section."""
    # Logic remains the same as it correctly identified the first section
    parts = re.split(r'International Internships|For Indian Internships \(For 2nd Year and 3rd Year\)', text)
    corp_text = parts[0].replace('Corporate Internships\n\n', '').strip()
    
    headers = [
        "Company", "Industry", "Internship Type", "Monthly Stipend (INR)", 
        "Internship Opportunities For Students"
    ]
    header_str = "".join(headers)
    corp_text = corp_text.replace(header_str, "")
    
    corporate_data = []
    
    companies = [
        "TCS", "Infosys", "Wipro", "Reliance Industries Limited", 
        "Hindustan Unilever Limited", "IBM India", "Google India", 
        "Microsoft India", "Amazon India", "Flipkart"
    ]
    
    data_list = re.split(r'(TCS|Infosys|Wipro|Reliance Industries Limited|Hindustan Unilever Limited|IBM India|Google India|Microsoft India|Amazon India|Flipkart)', corp_text)[1:]

    for i in range(0, len(data_list), 2):
        if i + 1 >= len(data_list): break
        
        company_name = data_list[i]
        data_chunk = data_list[i+1]
        
        fields = re.split(r'(Paid and unpaid)', data_chunk, maxsplit=1)
        if len(fields) < 3: continue
        
        stipend_opportunities = re.split(r'(INR\s[\d,\s-]+\d+)', fields[2].strip(), maxsplit=1)

        corporate_data.append({
            "Category": "Corporate",
            "Program Name": company_name,
            "Location": "India",
            "Stipend/Compensation": stipend_opportunities[0].strip() if len(stipend_opportunities) > 0 else "N/A",
            "Eligibility/Details": fields[0].strip() + " | " + (stipend_opportunities[1].strip() if len(stipend_opportunities) > 1 else ""),
            "Deadline": "N/A"
        })

    return corporate_data


def parse_numbered_internships(text, category):
    """Parses the International and Indian numbered list sections with improved splitting."""
    if category == "International":
        start_marker = "International Internships"
        end_marker = "For Indian Internships (For 2nd Year and 3rd Year)"
    else: 
        start_marker = "For Indian Internships (For 2nd Year and 3rd Year)"
        end_marker = "Country Wise Internship" 
    
    section_match = re.search(f"{re.escape(start_marker)}(.*?)(?:{re.escape(end_marker)}|$)", text, re.DOTALL)
        
    if not section_match:
        return []
        
    section_text = section_match.group(1).strip()
    
    # *** IMPROVED SPLITTING LOGIC ***
    # Split by the pattern of a number followed by a dot, which is preceded by a newline/space.
    # This is more resilient to variations in newline/spacing before the number.
    entries = re.split(r'\s*(\d+\.\s)', section_text)
    
    internship_data = []
    
    # The first element is often empty or noise; iterate through number/content pairs
    for i in range(1, len(entries), 2):
        # program_details is the entire block for one internship
        program_details = entries[i] + entries[i+1]
        
        # Extract Name (text after the number, up to the first comma or full stop/newline)
        name_match = re.search(r'^\d+\.\s*(.*?)(?:,\s*for|:\s*|(?:\s*\n)|$)', program_details, re.IGNORECASE)
        name = name_match.group(1).strip() if name_match else "N/A"
        
        # Extract Deadline
        deadline_match = re.search(r'Deadline\s*[:\-\*]?\s*(.*?)(?:\n|$)', program_details, re.IGNORECASE)
        deadline = deadline_match.group(1).strip() if deadline_match else "N/A"
        
        # Extract Stipend
        stipend_match = re.search(r'(?:Stipend|STIPEND)\s*[:\-\*]?\s*(.*?)(?:\n|$)', program_details, re.IGNORECASE)
        stipend = stipend_match.group(1).strip() if stipend_match else "N/A"
        
        # Extract Location
        location = "N/A"
        if category == "International":
            # Search for common country names
            location_match = re.search(r'(Canada|Germany|Switzerland|USA|Saudi Arabia|Japan|Taiwan|South Korea|France|Netherlands|Spain|Singapore|India)', program_details, re.IGNORECASE)
            location = location_match.group(1).strip() if location_match else "Global/N/A"
        else:
            # For Indian Internships, identify research institutes
            location_match = re.search(r'(IIT|IISc|IIIT|NIT|TIFR|ISRO|NITI Ayog|IISER)', program_details)
            location = "India" if location_match else "India/N/A"

        # Extract Eligibility/Details by cleaning up the block
        # Use simple string replacement for reliability based on the found names
        details = program_details.replace(name, '').strip()
        
        # Clean up common detail tags
        details = re.sub(r'Deadline\s*[:\-\*]?\s*.*', '', details, flags=re.IGNORECASE).strip()
        details = re.sub(r'(?:Stipend|STIPEND)\s*[:\-\*]?\s*.*', '', details, flags=re.IGNORECASE).strip()
        details = re.sub(r'Eligibility\s*[:\-\*]?\s*', 'Eligibility: ', details, flags=re.IGNORECASE).strip()
        details = details.replace(entries[i], '').strip() # Remove the initial number part again
        details = re.sub(r'^\.\s*', '', details).strip() # Remove the trailing dot and space if it exists

        internship_data.append({
            "Category": category,
            "Program Name": name,
            "Location": location,
            "Stipend/Compensation": stipend,
            "Eligibility/Details": details,
            "Deadline": deadline
        })
        
    return internship_data

# -----------------------------------------------------------
# 4. Main Execution
# -----------------------------------------------------------

full_text = fetch_readme_content(GITHUB_README_URL)

if full_text:
    # Pre-process: Clean up markdown artifacts and normalize spacing
    full_text = re.sub(r'#+\s*([^\n]+)', r'\1', full_text)
    full_text = re.sub(r'^\s*[\*-]\s*', '', full_text, flags=re.MULTILINE)
    # The raw text has a lot of extra newlines which can be a problem. Normalize to a single space.
    full_text = re.sub(r'[\r\n]+', ' ', full_text).strip()
    
    # Execute parsing
    corporate_data = parse_corporate_internships(full_text)
    international_data = parse_numbered_internships(full_text, "International")
    indian_data = parse_numbered_internships(full_text, "Indian")
    
    all_data = corporate_data + international_data + indian_data
    
    if all_data:
        df = pd.DataFrame(all_data)
        
        # Final cleanup for display
        df['Eligibility/Details'] = df['Eligibility/Details'].str.replace(r'\s{2,}', ' ', regex=True).str.strip()
        
        csv_filename = "internships_data_from_github.csv"
        df.to_csv(csv_filename, index=False, encoding='utf-8')
        
        print(f"\n✅ Success! Data for {len(df)} internships saved to {csv_filename}")
        print("\nFirst 10 entries of the combined data:")
        print(df.head(10).to_markdown(index=False))
    else:
        print("❌ Parsing failed. No internship data could be extracted.")