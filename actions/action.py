from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from actions.data_search import search
import json
import pandas as pd
from fuzzywuzzy import fuzz, process
import re
import os

# --------------------------------------------------
# DATA INITIALIZATION (Your Logic)
# --------------------------------------------------
CSV_PATH = os.path.join(os.path.dirname(__file__), "mtc_bus_routes.csv")
try:
    bus_data = pd.read_csv(CSV_PATH)
    bus_data.columns = bus_data.columns.str.strip()
    bus_data = bus_data.fillna("")
    
    # Extracting all unique locations for Fuzzy Matching
    all_locations = pd.unique(bus_data[['Starting Point', 'Ending Point', 'Via']].values.ravel('K'))
    all_locations = [loc for loc in all_locations if loc]
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    bus_data = pd.DataFrame()
    all_locations = []

# --------------------------------------------------
# UTILITY FUNCTIONS (Your Exact Code)
# --------------------------------------------------
def get_best_match(text, choices, threshold=70):
    if not text: return None
    match, score = process.extractOne(text, choices, scorer=fuzz.token_set_ratio)
    return match if score >= threshold else text

def extract_entities(query):
    query = query.lower().strip()
    entities = {"bus_no": None, "src": None, "dest": None, "via": None}
    
    # Bus number regex
    bus_match = re.search(r'\b([a-z]?\d+[a-z]?)\b', query)
    if bus_match:
        entities["bus_no"] = bus_match.group(1).upper()

    # From/To/Via regex
    from_match = re.search(r'from\s+([\w\s]+?)(?=\s+to|\s+via|$)', query)
    to_match = re.search(r'to\s+([\w\s]+?)(?=\s+from|\s+via|$)', query)
    via_match = re.search(r'via\s+([\w\s]+?)(?=\s+from|\s+to|$)', query)

    if from_match: entities["src"] = get_best_match(from_match.group(1).strip(), all_locations)
    if to_match: entities["dest"] = get_best_match(to_match.group(1).strip(), all_locations)
    if via_match: entities["via"] = get_best_match(via_match.group(1).strip(), all_locations)

    # Fallback: if no keywords, try matching entire query to a location
    if not any([entities["src"], entities["dest"], entities["bus_no"], entities["via"]]):
        entities["via"] = get_best_match(query, all_locations)
    return entities

print(f"--- ACTION SERVER LOADING ---")
print(f"Checking CSV Path: {CSV_PATH}")
print(f"CSV exists: {os.path.exists(CSV_PATH)}")
print(f"Locations loaded: {len(all_locations)}")

# --------------------------------------------------
# RASA ACTION CLASS
# --------------------------------------------------
class ActionSearchBus(Action):
    def name(self) -> str:
        return "action_search_bus"

    def run(self, dispatcher, tracker, domain):
        user_query = tracker.latest_message.get("text")
        ent = extract_entities(user_query)
        
        if bus_data.empty:
            dispatcher.utter_message(text="⚠️ Bus database not loaded.")
            return []

        df = bus_data.copy()
        
        # Scenario 1: Specific Bus Number (Highest Priority)
        if ent.get("bus_no"):
            df = df[df["Bus Number"].astype(str).str.contains(rf"\b{ent['bus_no']}\b", case=False, regex=True, na=False)]
        
        # Scenario 2 & 3: From A to B / Only A / Only B
        # We search across ALL columns to be safe (Starting Point, Ending Point, and Via)
        if ent.get("src"):
            src_val = ent["src"]
            df = df[df["Starting Point"].str.contains(src_val, case=False, na=False) | 
                    df["Ending Point"].str.contains(src_val, case=False, na=False) |
                    df["Via"].str.contains(src_val, case=False, na=False)]

        if ent.get("dest"):
            dest_val = ent["dest"]
            df = df[df["Starting Point"].str.contains(dest_val, case=False, na=False) | 
                    df["Ending Point"].str.contains(dest_val, case=False, na=False) |
                    df["Via"].str.contains(dest_val, case=False, na=False)]

        # Scenario 4: Via a specific route
        if ent.get("via"):
            df = df[df["Via"].str.contains(ent["via"], case=False, na=False)]

        # Formatting results
        results = []
        for _, row in df.head(10).iterrows():
            # UPDATED: Using consistent field names that match the frontend
            results.append({
                "bus_number": str(row["Bus Number"]),
                "source": row['Starting Point'],  # Changed from Route to separate fields
                "destination": row['Ending Point'],  # This enables the Map button
                "route": f"{row['Starting Point']} ➔ {row['Ending Point']}",  # Keep for display
                "via": row["Via"],
                "frequency": "✅ High" if str(row.get("High Frequency Route", "")).lower() == "x" else "Normal"
            })

        if not results:
            dispatcher.utter_message(text=f"🧐 I couldn't find a direct match for '{user_query}'. Try checking the spelling or use a major stop like CMBT, Guindy, or Central.")
        else:
            dispatcher.utter_message(text=f"🚌 Found {len(df)} routes. Here are the top matches:")
            dispatcher.utter_message(json_message={"display_type": "card_list", "data": results})
            
        return []

# ----------------------------------------------------------------
# HELPER FUNCTION
# ----------------------------------------------------------------
def send_card_results(dispatcher, query, results, category_name):
    """
    Helper function to send a text intro and a custom JSON payload
    that the React frontend will catch to render as cards.
    """
    if not results:
        dispatcher.utter_message(text=f"❌ No {category_name} information found for '{query}'.")
        return []

    # 1. Send text message
    dispatcher.utter_message(text=f"I found {len(results)} results for '{query}' in {category_name}:")

    # 2. Send custom payload for Card rendering in React
    dispatcher.utter_message(
        json_message={
            "display_type": "card_list",
            "data": results
        }
    )
    return []

# ----------------------------------------------------------------
# OTHER ACTIONS
# ----------------------------------------------------------------

class ActionSearchEducation(Action):
    def name(self):
        return "action_search_education"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/education_list.json")
        return send_card_results(dispatcher, query, results, "Education")

class ActionSearchExams(Action):
    def name(self):
        return "action_search_exams"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/exams_structured.json")
        return send_card_results(dispatcher, query, results, "Exams")

class ActionSearchPassports(Action):
    def name(self):
        return "action_search_passports"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/passports_structured.json")
        return send_card_results(dispatcher, query, results, "Passports")

class ActionSearchTax(Action):
    def name(self):
        return "action_search_tax"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/tax_structured.json")
        return send_card_results(dispatcher, query, results, "Tax")

class ActionSearchCertificates(Action):
    def name(self):
        return "action_search_certificates"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/certificates_structured.json")
        return send_card_results(dispatcher, query, results, "Certificates")

class ActionSearchSports(Action):
    def name(self):
        return "action_search_sports"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/sports_structured.json")
        return send_card_results(dispatcher, query, results, "Sports")