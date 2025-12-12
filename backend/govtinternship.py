"""
MyScheme.gov.in Playwright Scraper - Dynamic Content Version
Handles React/Next.js dynamic loading

Installation:
    pip install playwright
    playwright install chromium
"""

from playwright.sync_api import sync_playwright, TimeoutError
import json
import csv
import time
from datetime import datetime

def navigate_to_schemes(page):
    """Navigate to schemes listing page"""
    print("🔍 Navigating to myScheme.gov.in...\n")
    
    try:
        page.goto("https://www.myscheme.gov.in/", timeout=30000)
        page.wait_for_load_state("networkidle")
        time.sleep(3)  # Wait for React to render
        
        print("✓ Homepage loaded\n")
        
        # Try to find "Browse Schemes" or similar button
        browse_buttons = [
            'text=Browse Schemes',
            'text=View All Schemes',
            'text=Explore Schemes',
            'a[href*="schemes"]',
            'button:has-text("Browse")',
            'text=Dashboard',
        ]
        
        for selector in browse_buttons:
            try:
                button = page.locator(selector).first
                if button.is_visible(timeout=2000):
                    print(f"✓ Found navigation: {selector}")
                    button.click()
                    page.wait_for_load_state("networkidle")
                    time.sleep(3)
                    break
            except:
                continue
        
        # Try direct URL approach
        pages_to_try = [
            "https://www.myscheme.gov.in/schemes",
            "https://www.myscheme.gov.in/search",
            "https://www.myscheme.gov.in/dashboard",
        ]
        
        for url in pages_to_try:
            print(f"📍 Trying: {url}")
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            time.sleep(3)
            
            # Take screenshot
            screenshot_name = f"myscheme_{url.split('/')[-1]}.png"
            page.screenshot(path=screenshot_name)
            print(f"   📸 Screenshot: {screenshot_name}")
            
            # Check if we have content
            body_text = page.locator('body').inner_text().lower()
            if 'scheme' in body_text and len(body_text) > 1000:
                print(f"   ✓ Found content!\n")
                return True
            
            time.sleep(2)
        
        return False
        
    except Exception as e:
        print(f"❌ Navigation error: {e}")
        return False

def extract_schemes_dynamic(page):
    """Extract schemes from dynamically loaded content"""
    print("📊 Extracting schemes from page...\n")
    
    schemes = []
    
    try:
        # Wait for any content to appear
        page.wait_for_selector('body', timeout=10000)
        time.sleep(3)
        
        # Get page content for analysis
        content = page.content()
        print(f"📄 Page size: {len(content)} characters\n")
        
        # Strategy 1: Look for Next.js data
        print("🔍 Strategy 1: Checking for Next.js data...")
        next_data_script = page.locator('script#__NEXT_DATA__').first
        if next_data_script.is_visible(timeout=1000):
            try:
                next_data = next_data_script.inner_text()
                data = json.loads(next_data)
                print("   ✓ Found Next.js data!")
                
                # Navigate the JSON to find schemes
                if 'props' in data:
                    props = data['props']
                    # Add logic to extract schemes from props
                    print(f"   Keys in props: {list(props.keys())[:10]}")
            except Exception as e:
                print(f"   ⚠️  Could not parse Next.js data: {e}")
        
        # Strategy 2: Look for specific content patterns
        print("\n🔍 Strategy 2: Looking for scheme cards/links...")
        
        selectors_to_try = [
            'a[href*="/scheme"]',
            'div[class*="scheme" i]',
            'div[class*="card" i]',
            'article',
            '[data-scheme]',
            '[class*="Scheme"]',
            'a[href*="scheme"]',
        ]
        
        for selector in selectors_to_try:
            try:
                elements = page.locator(selector).all()
                if elements and len(elements) > 0:
                    print(f"   ✓ Found {len(elements)} elements with: {selector}")
                    
                    for elem in elements[:5]:  # Sample first 5
                        try:
                            text = elem.inner_text()[:100]
                            href = elem.get_attribute('href')
                            print(f"     - Text: {text[:50]}...")
                            if href:
                                print(f"       Link: {href}")
                        except:
                            pass
                    
                    # Extract all matching elements
                    for elem in elements:
                        try:
                            href = elem.get_attribute('href')
                            text = elem.inner_text().strip()
                            
                            if href and text and len(text) > 5:
                                # Make absolute URL
                                if href.startswith('/'):
                                    href = f"https://www.myscheme.gov.in{href}"
                                
                                schemes.append({
                                    'url': href,
                                    'title': text,
                                    'selector': selector
                                })
                        except:
                            continue
                    
                    if schemes:
                        break
            except Exception as e:
                continue
        
        # Strategy 3: Scroll and load more
        if len(schemes) < 10:
            print("\n🔍 Strategy 3: Scrolling to load more content...")
            for i in range(3):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                print(f"   Scroll {i+1}/3...")
        
        # Remove duplicates
        seen = set()
        unique_schemes = []
        for s in schemes:
            if s['url'] not in seen:
                seen.add(s['url'])
                unique_schemes.append(s)
        
        print(f"\n✓ Total unique schemes found: {len(unique_schemes)}\n")
        return unique_schemes
        
    except Exception as e:
        print(f"❌ Extraction error: {e}")
        return []

def get_all_text_content(page):
    """Get all readable text from page for manual analysis"""
    try:
        # Get all visible text
        body = page.locator('body').first
        text = body.inner_text()
        
        # Save to file for analysis
        with open('page_content.txt', 'w', encoding='utf-8') as f:
            f.write(text)
        
        print("📝 Full page content saved to: page_content.txt")
        print(f"   Content length: {len(text)} characters")
        
        # Look for scheme-related keywords
        keywords = ['intern', 'apprentice', 'training', 'fellowship', 'scheme']
        found_keywords = {}
        
        for keyword in keywords:
            count = text.lower().count(keyword)
            if count > 0:
                found_keywords[keyword] = count
        
        if found_keywords:
            print(f"\n🔍 Keywords found in page:")
            for kw, count in found_keywords.items():
                print(f"   - '{kw}': {count} times")
        
        return text
        
    except Exception as e:
        print(f"❌ Error getting text: {e}")
        return ""

def extract_from_api_calls(page):
    """Intercept network requests to find API calls"""
    print("\n🌐 Monitoring network requests...\n")
    
    api_responses = []
    
    def handle_response(response):
        try:
            url = response.url
            if 'api' in url or 'scheme' in url:
                print(f"   🔗 API Call: {url}")
                if response.ok and 'json' in response.headers.get('content-type', ''):
                    try:
                        data = response.json()
                        api_responses.append({
                            'url': url,
                            'data': data
                        })
                        print(f"      ✓ Captured JSON response")
                    except:
                        pass
        except:
            pass
    
    page.on('response', handle_response)
    
    # Reload page to capture API calls
    page.reload()
    page.wait_for_load_state("networkidle")
    time.sleep(3)
    
    if api_responses:
        print(f"\n✓ Captured {len(api_responses)} API responses")
        # Save API responses
        with open('api_responses.json', 'w', encoding='utf-8') as f:
            json.dump(api_responses, f, indent=2)
        print("💾 API responses saved to: api_responses.json\n")
    else:
        print("⚠️  No API calls captured\n")
    
    return api_responses

def create_fallback_data():
    """Create a list of known internship schemes as fallback"""
    print("\n📝 Creating fallback data with known schemes...\n")
    
    return [
        {
            'title': "Prime Minister's Internship Scheme",
            'url': "https://pminternship.mca.gov.in/",
            'description': "Provides internship opportunities in top companies for youth",
            'category': "Education & Learning",
            'department': "Ministry of Corporate Affairs",
            'source': "Manual Entry"
        },
        {
            'title': "National Apprenticeship Training Scheme",
            'url': "https://www.apprenticeshipindia.gov.in/",
            'description': "On-the-job training with classroom instruction",
            'category': "Skill Development",
            'department': "Ministry of Skill Development",
            'source': "Manual Entry"
        },
    ]

def save_results(data, prefix="schemes"):
    """Save to CSV and JSON"""
    if not data:
        print("⚠️  No data to save")
        return
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # CSV
    csv_file = f"{prefix}_{timestamp}.csv"
    fields = list(data[0].keys())
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"✅ CSV saved: {csv_file}")
    
    # JSON
    json_file = f"{prefix}_{timestamp}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ JSON saved: {json_file}")

def main():
    print("\n" + "="*70)
    print("🎭 MyScheme Playwright Scraper - Dynamic Content Version")
    print("="*70 + "\n")
    
    with sync_playwright() as p:
        print("🚀 Launching browser...\n")
        
        browser = p.chromium.launch(
            headless=False,  # Set to True for background
            slow_mo=1000     # Slow down by 1s per action for visibility
        )
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        try:
            # Navigate and explore
            navigate_to_schemes(page)
            
            # Get all text content for analysis
            get_all_text_content(page)
            
            # Monitor API calls
            api_data = extract_from_api_calls(page)
            
            # Try to extract schemes
            schemes = extract_schemes_dynamic(page)
            
            # Analysis
            print("\n" + "="*70)
            print("📊 ANALYSIS COMPLETE")
            print("="*70)
            print(f"\n✓ Schemes found: {len(schemes)}")
            print(f"✓ API calls captured: {len(api_data)}")
            print(f"✓ Files created:")
            print(f"  - myscheme_*.png (screenshots)")
            print(f"  - page_content.txt")
            print(f"  - api_responses.json")
            
            if schemes:
                save_results(schemes, "schemes_extracted")
            else:
                print("\n⚠️  No schemes extracted via scraping")
                print("💡 Using fallback data...")
                fallback = create_fallback_data()
                save_results(fallback, "schemes_fallback")
            
            print("\n" + "="*70)
            print("🎯 NEXT STEPS:")
            print("="*70)
            print("\n1. Check the screenshots to see what the browser sees")
            print("2. Review page_content.txt to find scheme information")
            print("3. Check api_responses.json for any captured API data")
            print("\n4. If you find the actual API endpoint, you can use it directly!")
            print("   Look for URLs like: /api/schemes or /api/v1/schemes")
            print("\n5. Contact myScheme support for API documentation:")
            print("   Email: support-myscheme@digitalindia.gov.in")
            print("="*70 + "\n")
            
            input("\n⏸️  Press Enter to close browser...")
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Interrupted by user")
        except Exception as e:
            print(f"\n❌ Fatal error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == "__main__":
    main()