# from rasa_sdk import Action, Tracker
# from rasa_sdk.executor import CollectingDispatcher
#
# # Import your custom search function
# from actions.education_action import (
#     normalize_text,
#     extract_keywords,
#     expand_keywords,
#     flatten_json,
#     score_record,
#     count_keyword_matches,
#     TOP_K,
#     GOOGLE_THRESHOLD,
#     MIN_KEYWORDS_MATCHED,
#     data  # if your gov_search.py already loads the JSON, use it
# )
#
#
# class ActionSearchEducation(Action):
#     def name(self) -> str:
#         return "action_search_education"
#
#     def run(self, dispatcher: CollectingDispatcher,
#             tracker: Tracker,
#             domain: dict):
#
#         query = tracker.latest_message.get("text")
#         query_text = normalize_text(query)
#         keywords = extract_keywords(query)
#         original_keywords = keywords.copy()
#         keywords = expand_keywords(keywords)
#
#         if not keywords:
#             dispatcher.utter_message(text="Please enter a meaningful query.")
#             return []
#
#         scored_results = []
#         for record in data:  # use your existing data loaded in gov_search.py
#             record_text = flatten_json(record)
#             score = score_record(record, record_text, keywords, query_text)
#             if score > 0:
#                 scored_results.append((score, record, record_text))
#
#         if not scored_results:
#             dispatcher.utter_message(text="No relevant results found.")
#             return []
#
#         # Multi-word query filtering
#         if len(original_keywords) >= 3:
#             filtered_results = []
#             for score, rec, rec_text in scored_results:
#                 matches = count_keyword_matches(rec_text, original_keywords)
#                 if matches >= MIN_KEYWORDS_MATCHED:
#                     filtered_results.append((score, rec))
#             if filtered_results:
#                 scored_results = filtered_results
#             else:
#                 scored_results = [(s, r) for s, r, _ in scored_results]
#         else:
#             scored_results = [(s, r) for s, r, _ in scored_results]
#
#         # Ranking
#         scored_results.sort(key=lambda x: x[0], reverse=True)
#         best_score, best_record = scored_results[0]
#
#         close_results = [
#             rec for score, rec in scored_results
#             if score >= GOOGLE_THRESHOLD * best_score
#         ][:TOP_K]
#
#         # Send results to user
#         dispatcher.utter_message(text=f"Best matching education result for your query: '{query}'")
#         display_text = ""
#         for key, value in best_record.items():
#             if isinstance(value, list):
#                 display_text += f"{key.capitalize()}: {', '.join(map(str, value))}\n"
#             elif isinstance(value, dict):
#                 display_text += f"{key.capitalize()}: {json.dumps(value, indent=2)}\n"
#             else:
#                 display_text += f"{key.capitalize()}: {value}\n"
#
#         dispatcher.utter_message(text=display_text)
#
#         # Optional: show related results
#         if len(close_results) > 1:
#             dispatcher.utter_message(text="Related education results:")
#             for i, rec in enumerate(close_results[1:], 1):
#                 display_text = ""
#                 for key, value in rec.items():
#                     if isinstance(value, list):
#                         display_text += f"{key.capitalize()}: {', '.join(map(str, value))}\n"
#                     elif isinstance(value, dict):
#                         display_text += f"{key.capitalize()}: {json.dumps(value, indent=2)}\n"
#                     else:
#                         display_text += f"{key.capitalize()}: {value}\n"
#                 dispatcher.utter_message(text=display_text)
#
#         return []
#
# class ActionSearchTax(Action):
#     def name(self):
#         return "action_search_tax"
#
#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         dispatcher.utter_message(
#             text=f"Searching in our tax database for: '{query}'"
#         )
#         # TODO: DB search logic here
#         return []
#
#
# class ActionSearchCertificates(Action):
#     def name(self):
#         return "action_search_certificates"
#
#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         dispatcher.utter_message(
#             text=f"Searching in our certificates database for: '{query}'"
#         )
#         return []
#
#
# class ActionSearchPassport(Action):
#     def name(self):
#         return "action_search_passports"
#
#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         dispatcher.utter_message(
#             text=f"Searching in our passports/citizenship database for: '{query}'"
#         )
#         return []
#
# # class ActionSearchEducation(Action):
# #     def name(self):
# #         return "action_search_education"
# #
# #     def run(self, dispatcher, tracker, domain):
# #         query = tracker.latest_message.get("text")
# #         dispatcher.utter_message(
# #             text=f"Searching in our education database for: '{query}'"
# #         )
# #         return []
#
# class ActionSearchSports(Action):
#     def name(self):
#         return "action_search_sports"
#
#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         dispatcher.utter_message(
#             text=f"Searching in our sports database for: '{query}'"
#         )
#         return []
#
# class ActionSearchExams(Action):
#     def name(self):
#         return "action_search_exams"
#
#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         dispatcher.utter_message(
#             text=f"Searching in our exams database for: '{query}'"
#         )
#         return []














# from rasa_sdk import Action, Tracker

# from rasa_sdk.executor import CollectingDispatcher
# from actions.data_search import search
# import json
# def format_as_pretty_string(data):
#     """
#     Convert a JSON dictionary into a clean, human-readable
#     Markdown-style string.
#     """
#     formatted_lines = []

#     for key, value in data.items():
#         # Make keys more readable: replace underscores and capitalize words
#         readable_key = key.replace("_", " ").title()
#         formatted_lines.append(f"{readable_key}:  {value}")

#     return "\n".join(formatted_lines) + "\n\n---\n"

# # -------------------- TEMPLATE ACTION --------------------


# class ActionSearchEducation(Action):
#     def name(self):
#         return "action_search_education"

#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         results = search(query, "actions/education_list.json")  # JSON for education

#         if not results:
#             dispatcher.utter_message(text=f"No education results found for '{query}'")
#             return []
#         output = f"Top education results for '{query}':\n\n"
#         for rec in results:
#             output += format_as_pretty_string(rec)

#         dispatcher.utter_message(text=output)
#         return []

# class ActionSearchExams(Action):
#     def name(self):
#         return "action_search_exams"

#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         results = search(query, "actions/exams_structured.json")  # JSON for exams

#         if not results:
#             dispatcher.utter_message(text=f"No exam results found for '{query}'")
#             return []

#         dispatcher.utter_message(text=f"Top exam results for '{query}':")
#         for rec in results:
#             dispatcher.utter_message(text=json.dumps(rec, indent=2))
#         return []

# class ActionSearchExams(Action):
#     def name(self):
#         return "action_search_exams"

#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         results = search(query, "actions/exams_structured.json")

#         if not results:
#             dispatcher.utter_message(text=f"❌ No exam results found for '{query}'.")
#             return []

#         # 1. Start with a clear header
#         output = f"📝Exam results for '{query}':**\n\n"

#         # 2. Use the formatter to build the string
#         for rec in results:
#             output += format_as_pretty_string(rec)

#         # 3. Send the formatted string to the frontend
#         dispatcher.utter_message(text=output)
#         return []
    
# class ActionSearchPassports(Action):
#     def name(self):
#         return "action_search_passports"

#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         results = search(query, "actions/passports_structured.json")

#         if not results:
#             dispatcher.utter_message(text=f"🛂 No passport information found for '{query}'.")
#             return []

#         # Start the formatted message
#         output = f"🛂 Passport Information for '{query}':\n\n"
        
#         # Build the neat result string
#         for rec in results:
#             output += format_as_pretty_string(rec)

#         dispatcher.utter_message(text=output)
#         return []
    
# class ActionSearchTax(Action):
#     def name(self):
#         return "action_search_tax"

#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
        
#         # Connect to your tax data source
#         results = search(query, "actions/tax_structured.json") 

#         if not results:
#             dispatcher.utter_message(text=f"📊 No tax-related information found for '{query}'.")
#             return []

#         # Build the header
#         output = f"📊 Tax Database Results for '{query}':\n\n"
        
#         # Use the helper function to make it look professional
#         for rec in results:
#             output += format_as_pretty_string(rec)

#         dispatcher.utter_message(text=output)
#         return []
    
# class ActionSearchCertificates(Action):
#     def name(self):
#         return "action_search_certificates"

#     def run(self, dispatcher, tracker, domain):
#         query = tracker.latest_message.get("text")
#         dispatcher.utter_message(
#             text=f"Searching in our certificates database for: '{query}'"
#         )
#         return []

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from actions.data_search import search
import json

# ----------------------------------------------------------------
# HELPERS
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
# ACTIONS
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
        # Assuming you have a certificates JSON, otherwise adjust path
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