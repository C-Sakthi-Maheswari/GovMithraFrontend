from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import re
from datetime import datetime
from thefuzz import process, fuzz

app = Flask(__name__)
CORS(app)

# --------------------------------------------------
# DATA LOADING & PREP
# --------------------------------------------------
CSV_PATH = os.path.join(os.path.dirname(__file__), "mtc_bus_routes.csv")
try:
    bus_data = pd.read_csv(CSV_PATH)
    bus_data.columns = bus_data.columns.str.strip()
    # Pre-fill NaNs to avoid errors during matching
    bus_data = bus_data.fillna("")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    bus_data = pd.DataFrame()

# Create a list of all unique locations for fuzzy lookup
all_locations = pd.unique(bus_data[['Starting Point', 'Ending Point', 'Via']].values.ravel('K'))
all_locations = [loc for loc in all_locations if loc]

# --------------------------------------------------
# NLP & FUZZY LOGIC
# --------------------------------------------------
def get_best_match(text, choices, threshold=70):
    """Finds the closest location name from the CSV."""
    if not text: return None
    match, score = process.extractOne(text, choices, scorer=fuzz.token_set_ratio)
    return match if score >= threshold else text

def extract_entities(query):
    """Extracts bus numbers and locations using regex patterns."""
    query = query.lower().strip()
    entities = {"bus_no": None, "src": None, "dest": None, "via": None}

    # 1. Extract Bus Number (e.g., 21G, 102, M21)
    bus_match = re.search(r'\b([a-z]?\d+[a-z]?)\b', query)
    if bus_match:
        entities["bus_no"] = bus_match.group(1).upper()

    # 2. Extract Locations based on keywords
    from_match = re.search(r'from\s+([\w\s]+?)(?=\s+to|\s+via|$)', query)
    to_match = re.search(r'to\s+([\w\s]+?)(?=\s+from|\s+via|$)', query)
    via_match = re.search(r'via\s+([\w\s]+?)(?=\s+from|\s+to|$)', query)

    if from_match: entities["src"] = get_best_match(from_match.group(1).strip(), all_locations)
    if to_match: entities["dest"] = get_best_match(to_match.group(1).strip(), all_locations)
    if via_match: entities["via"] = get_best_match(via_match.group(1).strip(), all_locations)

    # 3. Fallback: If no keywords, treat the whole query as a general location search
    if not any([entities["src"], entities["dest"], entities["bus_no"], entities["via"]]):
        entities["via"] = get_best_match(query, all_locations)

    return entities

# --------------------------------------------------
# SEARCH ENGINE
# --------------------------------------------------
def search_buses(query):
    ent = extract_entities(query)
    df = bus_data.copy()

    # Filtering Logic
    if ent["bus_no"]:
        mask = df["Bus Number"].astype(str).str.contains(rf"\b{ent['bus_no']}\b", case=False, regex=True)
        df = df[mask]
    
    if ent["src"]:
        df = df[df["Starting Point"].str.contains(ent["src"], case=False) | 
                df["Via"].str.contains(ent["src"], case=False)]
    
    if ent["dest"]:
        df = df[df["Ending Point"].str.contains(ent["dest"], case=False) | 
                df["Via"].str.contains(ent["dest"], case=False)]
        
    if ent["via"]:
        df = df[df["Via"].str.contains(ent["via"], case=False)]

    # Convert to clean Dictionary
    results = []
    for _, row in df.head(15).iterrows():
        results.append({
            "no": row["Bus Number"],
            "origin": row["Starting Point"],
            "dest": row["Ending Point"],
            "via": row["Via"],
            "flags": {
                "high": str(row.get("High Frequency Route", "")).lower() == "x",
                "night": str(row.get("Night Service Route", "")).lower() == "x"
            }
        })
    return results, ent

# --------------------------------------------------
# ROUTES
# --------------------------------------------------
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_query = data.get("query", "")
    
    if not user_query:
        return jsonify({"error": "Empty query"}), 400

    results, entities = search_buses(user_query)
    
    return jsonify({
        "results": results,
        "parsed_entities": entities,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)