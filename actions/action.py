from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
from actions.data_search import search
from actions.translator import translator_instance
import json
import pandas as pd
from fuzzywuzzy import fuzz, process
import re
import os
import logging

logger = logging.getLogger(__name__)

# --------------------------------------------------
# DATA INITIALIZATION
# --------------------------------------------------
CSV_PATH = os.path.join(os.path.dirname(__file__), "mtc_bus_routes.csv")
try:
    bus_data = pd.read_csv(CSV_PATH)
    bus_data.columns = bus_data.columns.str.strip()
    bus_data = bus_data.fillna("")
    
    all_locations = pd.unique(bus_data[['Starting Point', 'Ending Point', 'Via']].values.ravel('K'))
    all_locations = [loc for loc in all_locations if loc]
except Exception as e:
    print(f"❌ Error loading CSV: {e}")
    bus_data = pd.DataFrame()
    all_locations = []

# --------------------------------------------------
# UTILITY FUNCTIONS
# --------------------------------------------------
def get_best_match(text, choices, threshold=70):
    if not text: return None
    match, score = process.extractOne(text, choices, scorer=fuzz.token_set_ratio)
    return match if score >= threshold else text

def extract_entities(query):
    query = query.lower().strip()
    entities = {"bus_no": None, "src": None, "dest": None, "via": None}
    
    bus_match = re.search(r'\b([a-z]?\d+[a-z]?)\b', query)
    if bus_match:
        entities["bus_no"] = bus_match.group(1).upper()

    from_match = re.search(r'from\s+([\w\s]+?)(?=\s+to|\s+via|$)', query)
    to_match = re.search(r'to\s+([\w\s]+?)(?=\s+from|\s+via|$)', query)
    via_match = re.search(r'via\s+([\w\s]+?)(?=\s+from|\s+to|$)', query)

    if from_match: entities["src"] = get_best_match(from_match.group(1).strip(), all_locations)
    if to_match: entities["dest"] = get_best_match(to_match.group(1).strip(), all_locations)
    if via_match: entities["via"] = get_best_match(via_match.group(1).strip(), all_locations)

    if not any([entities["src"], entities["dest"], entities["bus_no"], entities["via"]]):
        entities["via"] = get_best_match(query, all_locations)
    return entities

def get_user_language(tracker):
    """Get user's preferred language from slot, default to 'en'"""
    try:
        lang = tracker.get_slot("user_language")
        return lang if lang else "en"
    except Exception as e:
        logger.error(f"Error getting user language: {e}")
        return "en"

print(f"--- ACTION SERVER LOADING ---")
print(f"Checking CSV Path: {CSV_PATH}")
print(f"CSV exists: {os.path.exists(CSV_PATH)}")
print(f"Locations loaded: {len(all_locations)}")

# --------------------------------------------------
# LANGUAGE SELECTION ACTION
# --------------------------------------------------
class ActionSetLanguage(Action):
    def name(self) -> str:
        return "action_set_language"

    def run(self, dispatcher, tracker, domain):
        user_message = tracker.latest_message.get("text", "").lower()
        
        # Language mapping - updated with new languages
        language_map = {
            'english': 'en',
            'tamil': 'ta',
            'hindi': 'hi',
            'telugu': 'te',
            'malayalam': 'ml',
            'kannada': 'kn'
        }
        
        selected_lang = 'en'
        for lang_name, lang_code in language_map.items():
            if lang_name in user_message:
                selected_lang = lang_code
                break
        
        # Translate confirmation message
        confirmation = f"Language set to {list(language_map.keys())[list(language_map.values()).index(selected_lang)].title()}. How can I help you?"
        
        try:
            translated_confirmation = translator_instance.translate_from_english(confirmation, selected_lang)
        except Exception as e:
            logger.error(f"Translation error in ActionSetLanguage: {e}")
            translated_confirmation = confirmation
        
        dispatcher.utter_message(text=translated_confirmation)
        
        return [SlotSet("user_language", selected_lang)]

# --------------------------------------------------
# BUS SEARCH ACTION WITH TRANSLATION
# --------------------------------------------------
class ActionSearchBus(Action):
    def name(self) -> str:
        return "action_search_bus"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            # Translate query to English for processing
            try:
                english_query, detected_lang = translator_instance.translate_to_english(user_query)
            except Exception as e:
                logger.error(f"Translation error: {e}")
                english_query = user_query
                detected_lang = 'en'
            
            events = []
            if detected_lang != user_lang and detected_lang != 'en':
                events.append(SlotSet("user_language", detected_lang))
                user_lang = detected_lang
            
            ent = extract_entities(english_query)
            
            if bus_data.empty:
                error_msg = translator_instance.translate_from_english(
                    "⚠️ Bus database not loaded.", user_lang
                )
                dispatcher.utter_message(text=error_msg)
                return events

            df = bus_data.copy()
            
            if ent.get("bus_no"):
                df = df[df["Bus Number"].astype(str).str.contains(rf"\b{ent['bus_no']}\b", case=False, regex=True, na=False)]
            
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

            if ent.get("via"):
                df = df[df["Via"].str.contains(ent["via"], case=False, na=False)]

            results = []
            for _, row in df.head(10).iterrows():
                # Build result with English keys first
                result = {
                    "bus_number": str(row["Bus Number"]),
                    "source": row['Starting Point'],
                    "destination": row['Ending Point'],
                    "route": f"{row['Starting Point']} ➔ {row['Ending Point']}",
                    "via": row["Via"],
                    "frequency": "High" if str(row.get("High Frequency Route", "")).lower() == "x" else "Normal"
                }
                results.append(result)

            if not results:
                no_result_msg = translator_instance.translate_from_english(
                    f"🧐 I couldn't find a direct match for '{user_query}'. Try checking the spelling or use a major stop like CMBT, Guindy, or Central.",
                    user_lang
                )
                dispatcher.utter_message(text=no_result_msg)
            else:
                result_msg = translator_instance.translate_from_english(
                    f"🚌 Found {len(df)} routes. Here are the top matches:",
                    user_lang
                )
                dispatcher.utter_message(text=result_msg)
                
                # Translate bus results
                translated_results = translate_card_results(results, user_lang)
                
                dispatcher.utter_message(json_message={
                    "display_type": "card_list",
                    "data": translated_results,
                    "language": user_lang
                })
                
            return events
            
        except Exception as e:
            logger.error(f"Error in ActionSearchBus: {e}")
            dispatcher.utter_message(text="An error occurred while searching for buses.")
            return []

# ----------------------------------------------------------------
# HELPER FUNCTION WITH TRANSLATION FOR CARDS
# ----------------------------------------------------------------
def translate_card_field(field_name, user_lang='en'):
    """Translate field names to user's language"""
    translations = {
        'en': {
            'id': 'ID',
            'name': 'Name',
            'url': 'URL',
            'service type': 'Service Type',
            'service_type': 'Service Type',
            'domain': 'Domain',
            'state': 'State',
            'target roles': 'Target Roles',
            'target_roles': 'Target Roles',
            'eligible categories': 'Eligible Categories',
            'eligible_categories': 'Eligible Categories',
            'tags': 'Tags',
            'description': 'Description',
            'eligibility': 'Eligibility',
            'documents': 'Documents',
            'fee': 'Fee',
            'deadline': 'Deadline',
            'bus_number': 'Bus Number',
            'source': 'Source',
            'destination': 'Destination',
            'route': 'Route',
            'via': 'Via',
            'frequency': 'Frequency'
        },
        'ta': {
            'id': 'அடையாள எண்',
            'name': 'பெயர்',
            'url': 'இணைப்பு',
            'service type': 'சேவை வகை',
            'service_type': 'சேவை வகை',
            'domain': 'துறை',
            'state': 'மாநிலம்',
            'target roles': 'இலக்கு பாத்திரங்கள்',
            'target_roles': 'இலக்கு பாத்திரங்கள்',
            'eligible categories': 'தகுதியான வகைகள்',
            'eligible_categories': 'தகுதியான வகைகள்',
            'tags': 'குறிச்சொற்கள்',
            'description': 'விளக்கம்',
            'eligibility': 'தகுதி',
            'documents': 'ஆவணங்கள்',
            'fee': 'கட்டணம்',
            'deadline': 'கடைசி தேதி',
            'bus_number': 'பேருந்து எண்',
            'source': 'தொடக்க இடம்',
            'destination': 'இறுதி இடம்',
            'route': 'வழி',
            'via': 'வழியாக',
            'frequency': 'அடிக்கடி'
        },
        'hi': {
            'id': 'आईडी',
            'name': 'नाम',
            'url': 'लिंक',
            'service type': 'सेवा प्रकार',
            'service_type': 'सेवा प्रकार',
            'domain': 'डोमेन',
            'state': 'राज्य',
            'target roles': 'लक्षित भूमिकाएं',
            'target_roles': 'लक्षित भूमिकाएं',
            'eligible categories': 'पात्र श्रेणियां',
            'eligible_categories': 'पात्र श्रेणियां',
            'tags': 'टैग',
            'description': 'विवरण',
            'eligibility': 'पात्रता',
            'documents': 'दस्तावेज़',
            'fee': 'शुल्क',
            'deadline': 'अंतिम तिथि',
            'bus_number': 'बस नंबर',
            'source': 'स्रोत',
            'destination': 'गंतव्य',
            'route': 'मार्ग',
            'via': 'के माध्यम से',
            'frequency': 'आवृत्ति'
        },
        'te': {
            'id': 'ఐడి',
            'name': 'పేరు',
            'url': 'లింక్',
            'service type': 'సేవా రకం',
            'service_type': 'సేవా రకం',
            'domain': 'డొమైన్',
            'state': 'రాష్ట్రం',
            'target roles': 'లక్ష్య పాత్రలు',
            'target_roles': 'లక్ష్య పాత్రలు',
            'eligible categories': 'అర్హత వర్గాలు',
            'eligible_categories': 'అర్హత వర్గాలు',
            'tags': 'ట్యాగ్‌లు',
            'description': 'వివరణ',
            'eligibility': 'అర్హత',
            'documents': 'పత్రాలు',
            'fee': 'రుసుము',
            'deadline': 'చివరి తేదీ',
            'bus_number': 'బస్ నంబర్',
            'source': 'మూలం',
            'destination': 'గమ్యస్థానం',
            'route': 'మార్గం',
            'via': 'ద్వారా',
            'frequency': 'ఫ్రీక్వెన్సీ'
        },
        'ml': {
            'id': 'ഐഡി',
            'name': 'പേര്',
            'url': 'ലിങ്ക്',
            'service type': 'സേവന തരം',
            'service_type': 'സേവന തരം',
            'domain': 'ഡൊമെയ്ൻ',
            'state': 'സംസ്ഥാനം',
            'target roles': 'ടാർഗെറ്റ് റോളുകൾ',
            'target_roles': 'ടാർഗെറ്റ് റോളുകൾ',
            'eligible categories': 'യോഗ്യതയുള്ള വിഭാഗങ്ങൾ',
            'eligible_categories': 'യോഗ്യതയുള്ള വിഭാഗങ്ങൾ',
            'tags': 'ടാഗുകൾ',
            'description': 'വിവരണം',
            'eligibility': 'യോഗ്യത',
            'documents': 'രേഖകൾ',
            'fee': 'ഫീസ്',
            'deadline': 'അവസാന തീയതി',
            'bus_number': 'ബസ് നമ്പർ',
            'source': 'സ്രോതസ്സ്',
            'destination': 'ലക്ഷ്യസ്ഥാനം',
            'route': 'റൂട്ട്',
            'via': 'വഴി',
            'frequency': 'ആവൃത്തി'
        },
        'kn': {
            'id': 'ಐಡಿ',
            'name': 'ಹೆಸರು',
            'url': 'ಲಿಂಕ್',
            'service type': 'ಸೇವಾ ಪ್ರಕಾರ',
            'service_type': 'ಸೇವಾ ಪ್ರಕಾರ',
            'domain': 'ಡೊಮೈನ್',
            'state': 'ರಾಜ್ಯ',
            'target roles': 'ಗುರಿ ಪಾತ್ರಗಳು',
            'target_roles': 'ಗುರಿ ಪಾತ್ರಗಳು',
            'eligible categories': 'ಅರ್ಹ ವರ್ಗಗಳು',
            'eligible_categories': 'ಅರ್ಹ ವರ್ಗಗಳು',
            'tags': 'ಟ್ಯಾಗ್‌ಗಳು',
            'description': 'ವಿವರಣೆ',
            'eligibility': 'ಅರ್ಹತೆ',
            'documents': 'ದಾಖಲೆಗಳು',
            'fee': 'ಶುಲ್ಕ',
            'deadline': 'ಕೊನೆಯ ದಿನಾಂಕ',
            'bus_number': 'ಬಸ್ ಸಂಖ್ಯೆ',
            'source': 'ಮೂಲ',
            'destination': 'ಗುರಿ',
            'route': 'ಮಾರ್ಗ',
            'via': 'ಮೂಲಕ',
            'frequency': 'ಆವರ್ತನ'
        }
    }
    
    field_lower = field_name.lower().strip()
    if user_lang in translations and field_lower in translations[user_lang]:
        return translations[user_lang][field_lower]
    return field_name

def translate_card_results(results, user_lang='en'):
    """Translate card results to user's language"""
    if user_lang == 'en' or not results:
        return results
    
    translated_results = []
    for item in results:
        translated_item = {}
        for key, value in item.items():
            # Translate the key (field name)
            translated_key = translate_card_field(key, user_lang)
            
            # Translate the value (except URLs and IDs)
            if key.lower() in ['url', 'id']:
                translated_value = value
            else:
                try:
                    translated_value = translator_instance.translate_from_english(str(value), user_lang)
                except:
                    translated_value = value
            
            translated_item[translated_key] = translated_value
        
        translated_results.append(translated_item)
    
    return translated_results

def send_card_results(dispatcher, query, results, category_name, user_lang='en'):
    try:
        if not results:
            error_msg = translator_instance.translate_from_english(
                f"❌ No {category_name} information found for '{query}'.",
                user_lang
            )
            dispatcher.utter_message(text=error_msg)
            return []

        intro_msg = translator_instance.translate_from_english(
            f"I found {len(results)} results for '{query}' in {category_name}:",
            user_lang
        )
        dispatcher.utter_message(text=intro_msg)

        # Translate the card results
        translated_results = translate_card_results(results, user_lang)

        dispatcher.utter_message(
            json_message={
                "display_type": "card_list",
                "data": translated_results,
                "language": user_lang
            }
        )
        return []
    except Exception as e:
        logger.error(f"Error in send_card_results: {e}")
        dispatcher.utter_message(text=f"Found {len(results) if results else 0} results.")
        return []

# ----------------------------------------------------------------
# OTHER ACTIONS WITH TRANSLATION
# ----------------------------------------------------------------
class ActionSearchEducation(Action):
    def name(self):
        return "action_search_education"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/education_list.json")
            return send_card_results(dispatcher, user_query, results, "Education", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchEducation: {e}")
            dispatcher.utter_message(text="An error occurred while searching for education information.")
            return []

class ActionSearchExams(Action):
    def name(self):
        return "action_search_exams"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/exams_structured.json")
            return send_card_results(dispatcher, user_query, results, "Exams", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchExams: {e}")
            dispatcher.utter_message(text="An error occurred while searching for exam information.")
            return []

class ActionSearchPassports(Action):
    def name(self):
        return "action_search_passports"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/passports_structured.json")
            return send_card_results(dispatcher, user_query, results, "Passports", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchPassports: {e}")
            dispatcher.utter_message(text="An error occurred while searching for passport information.")
            return []

class ActionSearchTax(Action):
    def name(self):
        return "action_search_tax"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/tax_structured.json")
            return send_card_results(dispatcher, user_query, results, "Tax", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchTax: {e}")
            dispatcher.utter_message(text="An error occurred while searching for tax information.")
            return []

class ActionSearchCertificates(Action):
    def name(self):
        return "action_search_certificates"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/birthdeath_structured.json")
            return send_card_results(dispatcher, user_query, results, "Certificates", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchCertificates: {e}")
            dispatcher.utter_message(text="An error occurred while searching for certificate information.")
            return []

class ActionSearchSports(Action):
    def name(self):
        return "action_search_sports"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/sports_structured.json")
            return send_card_results(dispatcher, user_query, results, "Sports", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchSports: {e}")
            dispatcher.utter_message(text="An error occurred while searching for sports information.")
            return []
        
class ActionSearchAgriculture(Action):
    def name(self):
        return "action_search_agriculture"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/agriculture_structured.json")
            return send_card_results(dispatcher, user_query, results, "Agriculture", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchAgriculture: {e}")
            dispatcher.utter_message(text="An error occurred while searching for agriculture information.")
            return []
        
class ActionSearchBusiness(Action):
    def name(self):
        return "action_search_business"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/business_structured.json")
            return send_card_results(dispatcher, user_query, results, "Business", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchBusiness: {e}")
            dispatcher.utter_message(text="An error occurred while searching for business information.")
            return []

class ActionSearchElectricity(Action):
    def name(self):
        return "action_search_electricity"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/electricity_structured.json")
            return send_card_results(dispatcher, user_query, results, "Electricity", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchElectricity: {e}")
            dispatcher.utter_message(text="An error occurred while searching for electricity information.")
            return []
        
class ActionSearchHealth(Action):
    def name(self):
        return "action_search_health"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/health_structured.json")
            return send_card_results(dispatcher, user_query, results, "Health", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchHealth: {e}")
            dispatcher.utter_message(text="An error occurred while searching for health information.")
            return []
        
class ActionSearchHousing(Action):
    def name(self):
        return "action_search_housing"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/housing_structured.json")
            return send_card_results(dispatcher, user_query, results, "Housing", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchHousing: {e}")
            dispatcher.utter_message(text="An error occurred while searching for housing information.")
            return []

class ActionSearchJobs(Action):
    def name(self):
        return "action_search_jobs"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/jobs_structured.json")
            return send_card_results(dispatcher, user_query, results, "Jobs", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchJobs: {e}")
            dispatcher.utter_message(text="An error occurred while searching for jobs information.")
            return []
        
class ActionSearchJustice(Action):
    def name(self):
        return "action_search_justice"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/justice_structured.json")
            return send_card_results(dispatcher, user_query, results, "Justice  ", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchJustice: {e}")
            dispatcher.utter_message(text="An error occurred while searching for justice information.")
            return []
        
class ActionSearchLocal(Action):
    def name(self):
        return "action_search_local"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/local_structured.json")
            return send_card_results(dispatcher, user_query, results, "Local    ", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchLocal: {e}")
            dispatcher.utter_message(text="An error occurred while searching for local information.")
            return []
        
class ActionSearchLpgServices(Action):
    def name(self):
        return "action_search_lpg_services"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/lpg_services_structured.json")
            return send_card_results(dispatcher, user_query, results, "LPG Services", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchpgServices: {e}")
            dispatcher.utter_message(text="An error occurred while searching for LPG services information.")
            return []
        
class ActionSearchMoneyBanking(Action):
    def name(self):
        return "action_search_money_banking"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/moneybanking_structured.json")
            return send_card_results(dispatcher, user_query, results, "Money Banking", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchMoneyBanking: {e}")
            dispatcher.utter_message(text="An error occurred while searching for money banking information.")
            return []

class ActionSearchMoneyTax(Action):
    def name(self):
        return "action_search_money_tax"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/moneytax_structured.json")
            return send_card_results(dispatcher, user_query, results, "Money Tax", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchMoneyTax: {e}")
            dispatcher.utter_message(text="An error occurred while searching for money tax information.")
            return []


class ActionSearchPension(Action):
    def name(self):
        return "action_search_pension"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/pension_structured.json")
            return send_card_results(dispatcher, user_query, results, "Pension", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchPension: {e}")
            dispatcher.utter_message(text="An error occurred while searching for pension information.")
            return []

class ActionSearchScienceIt(Action):
    def name(self):
        return "action_search_science_it"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/science_it_structured.json")
            return send_card_results(dispatcher, user_query, results, "Science IT", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchScienceIt: {e}")
            dispatcher.utter_message(text="An error occurred while searching for Science IT information.")
            return []
        
class ActionSearchTransport(Action):
    def name(self):
        return "action_search_transport"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/transport_structured.json")
            return send_card_results(dispatcher, user_query, results, "Transport", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchTransport: {e}")
            dispatcher.utter_message(text="An error occurred while searching for transport information.")
            return []

class ActionSearchTravelTourism(Action):
    def name(self):
        return "action_search_travel_tourism"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/traveltourism_structured.json")
            return send_card_results(dispatcher, user_query, results, "Travel Tourism", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchTravelTourism: {e}")
            dispatcher.utter_message(text="An error occurred while searching for travel tourism information.")
            return []
        
class ActionSearchWater(Action):
    def name(self):
        return "action_search_water"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/water_structured.json")
            return send_card_results(dispatcher, user_query, results, "Water", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchWater: {e}")
            dispatcher.utter_message(text="An error occurred while searching for water information.")
            return []
        
class ActionSearchYouth(Action):
    def name(self):
        return "action_search_youth"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text")
            user_lang = get_user_language(tracker)
            
            english_query, _ = translator_instance.translate_to_english(user_query)
            results = search(english_query, "actions/youth_structured.json")
            return send_card_results(dispatcher, user_query, results, "Youth", user_lang)
        except Exception as e:
            logger.error(f"Error in ActionSearchYouth: {e}")
            dispatcher.utter_message(text="An error occurred while searching for youth information.")
            return []