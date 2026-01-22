import json
from typing import List, Dict
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet

class ActionGuideServices(Action):
    def name(self) -> str:
        return "action_guide_services"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict) -> List[Dict]:

        # Load the JSON data
        with open("structured.json", "r") as f:
            services = json.load(f)

        # Extract slot values
        service_type = (tracker.get_slot("service_type") or "").lower()
        state = (tracker.get_slot("state") or "").lower()
        category = (tracker.get_slot("category") or "").lower()
        user_role = (tracker.get_slot("user_role") or "").lower()

        # Filter services
        matched_services = []

        for s in services:
            # Check service_type (partial match)
            if service_type and service_type not in s.get("service_type", "").lower():
                continue

            # Check state (support "ANY" or multiple states)
            if state:
                service_states = [st.lower() for st in s.get("state", [])]
                if "any" not in service_states and state not in service_states:
                    continue

            # Check category (support "ANY")
            if category:
                eligible_cats = [c.lower() for c in s.get("eligible_categories", [])]
                if "any" not in eligible_cats and category not in eligible_cats:
                    continue

            # Check user_role (support "ANY")
            if user_role:
                target_roles = [r.lower() for r in s.get("target_roles", [])]
                if "any" not in target_roles and user_role not in target_roles:
                    continue

            matched_services.append(s)

        # Respond to user
        if matched_services:
            response = "Here are some services I found:\n"
            for svc in matched_services:
                response += f"- {svc['name']} ({svc['url']})\n"
            dispatcher.utter_message(response)
        else:
            dispatcher.utter_message("I couldn’t find services matching your details. Would you like to explore related education services?")

        return []