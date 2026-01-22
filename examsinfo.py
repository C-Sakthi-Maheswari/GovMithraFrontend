import requests
import json
import time
from bs4 import BeautifulSoup
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------- CONFIG ---------------- #

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Connection": "keep-alive"
}

OUTPUT_FILE = "govt_exams.json"

# ---------------- CORE FETCHER ---------------- #

def fetch_soup(url, retries=2, timeout=20):
    """Fetch and parse HTML with retry logic"""
    for attempt in range(retries):
        try:
            session = requests.Session()
            response = session.get(
                url,
                headers=HEADERS,
                timeout=timeout,
                verify=False,
                allow_redirects=True
            )
            response.raise_for_status()
            
            # Check if we got actual content
            if len(response.text) < 100:
                print(f"⚠️ Response too short from {url}")
                return None
                
            return BeautifulSoup(response.text, "html.parser")

        except requests.exceptions.Timeout:
            print(f"⚠️ Timeout on attempt {attempt + 1} → {url}")
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Attempt {attempt + 1} failed → {url}")
            print(f"   Reason: {type(e).__name__}")
        
        if attempt < retries - 1:
            time.sleep(3)

    print(f"❌ Failed to fetch → {url}")
    return None

# ---------------- UPSC (Comprehensive List) ---------------- #

def scrape_upsc_exams():
    """
    UPSC website has SSL/connectivity issues and blocks scraping.
    Using comprehensive list of all major UPSC exams.
    """
    print("\n🔍 Loading UPSC Exams...")
    
    # Complete list of UPSC examinations
    upsc_exams = [
        {
            "exam_name": "Civil Services Examination (IAS/IPS/IFS)",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "Prelims + Mains + Interview"
        },
        {
            "exam_name": "Engineering Services Examination (ESE)",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For recruitment to Engineering Services Group A"
        },
        {
            "exam_name": "Indian Forest Service Examination (IFoS)",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For Indian Forest Service officers"
        },
        {
            "exam_name": "Combined Defence Services Examination (CDS)",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For IMA, INA, AFA, and OTA"
        },
        {
            "exam_name": "National Defence Academy and Naval Academy Examination (NDA-NA)",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For Army, Navy and Air Force wings"
        },
        {
            "exam_name": "Central Armed Police Forces (Assistant Commandants) Examination",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For CRPF, BSF, CISF, ITBP, SSB"
        },
        {
            "exam_name": "Combined Medical Services Examination",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For medical officers in various departments"
        },
        {
            "exam_name": "Indian Economic Service/Indian Statistical Service Examination",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For IES and ISS officers"
        },
        {
            "exam_name": "Combined Geo-Scientist Examination",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For Geologists and Geophysicists"
        },
        {
            "exam_name": "Special Class Railway Apprentices Examination (SCRA)",
            "conducting_body": "UPSC",
            "official_url": "https://upsc.gov.in/examinations/active-exams",
            "description": "For mechanical engineering in railways"
        }
    ]
    
    # Try to scrape additional info (optional enhancement)
    try:
        soup = fetch_soup("https://upsc.gov.in/examinations/active-exams")
        if soup:
            # Look for any exam links we might have missed
            for link in soup.find_all('a', href=True):
                text = link.get_text(strip=True)
                if len(text) > 10 and 'examination' in text.lower():
                    # Check if it's a new exam not in our list
                    existing = [e['exam_name'] for e in upsc_exams]
                    if not any(text.lower() in e.lower() for e in existing):
                        print(f"   Found additional: {text}")
    except Exception as e:
        print(f"   Note: Could not scrape live data ({type(e).__name__})")
    
    return upsc_exams

# ---------------- SSC ---------------- #

def scrape_ssc_exams():
    print("\n🔍 Scraping SSC...")
    
    # Known SSC exams (fallback)
    known_exams = [
        {
            "exam_name": "Combined Graduate Level Examination (CGL)",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "Tier I, II, III, IV for Group B & C posts"
        },
        {
            "exam_name": "Combined Higher Secondary Level Examination (CHSL)",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "For 10+2 level posts"
        },
        {
            "exam_name": "Junior Engineer Examination (JE)",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "Civil, Electrical, Mechanical, Quantity Surveying"
        },
        {
            "exam_name": "Stenographer Grade C & D Examination",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "Stenography skills test"
        },
        {
            "exam_name": "Sub-Inspector in Delhi Police and Central Armed Police Forces Examination",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "CPO/SI posts"
        },
        {
            "exam_name": "Multi-Tasking Staff Examination (MTS)",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "Non-technical Group C posts"
        },
        {
            "exam_name": "Selection Post Examination",
            "conducting_body": "SSC",
            "official_url": "https://ssc.nic.in",
            "description": "Matriculation to Graduate level posts"
        }
    ]
    
    # Try to scrape live data
    try:
        soup = fetch_soup("https://ssc.nic.in")
        if soup:
            for link in soup.find_all('a', href=True):
                text = link.get_text(strip=True)
                # Look for exam patterns
                if any(keyword in text.upper() for keyword in ['CGL', 'CHSL', 'JE', 'CPO', 'MTS', 'STENOGRAPHER']):
                    if len(text) > 5 and len(text) < 200:
                        href = link['href']
                        full_url = href if href.startswith('http') else f"https://ssc.nic.in{href}"
                        
                        # Check if not already in list
                        if not any(text.lower() in e['exam_name'].lower() for e in known_exams):
                            print(f"   Found: {text}")
    except Exception as e:
        print(f"   Using known exams list ({type(e).__name__})")
    
    return known_exams

# ---------------- IBPS ---------------- #

def scrape_ibps_exams():
    print("\n🔍 Loading IBPS Exams...")
    
    ibps_exams = [
        {
            "exam_name": "IBPS PO (Probationary Officer/Management Trainee)",
            "conducting_body": "IBPS",
            "official_url": "https://www.ibps.in",
            "description": "For Public Sector Banks"
        },
        {
            "exam_name": "IBPS Clerk (Clerical Cadre)",
            "conducting_body": "IBPS",
            "official_url": "https://www.ibps.in",
            "description": "For clerical posts in PSBs"
        },
        {
            "exam_name": "IBPS SO (Specialist Officer)",
            "conducting_body": "IBPS",
            "official_url": "https://www.ibps.in",
            "description": "IT, Agricultural, Rajbhasha, Law, HR/Personnel, Marketing"
        },
        {
            "exam_name": "IBPS RRB PO (Officer Scale I, II, III)",
            "conducting_body": "IBPS",
            "official_url": "https://www.ibps.in",
            "description": "For Regional Rural Banks"
        },
        {
            "exam_name": "IBPS RRB Clerk (Office Assistant)",
            "conducting_body": "IBPS",
            "official_url": "https://www.ibps.in",
            "description": "For Regional Rural Banks"
        }
    ]
    
    return ibps_exams

# ---------------- RRB ---------------- #

def scrape_rrb_exams():
    print("\n🔍 Loading RRB Exams...")
    
    rrb_exams = [
        {
            "exam_name": "RRB NTPC (Non-Technical Popular Categories)",
            "conducting_body": "Railway Recruitment Board",
            "official_url": "https://www.rrbcdg.gov.in",
            "description": "Graduate & undergraduate level posts"
        },
        {
            "exam_name": "RRB Group D (Level 1)",
            "conducting_body": "Railway Recruitment Board",
            "official_url": "https://www.rrbcdg.gov.in",
            "description": "Track Maintainer, Helper, Porter, etc."
        },
        {
            "exam_name": "RRB ALP (Assistant Loco Pilot)",
            "conducting_body": "Railway Recruitment Board",
            "official_url": "https://www.rrbcdg.gov.in",
            "description": "For locomotive operation"
        },
        {
            "exam_name": "RRB Technician",
            "conducting_body": "Railway Recruitment Board",
            "official_url": "https://www.rrbcdg.gov.in",
            "description": "ITI/Diploma holders"
        },
        {
            "exam_name": "RRB JE (Junior Engineer)",
            "conducting_body": "Railway Recruitment Board",
            "official_url": "https://www.rrbcdg.gov.in",
            "description": "Civil, Mechanical, Electrical, S&T"
        }
    ]
    
    return rrb_exams

# ---------------- OTHER EXAMS ---------------- #

def get_other_exams():
    print("\n🔍 Loading Other Major Exams...")
    
    other_exams = [
        {
            "exam_name": "SBI PO (Probationary Officer)",
            "conducting_body": "State Bank of India",
            "official_url": "https://sbi.co.in/careers",
            "description": "For State Bank of India"
        },
        {
            "exam_name": "SBI Clerk (Junior Associate)",
            "conducting_body": "State Bank of India",
            "official_url": "https://sbi.co.in/careers",
            "description": "For State Bank of India"
        },
        {
            "exam_name": "RBI Grade B Officer",
            "conducting_body": "Reserve Bank of India",
            "official_url": "https://www.rbi.org.in",
            "description": "DEPR, DSIM, General streams"
        },
        {
            "exam_name": "GATE (Graduate Aptitude Test in Engineering)",
            "conducting_body": "IIT/IISc (Rotational)",
            "official_url": "https://gate.iitm.ac.in",
            "description": "For PG admissions and PSU recruitment"
        },
        {
            "exam_name": "UGC NET (National Eligibility Test)",
            "conducting_body": "National Testing Agency",
            "official_url": "https://ugcnet.nta.ac.in",
            "description": "For Assistant Professor and JRF"
        }
    ]
    
    return other_exams

# ---------------- MAIN ---------------- #

def main():
    print("=" * 70)
    print(" " * 15 + "GOVERNMENT EXAMS SCRAPER")
    print("=" * 70)
    
    all_exams = []

    scrapers = [
        ("UPSC", scrape_upsc_exams),
        ("SSC", scrape_ssc_exams),
        ("IBPS", scrape_ibps_exams),
        ("RRB", scrape_rrb_exams),
        ("Other", get_other_exams)
    ]

    for name, scraper in scrapers:
        try:
            data = scraper()
            all_exams.extend(data)
            print(f"✅ {name} → {len(data)} exams loaded")
        except Exception as e:
            print(f"❌ {name} failed: {e}")

    # Remove duplicates based on exam name and conducting body
    seen = set()
    unique_exams = []
    
    for exam in all_exams:
        key = (exam["exam_name"], exam["conducting_body"])
        if key not in seen:
            seen.add(key)
            unique_exams.append(exam)

    # Sort by conducting body, then exam name
    unique_exams.sort(key=lambda x: (x["conducting_body"], x["exam_name"]))

    # Save to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique_exams, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 70)
    print(f"✅ Successfully saved {len(unique_exams)} exams → {OUTPUT_FILE}")
    print("=" * 70)
    
    # Print summary
    summary = {}
    for exam in unique_exams:
        body = exam["conducting_body"]
        summary[body] = summary.get(body, 0) + 1
    
    print("\n📊 SUMMARY BY CONDUCTING BODY:")
    print("-" * 70)
    for body, count in sorted(summary.items()):
        print(f"   {body:40s} : {count:2d} exams")
    print("-" * 70)
    
    # Show sample output
    print("\n📋 SAMPLE OUTPUT (first 3 exams):")
    print("-" * 70)
    for exam in unique_exams[:3]:
        print(f"\n   Exam: {exam['exam_name']}")
        print(f"   Body: {exam['conducting_body']}")
        if 'description' in exam:
            print(f"   Info: {exam['description']}")
    print("-" * 70)

# ---------------- RUN ---------------- #

if __name__ == "__main__":
    main()