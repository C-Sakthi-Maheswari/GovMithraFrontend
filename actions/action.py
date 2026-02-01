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





from rasa_sdk import Action, Tracker

from rasa_sdk.executor import CollectingDispatcher
from actions.data_search import search
import json

# -------------------- TEMPLATE ACTION --------------------


class ActionSearchEducation(Action):
    def name(self):
        return "action_search_education"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/education_list.json")  # JSON for education

        if not results:
            dispatcher.utter_message(text=f"No education results found for '{query}'")
            return []

        dispatcher.utter_message(text=f"Top education results for '{query}':")
        for rec in results:
            dispatcher.utter_message(text=json.dumps(rec, indent=2))
        return []

class ActionSearchExams(Action):
    def name(self):
        return "action_search_exams"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/exams_structured.json")  # JSON for exams

        if not results:
            dispatcher.utter_message(text=f"No exam results found for '{query}'")
            return []

        dispatcher.utter_message(text=f"Top exam results for '{query}':")
        for rec in results:
            dispatcher.utter_message(text=json.dumps(rec, indent=2))
        return []

class ActionSearchSports(Action):
    def name(self):
        return "action_search_sports"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/sports_structured.json")  # JSON for sports

        if not results:
            dispatcher.utter_message(text=f"No sports results found for '{query}'")
            return []

        dispatcher.utter_message(text=f"Top sports results for '{query}':")
        for rec in results:
            dispatcher.utter_message(text=json.dumps(rec, indent=2))
        return []

class ActionSearchPassports(Action):
    def name(self):
        return "action_search_passports"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        results = search(query, "actions/passports_structured.json")  # JSON for passports

        if not results:
            dispatcher.utter_message(text=f"No passport results found for '{query}'")
            return []

        dispatcher.utter_message(text=f"Top passport results for '{query}':")
        for rec in results:
            dispatcher.utter_message(text=json.dumps(rec, indent=2))
        return []

class ActionSearchTax(Action):
    def name(self):
        return "action_search_tax"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        dispatcher.utter_message(
            text=f"Searching in our tax database for: '{query}'"
        )
        # TODO: DB search logic here
        return []


class ActionSearchCertificates(Action):
    def name(self):
        return "action_search_certificates"

    def run(self, dispatcher, tracker, domain):
        query = tracker.latest_message.get("text")
        dispatcher.utter_message(
            text=f"Searching in our certificates database for: '{query}'"
        )
        return []

