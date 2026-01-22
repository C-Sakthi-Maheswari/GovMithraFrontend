from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load CSV data
CSV_PATH = os.path.join(os.path.dirname(__file__), 'mtc_bus_routes.csv')
bus_data = None

import re

def extract_locations(query):
    query = query.lower().strip()

    # Pattern to detect: from A to B
    pattern1 = r"from (.+?) to (.+)"
    match = re.search(pattern1, query)
    if match:
        return match.group(1).strip(), match.group(2).strip()

    # Pattern: A to B (e.g., "anna nagar to alandur")
    pattern2 = r"(.+?) to (.+)"
    match = re.search(pattern2, query)
    if match:
        return match.group(1).strip(), match.group(2).strip()

    return None, None


def format_row(row):
    """Return clean JSON for each bus route row."""
    return {
        'bus_number': row['Bus Number'],
        'start': row['Starting Point'],
        'end': row['Ending Point'],
        'via': row['Via'],
        'high_frequency': 'Yes' if str(row['High Frequency Route']).strip().lower() == 'x' else 'No',
        'night_service': 'Yes' if str(row['Night Service Route']).strip().lower() == 'x' else 'No',
        'low_frequency': 'Yes' if str(row['Low Frequency Route']).strip().lower() == 'x' else 'No'
    }

def load_bus_data():
    """Load MTC bus routes from CSV"""
    global bus_data
    try:
        bus_data = pd.read_csv(CSV_PATH)
        # Clean column names (remove extra spaces)
        bus_data.columns = bus_data.columns.str.strip()
        print(f"✅ Loaded {len(bus_data)} bus routes successfully!")
        print(f"Columns: {bus_data.columns.tolist()}")
        return True
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return False

def search_bus_routes(query):
    """Search bus routes based on user query including A → B routes"""
    query = query.lower()
    results = []

    try:
        # ------------------------------------------------------------
        # 1️⃣ HANDLE "FROM A TO B" QUERIES
        # ------------------------------------------------------------
        if "from" in query and "to" in query:
            try:
                part = query.split("from")[1].strip()
                src, dest = part.split("to")
                src = src.strip()
                dest = dest.strip()

                # Search for start → end
                matches = bus_data[
                    bus_data['Starting Point'].str.contains(src, case=False, na=False) &
                    bus_data['Ending Point'].str.contains(dest, case=False, na=False)
                ]

                # If no direct route, check if both appear in VIA list
                if matches.empty:
                    matches = bus_data[
                        bus_data['Via'].str.contains(src, case=False, na=False) &
                        bus_data['Via'].str.contains(dest, case=False, na=False)
                    ]

                if not matches.empty:
                    for _, row in matches.head(10).iterrows():
                        results.append({
                            'bus_number': row['Bus Number'],
                            'start': row['Starting Point'],
                            'end': row['Ending Point'],
                            'via': row['Via'],
                            'high_frequency': 'Yes' if str(row['High Frequency Route']).strip().lower() == 'x' else 'No',
                            'night_service': 'Yes' if str(row['Night Service Route']).strip().lower() == 'x' else 'No',
                            'low_frequency': 'Yes' if str(row['Low Frequency Route']).strip().lower() == 'x' else 'No'
                        })
                return results

            except Exception as e:
                print("Error processing A→B query:", e)

        # ------------------------------------------------------------
        # 2️⃣ SEARCH BY BUS NUMBER
        # ------------------------------------------------------------
        if any(char.isdigit() for char in query):
            bus_number = ''.join(filter(str.isalnum, query.split()[0]))
            matches = bus_data[
                bus_data['Bus Number'].astype(str).str.contains(bus_number, case=False, na=False)
            ]
            if not matches.empty:
                for _, row in matches.head(5).iterrows():
                    results.append({
                        'bus_number': row['Bus Number'],
                        'start': row['Starting Point'],
                        'end': row['Ending Point'],
                        'via': row['Via'],
                        'high_frequency': 'Yes' if str(row['High Frequency Route']).strip().lower() == 'x' else 'No',
                        'night_service': 'Yes' if str(row['Night Service Route']).strip().lower() == 'x' else 'No',
                        'low_frequency': 'Yes' if str(row['Low Frequency Route']).strip().lower() == 'x' else 'No'
                    })

        # ------------------------------------------------------------
        # 3️⃣ SINGLE LOCATION SEARCH (from / to / via)
        # ------------------------------------------------------------
        if not results:
            search_term = query
            for keyword in ['from', 'to', 'via', 'through']:
                if keyword in query:
                    search_term = query.split(keyword)[-1].strip()
                    break

            matches = bus_data[
                bus_data['Starting Point'].str.contains(search_term, case=False, na=False) |
                bus_data['Ending Point'].str.contains(search_term, case=False, na=False) |
                bus_data['Via'].str.contains(search_term, case=False, na=False)
            ]
            
            if not matches.empty:
                for _, row in matches.head(10).iterrows():
                    results.append({
                        'bus_number': row['Bus Number'],
                        'start': row['Starting Point'],
                        'end': row['Ending Point'],
                        'via': row['Via'],
                        'high_frequency': 'Yes' if str(row['High Frequency Route']).strip().lower() == 'x' else 'No',
                        'night_service': 'Yes' if str(row['Night Service Route']).strip().lower() == 'x' else 'No',
                        'low_frequency': 'Yes' if str(row['Low Frequency Route']).strip().lower() == 'x' else 'No'
                    })

    except Exception as e:
        print(f"Error in search: {e}")

    return results


def format_bus_response(results):
    """Format bus search results into readable response"""
    if not results:
        return "Sorry, I couldn't find any buses matching your query. Please try with a bus number or location name."
    
    response = f"🚌 Found {len(results)} bus route(s):\n\n"
    
    for i, bus in enumerate(results, 1):
        response += f"{i}. Bus {bus['bus_number']}\n"
        response+="\n"
        response += f"   📍 From: {bus['start']}\n"
        response += f"   📍 To: {bus['end']}\n"
        response += f"   🛣️ Via: {bus['via']}\n"
        response+="\n"
        
        features = []
        if bus['high_frequency'] == 'Yes':
            features.append("High Frequency")
        if bus['night_service'] == 'Yes':
            features.append("Night Service")
        if bus['low_frequency'] == 'Yes':
            features.append("Low Frequency")
        
        if features:
            response += f"   ⭐ Features: {', '.join(features)}\n"
        
        response += "\n"
    
    return response

def get_gold_rates():
    """Simulated gold rates - replace with real API"""
    return {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'gold_22k': '₹5,850 per gram',
        'gold_24k': '₹6,380 per gram',
        'silver': '₹74 per gram',
        'note': 'Rates may vary by location and jeweler. Please verify with local sources.'
    }

def get_petroleum_prices():
    """Simulated petroleum prices - replace with real API"""
    return {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'petrol': '₹102.63 per liter',
        'diesel': '₹94.24 per liter',
        'lpg': '₹1,103 per cylinder (14.2kg)',
        'cng': '₹75.61 per kg',
        'location': 'Chennai',
        'note': 'Prices may vary by location. Check with your nearest fuel station.'
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'GovMithra Backend is running!',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({
                'response': 'Please ask me something about government schemes, bus routes, gold rates, or fuel prices!',
                'timestamp': datetime.now().isoformat()
            })
        
        query_lower = query.lower()
        
        # Bus routes query
        if any(keyword in query_lower for keyword in ['bus', 'route', 'mtc', 'transport']):
            bus_results = search_bus_routes(query)
            response = format_bus_response(bus_results)
        
        # Gold rates query
        elif any(keyword in query_lower for keyword in ['gold', 'silver', 'rates', 'price']):
            rates = get_gold_rates()
            response = f"💰 Today's Gold & Silver Rates({rates['date']})\n\n"
            response += f"🪙 22K Gold: {rates['gold_22k']}\n"
            response += f"🪙 24K Gold: {rates['gold_24k']}\n"
            response += f"⚪ Silver: {rates['silver']}\n\n"
            response += f"📝 Note: {rates['note']}"
        
        # Petroleum prices query
        elif any(keyword in query_lower for keyword in ['petrol', 'diesel', 'fuel', 'gas', 'lpg', 'cng', 'petroleum']):
            prices = get_petroleum_prices()
            response = f"⛽ Today's Fuel Prices({prices['date']})\n\n"
            response += f"📍 Location: {prices['location']}\n\n"
            response += f"⛽ Petrol: {prices['petrol']}\n"
            response += f"🚛 Diesel: {prices['diesel']}\n"
            response += f"🔥 LPG: {prices['lpg']}\n"
            response += f"🚗 CNG: {prices['cng']}\n\n"
            response += f"📝 Note: {prices['note']}"
        
        # Government schemes (placeholder)
        elif any(keyword in query_lower for keyword in ['loan', 'scheme', 'insurance', 'education', 'scholarship']):
            response = "I'm currently being trained on government schemes! 🎓\n\n"
            response += "For now, you can ask me about:\n"
            response += "🚌 Bus routes\n"
            response += "💰 Gold rates\n"
            response += "⛽ Fuel prices\n\n"
            response += "Government scheme information coming soon!"
        
        # Default response
        else:
            response = "I can help you with:\n\n"
            response += "🚌 Bus Routes - Ask 'bus from Thiruvottiyur' or 'bus number 1'\n"
            response += "💰 Gold Rates - Ask 'gold rates today'\n"
            response += "⛽ Fuel Prices - Ask 'petrol price today'\n"
            response += "🏛️ Government Schemes - Coming soon!\n\n"
            response += "Try asking me something!"
        
        return jsonify({
            'response': response,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({
            'response': 'Sorry, I encountered an error processing your request. Please try again.',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/bus-routes', methods=['GET'])
def get_bus_routes():
    """Get all bus routes or search"""
    try:
        search = request.args.get('search', '')
        
        if search:
            results = search_bus_routes(search)
            return jsonify({
                'count': len(results),
                'results': results
            })
        
        # Return first 50 routes if no search
        routes = []
        for _, row in bus_data.head(50).iterrows():
            routes.append({
                'bus_number': row['Bus Number'],
                'start': row['Starting Point'],
                'end': row['Ending Point'],
                'via': row['Via']
            })
        
        return jsonify({
            'count': len(routes),
            'total': len(bus_data),
            'results': routes
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/student-schemes")
def student_schemes():
    with open("scraping/gov_schemes.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
    
if __name__ == '__main__':
    # Load bus data on startup
    if load_bus_data():
        print("🚀 Starting GovMithra Backend...")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("❌ Failed to load bus data. Please check CSV file.")