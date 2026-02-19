from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
from actions.data_search import search
from actions.translator import translator_instance
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
    logger.error(f"Error loading CSV: {e}")
    bus_data = pd.DataFrame()
    all_locations = []

print(f"--- ACTION SERVER LOADING ---")
print(f"CSV Path: {CSV_PATH} | Exists: {os.path.exists(CSV_PATH)} | Locations: {len(all_locations)}")

# --------------------------------------------------
# FIELD LABEL TRANSLATIONS
# --------------------------------------------------
FIELD_LABELS = {
    'en': {
        'id': 'ID', 'name': 'Name', 'url': 'URL',
        'service type': 'Service Type', 'service_type': 'Service Type',
        'domain': 'Domain', 'state': 'State',
        'target roles': 'Target Roles', 'target_roles': 'Target Roles',
        'eligible categories': 'Eligible Categories', 'eligible_categories': 'Eligible Categories',
        'tags': 'Tags', 'description': 'Description', 'eligibility': 'Eligibility',
        'documents': 'Documents', 'fee': 'Fee', 'deadline': 'Deadline', 'level': 'Level',
        'bus_number': 'Bus Number', 'source': 'Source', 'destination': 'Destination',
        'via': 'Via', 'frequency': 'Frequency', 'city': 'City', 'district': 'District',
    },
    'ta': {
        'id': 'அடையாள எண்', 'name': 'பெயர்', 'url': 'இணைப்பு',
        'service type': 'சேவை வகை', 'service_type': 'சேவை வகை',
        'domain': 'துறை', 'state': 'மாநிலம்',
        'target roles': 'இலக்கு பாத்திரங்கள்', 'target_roles': 'இலக்கு பாத்திரங்கள்',
        'eligible categories': 'தகுதியான வகைகள்', 'eligible_categories': 'தகுதியான வகைகள்',
        'tags': 'குறிச்சொற்கள்', 'description': 'விளக்கம்', 'eligibility': 'தகுதி',
        'documents': 'ஆவணங்கள்', 'fee': 'கட்டணம்', 'deadline': 'கடைசி தேதி', 'level': 'நிலை',
        'bus_number': 'பேருந்து எண்', 'source': 'தொடக்க இடம்', 'destination': 'இறுதி இடம்',
        'via': 'வழியாக', 'frequency': 'இயக்க அதிர்வெண்', 'city': 'நகரம்', 'district': 'மாவட்டம்',
    },
    'hi': {
        'id': 'आईडी', 'name': 'नाम', 'url': 'लिंक',
        'service type': 'सेवा प्रकार', 'service_type': 'सेवा प्रकार',
        'domain': 'डोमेन', 'state': 'राज्य',
        'target roles': 'लक्षित भूमिकाएं', 'target_roles': 'लक्षित भूमिकाएं',
        'eligible categories': 'पात्र श्रेणियां', 'eligible_categories': 'पात्र श्रेणियां',
        'tags': 'टैग', 'description': 'विवरण', 'eligibility': 'पात्रता',
        'documents': 'दस्तावेज़', 'fee': 'शुल्क', 'deadline': 'अंतिम तिथि', 'level': 'स्तर',
        'bus_number': 'बस नंबर', 'source': 'शुरुआती जगह', 'destination': 'अंतिम जगह',
        'via': 'होते हुए', 'frequency': 'आवृत्ति', 'city': 'शहर', 'district': 'जिला',
    },
    'te': {
        'id': 'ఐడి', 'name': 'పేరు', 'url': 'లింక్',
        'service type': 'సేవా రకం', 'service_type': 'సేవా రకం',
        'domain': 'డొమైన్', 'state': 'రాష్ట్రం',
        'target roles': 'లక్ష్య పాత్రలు', 'target_roles': 'లక్ష్య పాత్రలు',
        'eligible categories': 'అర్హత వర్గాలు', 'eligible_categories': 'అర్హత వర్గాలు',
        'tags': 'ట్యాగ్‌లు', 'description': 'వివరణ', 'eligibility': 'అర్హత',
        'documents': 'పత్రాలు', 'fee': 'రుసుము', 'deadline': 'చివరి తేదీ', 'level': 'స్థాయి',
        'bus_number': 'బస్ నంబర్', 'source': 'మూలం', 'destination': 'గమ్యస్థానం',
        'via': 'ద్వారా', 'frequency': 'ఫ్రీక్వెన్సీ', 'city': 'నగరం', 'district': 'జిల్లా',
    },
    'ml': {
        'id': 'ഐഡി', 'name': 'പേര്', 'url': 'ലിങ്ക്',
        'service type': 'സേവന തരം', 'service_type': 'സേവന തരം',
        'domain': 'ഡൊമെയ്ൻ', 'state': 'സംസ്ഥാനം',
        'target roles': 'ടാർഗെറ്റ് റോളുകൾ', 'target_roles': 'ടാർഗെറ്റ് റോളുകൾ',
        'eligible categories': 'യോഗ്യതയുള്ള വിഭാഗങ്ങൾ', 'eligible_categories': 'യോഗ്യതയുള്ള വിഭാഗങ്ങൾ',
        'tags': 'ടാഗുകൾ', 'description': 'വിവരണം', 'eligibility': 'യോഗ്യത',
        'documents': 'രേഖകൾ', 'fee': 'ഫീസ്', 'deadline': 'അവസാന തീയതി', 'level': 'തലം',
        'bus_number': 'ബസ് നമ്പർ', 'source': 'സ്രോതസ്സ്', 'destination': 'ലക്ഷ്യസ്ഥാനം',
        'via': 'വഴി', 'frequency': 'ആവൃത്തി', 'city': 'നഗരം', 'district': 'ജില്ല',
    },
    'kn': {
        'id': 'ಐಡಿ', 'name': 'ಹೆಸರು', 'url': 'ಲಿಂಕ್',
        'service type': 'ಸೇವಾ ಪ್ರಕಾರ', 'service_type': 'ಸೇವಾ ಪ್ರಕಾರ',
        'domain': 'ಡೊಮೈನ್', 'state': 'ರಾಜ್ಯ',
        'target roles': 'ಗುರಿ ಪಾತ್ರಗಳು', 'target_roles': 'ಗುರಿ ಪಾತ್ರಗಳು',
        'eligible categories': 'ಅರ್ಹ ವರ್ಗಗಳು', 'eligible_categories': 'ಅರ್ಹ ವರ್ಗಗಳು',
        'tags': 'ಟ್ಯಾಗ್‌ಗಳು', 'description': 'ವಿವರಣೆ', 'eligibility': 'ಅರ್ಹತೆ',
        'documents': 'ದಾಖಲೆಗಳು', 'fee': 'ಶುಲ್ಕ', 'deadline': 'ಕೊನೆಯ ದಿನಾಂಕ', 'level': 'ಮಟ್ಟ',
        'bus_number': 'ಬಸ್ ಸಂಖ್ಯೆ', 'source': 'ಮೂಲ', 'destination': 'ಗುರಿ',
        'via': 'ಮೂಲಕ', 'frequency': 'ಆವರ್ತನ', 'city': 'ನಗರ', 'district': 'ಜಿಲ್ಲೆ',
    },
}

CATEGORY_LABELS = {
    'Education':      {'ta': 'கல்வி',                           'hi': 'शिक्षा',          'te': 'విద్య',         'ml': 'വിദ്യാഭ്യാസം',    'kn': 'ಶಿಕ್ಷಣ'},
    'Exams':          {'ta': 'தேர்வுகள்',                       'hi': 'परीक्षाएं',       'te': 'పరీక్షలు',      'ml': 'പരീക്ഷകൾ',        'kn': 'ಪರೀಕ್ಷೆಗಳು'},
    'Passports':      {'ta': 'பாஸ்போர்ட்',                     'hi': 'पासपोर्ट',        'te': 'పాస్‌పోర్ట్',   'ml': 'പാസ്‌പോർട്ട്',    'kn': 'ಪಾಸ್‌ಪೋರ್ಟ್'},
    'Tax':            {'ta': 'வரி',                              'hi': 'कर',               'te': 'పన్ను',          'ml': 'നികുതി',           'kn': 'ತೆರಿಗೆ'},
    'Certificates':   {'ta': 'சான்றிதழ்கள்',                   'hi': 'प्रमाण पत्र',     'te': 'సర్టిఫికేట్లు', 'ml': 'സർട്ടിഫിക്കറ്റുകൾ','kn': 'ಪ್ರಮಾಣಪತ್ರಗಳು'},
    'Sports':         {'ta': 'விளையாட்டு',                     'hi': 'खेल',              'te': 'క్రీడలు',        'ml': 'കായികം',           'kn': 'ಕ್ರೀಡೆ'},
    'Agriculture':    {'ta': 'விவசாயம்',                       'hi': 'कृषि',             'te': 'వ్యవసాయం',      'ml': 'കൃഷി',             'kn': 'ಕೃಷಿ'},
    'Business':       {'ta': 'வணிகம்',                         'hi': 'व्यवसाय',         'te': 'వ్యాపారం',      'ml': 'ബിസിനസ്',         'kn': 'ವ್ಯಾಪಾರ'},
    'Electricity':    {'ta': 'மின்சாரம்',                      'hi': 'बिजली',            'te': 'విద్యుత్',      'ml': 'വൈദ്യുതി',         'kn': 'ವಿದ್ಯುತ್'},
    'Health':         {'ta': 'சுகாதாரம்',                      'hi': 'स्वास्थ्य',       'te': 'ఆరోగ్యం',       'ml': 'ആരോഗ്യം',          'kn': 'ಆರೋಗ್ಯ'},
    'Housing':        {'ta': 'வீட்டுவசதி',                     'hi': 'आवास',             'te': 'గృహనిర్మాణం',   'ml': 'ഭവനം',             'kn': 'ವಸತಿ'},
    'Jobs':           {'ta': 'வேலைகள்',                        'hi': 'नौकरियां',         'te': 'ఉద్యోగాలు',     'ml': 'ജോലികൾ',           'kn': 'ಉದ್ಯೋಗಗಳು'},
    'Justice':        {'ta': 'நீதி',                            'hi': 'न्याय',            'te': 'న్యాయం',         'ml': 'നീതി',             'kn': 'ನ್ಯಾಯ'},
    'Local':          {'ta': 'உள்ளாட்சி',                      'hi': 'स्थानीय',         'te': 'స్థానిక',        'ml': 'പ്രാദേശിക',        'kn': 'ಸ್ಥಳೀಯ'},
    'LPG Services':   {'ta': 'எல்பிஜி சேவைகள்',               'hi': 'एलपीजी सेवाएं',   'te': 'ఎల్‌పీజీ సేవలు', 'ml': 'എൽപിജി സേവനങ്ങൾ',  'kn': 'ಎಲ್‌ಪಿಜಿ ಸೇವೆಗಳು'},
    'Money Banking':  {'ta': 'வங்கி சேவைகள்',                 'hi': 'बैंकिंग सेवाएं',  'te': 'బ్యాంకింగ్ సేవలు','ml': 'ബാങ്കിംഗ് സേവനങ്ങൾ','kn': 'ಬ್ಯಾಂಕಿಂಗ್ ಸೇವೆಗಳು'},
    'Money Tax':      {'ta': 'வரி சேவைகள்',                   'hi': 'कर सेवाएं',        'te': 'పన్ను సేవలు',    'ml': 'നികുതി സേവനങ്ങൾ',  'kn': 'ತೆರಿಗೆ ಸೇವೆಗಳು'},
    'Pension':        {'ta': 'ஓய்வூதியம்',                    'hi': 'पेंशन',            'te': 'పెన్షన్',        'ml': 'പെൻഷൻ',            'kn': 'ಪಿಂಚಣಿ'},
    'Science IT':     {'ta': 'அறிவியல் தகவல் தொழில்நுட்பம்', 'hi': 'विज्ञान और आईटी', 'te': 'సైన్స్ ఐటీ',     'ml': 'ശാസ്ത്ര ഐടി',      'kn': 'ವಿಜ್ಞಾನ ಐಟಿ'},
    'Transport':      {'ta': 'போக்குவரத்து',                   'hi': 'परिवहन',           'te': 'రవాణా',          'ml': 'ഗതാഗതം',           'kn': 'ಸಾರಿಗೆ'},
    'Travel Tourism': {'ta': 'சுற்றுலா',                       'hi': 'पर्यटन',           'te': 'పర్యటన',         'ml': 'ടൂറിസം',           'kn': 'ಪ್ರವಾಸೋದ್ಯಮ'},
    'Water':          {'ta': 'நீர் சேவைகள்',                   'hi': 'जल सेवाएं',        'te': 'నీటి సేవలు',     'ml': 'ജല സേവനങ്ങൾ',      'kn': 'ನೀರಿನ ಸೇವೆಗಳು'},
    'Youth':          {'ta': 'இளைஞர்',                         'hi': 'युवा',              'te': 'యువత',           'ml': 'യുവജനം',           'kn': 'ಯುವಜನ'},
    'Bus':            {'ta': 'பேருந்து',                        'hi': 'बस',               'te': 'బస్సు',          'ml': 'ബസ്',              'kn': 'ಬಸ್'},
}

UI_MESSAGES = {
    'found_results': {
        'en': "I found {count} results for '{query}' in {category}:",
        'ta': "'{query}' க்கான {count} முடிவுகளை {category} இல் கண்டேன்:",
        'hi': "मुझे '{query}' के लिए {category} में {count} परिणाम मिले:",
        'te': "'{query}' కోసం {category} లో {count} ఫలితాలు కనుగొన్నాను:",
        'ml': "'{query}' നായി {category} ൽ {count} ഫലങ്ങൾ കണ്ടെത്തി:",
        'kn': "'{query}' ಗಾಗಿ {category} ನಲ್ಲಿ {count} ಫಲಿತಾಂಶಗಳು ಸಿಕ್ಕಿವೆ:",
    },
    'no_results': {
        'en': "❌ No {category} information found for '{query}'.",
        'ta': "❌ '{query}' க்கான {category} தகவல் எதுவும் கிடைக்கவில்லை.",
        'hi': "❌ '{query}' के लिए {category} में कोई जानकारी नहीं मिली।",
        'te': "❌ '{query}' కోసం {category} సమాచారం ఏదీ కనుగొనలేదు.",
        'ml': "❌ '{query}' നായി {category} വിവരങ്ങൾ കണ്ടെത്തിയില്ല.",
        'kn': "❌ '{query}' ಗಾಗಿ {category} ಮಾಹಿತಿ ಏನೂ ಸಿಗಲಿಲ್ಲ.",
    },
    'bus_found': {
        'en': "🚌 Found {count} route(s). Here are the top matches:",
        'ta': "🚌 {count} வழி(கள்) கண்டறியப்பட்டது. சிறந்த போட்டிகள் இங்கே:",
        'hi': "🚌 {count} मार्ग मिले। शीर्ष परिणाम यहां हैं:",
        'te': "🚌 {count} మార్గాలు కనుగొనబడ్డాయి. అగ్ర ఫలితాలు ఇక్కడ ఉన్నాయి:",
        'ml': "🚌 {count} റൂട്ടുകൾ കണ്ടെത്തി. മികച്ച ഫലങ്ങൾ ഇവിടെ:",
        'kn': "🚌 {count} ಮಾರ್ಗಗಳು ಸಿಕ್ಕಿವೆ. ಮೇಲ್ಭಾಗದ ಫಲಿತಾಂಶಗಳು ಇಲ್ಲಿವೆ:",
    },
    'bus_not_found': {
        'en': "🧐 I couldn't find a direct match for '{query}'. Try checking the spelling or use a major stop like CMBT, Guindy, or Central.",
        'ta': "🧐 '{query}' க்கு நேரடி பொருத்தம் கிடைக்கவில்லை. எழுத்துப்பிழையை சரிபார்க்கவும் அல்லது CMBT, கின்டி, சென்ட்ரல் போன்ற முக்கிய நிறுத்தங்களை பயன்படுத்தவும்.",
        'hi': "🧐 '{query}' के लिए कोई सीधा मिलान नहीं मिला। वर्तनी जांचें या CMBT, गिंडी, सेंट्रल जैसे प्रमुख स्टॉप का उपयोग करें।",
        'te': "🧐 '{query}' కి నేరుగా సరిపోలిక దొరకలేదు. స్పెల్లింగ్ తనిఖీ చేయండి లేదా CMBT, గిండి, సెంట్రల్ వంటి ప్రధాన స్టాప్‌లను ఉపయోగించండి.",
        'ml': "🧐 '{query}' ന് നേരിട്ടുള്ള പൊരുത്തം കണ്ടെത്തിയില്ല. സ്പെല്ലിംഗ് പരിശോധിക്കുക അല്ലെങ്കിൽ CMBT, ഗിണ്ടി, സെൻട്രൽ പോലുള്ള പ്രധാന സ്റ്റോപ്പുകൾ ഉപയോഗിക്കുക.",
        'kn': "🧐 '{query}' ಗೆ ನೇರ ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ. ಕಾಗುಣಿತ ಪರಿಶೀಲಿಸಿ ಅಥವಾ CMBT, ಗಿಂಡಿ, ಸೆಂಟ್ರಲ್ ನಂತಹ ಪ್ರಮುಖ ನಿಲ್ದಾಣಗಳನ್ನು ಬಳಸಿ.",
    },
    'bus_db_error': {
        'en': "⚠️ Bus database not loaded.",
        'ta': "⚠️ பேருந்து தரவுத்தளம் ஏற்றப்படவில்லை.",
        'hi': "⚠️ बस डेटाबेस लोड नहीं हुआ।",
        'te': "⚠️ బస్ డేటాబేస్ లోడ్ కాలేదు.",
        'ml': "⚠️ ബസ് ഡാറ്റാബേസ് ലോഡ് ആയില്ല.",
        'kn': "⚠️ ಬಸ್ ಡೇಟಾಬೇಸ್ ಲೋಡ್ ಆಗಲಿಲ್ಲ.",
    },
    'frequency_high':   {'en': 'High',   'ta': 'உயர்',        'hi': 'उच्च',     'te': 'అధిక',    'ml': 'ഉയർന്ന',   'kn': 'ಉನ್ನತ'},
    'frequency_normal': {'en': 'Normal', 'ta': 'இயல்பானது',  'hi': 'सामान्य',  'te': 'సాధారణ',  'ml': 'സാധാരണ',  'kn': 'ಸಾಮಾನ್ಯ'},
    'language_set': {
        'en': "✅ Language set to {lang_name}. How can I help you?",
        'ta': "✅ மொழி {lang_name} ஆக அமைக்கப்பட்டது. நான் எவ்வாறு உதவலாம்?",
        'hi': "✅ भाषा {lang_name} पर सेट की गई। मैं आपकी कैसे सहायता कर सकता हूं?",
        'te': "✅ భాష {lang_name} కి సెట్ చేయబడింది. నేను మీకు ఎలా సహాయం చేయగలను?",
        'ml': "✅ ഭാഷ {lang_name} ആക്കി സജ്ജീകരിച്ചു. ഞാൻ എങ്ങനെ സഹായിക്കാം?",
        'kn': "✅ ಭಾಷೆ {lang_name} ಗೆ ಹೊಂದಿಸಲಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    },
}

LANGUAGE_DISPLAY_NAMES = {
    'en': {'en': 'English',   'ta': 'ஆங்கிலம்', 'hi': 'अंग्रेजी', 'te': 'ఇంగ్లీష్',  'ml': 'ഇംഗ്ലീഷ്',  'kn': 'ಇಂಗ್ಲಿಷ್'},
    'ta': {'en': 'Tamil',     'ta': 'தமிழ்',    'hi': 'तमिल',     'te': 'తమిళం',     'ml': 'തമിഴ്',     'kn': 'ತಮಿಳು'},
    'hi': {'en': 'Hindi',     'ta': 'இந்தி',    'hi': 'हिंदी',    'te': 'హిందీ',     'ml': 'ഹിന്ദി',    'kn': 'ಹಿಂದಿ'},
    'te': {'en': 'Telugu',    'ta': 'தெலுங்கு', 'hi': 'तेलुगु',   'te': 'తెలుగు',    'ml': 'തെലുഗു',    'kn': 'ತೆಲುಗು'},
    'ml': {'en': 'Malayalam', 'ta': 'மலையாளம்', 'hi': 'मलयालम',   'te': 'మలయాళం',   'ml': 'മലയാളം',    'kn': 'ಮಲಯಾಳಂ'},
    'kn': {'en': 'Kannada',   'ta': 'கன்னடம்',  'hi': 'कन्नड़',   'te': 'కన్నడం',    'ml': 'കന്നഡ',     'kn': 'ಕನ್ನಡ'},
}

# All language-change trigger keywords across all 6 scripts
LANGUAGE_KEYWORDS = {
    'english': 'en',    'tamil': 'ta',     'hindi': 'hi',
    'telugu': 'te',     'malayalam': 'ml', 'kannada': 'kn',
    'ஆங்கிலம்': 'en',  'தமிழ்': 'ta',    'இந்தி': 'hi',
    'தெலுங்கு': 'te',  'மலையாளம்': 'ml', 'கன்னடம்': 'kn',
    'अंग्रेजी': 'en',  'तमिल': 'ta',     'हिंदी': 'hi',
    'तेलुगु': 'te',    'मलयालम': 'ml',   'कन्नड़': 'kn',
    'ఇంగ్లీష్': 'en',  'తమిళం': 'ta',    'హిందీ': 'hi',
    'తెలుగు': 'te',    'మలయాళం': 'ml',   'కన్నడం': 'kn',
    'ഇംഗ്ലീഷ്': 'en',  'തമിഴ്': 'ta',    'ഹിന്ദി': 'hi',
    'തെലുഗു': 'te',    'മലയാളം': 'ml',   'കന്നഡ': 'kn',
    'ಇಂಗ್ಲಿಷ್': 'en',  'ತಮಿಳು': 'ta',    'ಹಿಂದಿ': 'hi',
    'ತೆಲುಗು': 'te',    'ಮಲಯಾಳಂ': 'ml',   'ಕನ್ನಡ': 'kn',
}

# Keys whose VALUES should not be translated (proper nouns / IDs)
NO_TRANSLATE_VALUE_KEYS = {'id', 'url', 'bus_number', 'source', 'destination', 'via'}


# --------------------------------------------------
# UTILITY FUNCTIONS
# --------------------------------------------------
def safe_translate_to_english(text):
    try:
        result = translator_instance.translate_to_english(text)
        if isinstance(result, tuple) and len(result) == 2:
            return result[0] or text, result[1] or 'en'
        return str(result), 'en'
    except Exception as e:
        logger.error(f"safe_translate_to_english error: {e}")
        return text, 'en'


def safe_translate_from_english(text, lang):
    if not text or lang == 'en':
        return text
    try:
        result = translator_instance.translate_from_english(str(text), lang)
        return result if result else text
    except Exception as e:
        logger.error(f"safe_translate_from_english error: {e}")
        return text


def get_user_language(tracker):
    try:
        lang = tracker.get_slot("user_language")
        return lang if lang in FIELD_LABELS else 'en'
    except Exception as e:
        logger.error(f"Error getting user language: {e}")
        return 'en'


def get_ui_message(key, lang, **kwargs):
    messages = UI_MESSAGES.get(key, {})
    template = messages.get(lang, messages.get('en', ''))
    if kwargs and template:
        try:
            return template.format(**kwargs)
        except KeyError:
            return template
    return template


def get_category_label(category_en, lang):
    if lang == 'en':
        return category_en
    return CATEGORY_LABELS.get(category_en, {}).get(lang, category_en)


def get_best_match(text, choices, threshold=70):
    if not text or not choices:
        return None
    result = process.extractOne(text, choices, scorer=fuzz.token_set_ratio)
    if not result:
        return text
    match, score = result
    return match if score >= threshold else text


def extract_entities(query):
    query = query.lower().strip()
    entities = {"bus_no": None, "src": None, "dest": None, "via": None}
    bus_match = re.search(r'\b([a-z]?\d+[a-z]?)\b', query)
    if bus_match:
        entities["bus_no"] = bus_match.group(1).upper()
    from_match = re.search(r'from\s+([\w\s]+?)(?=\s+to|\s+via|$)', query)
    to_match   = re.search(r'to\s+([\w\s]+?)(?=\s+from|\s+via|$)', query)
    via_match  = re.search(r'via\s+([\w\s]+?)(?=\s+from|\s+to|$)', query)
    if from_match: entities["src"]  = get_best_match(from_match.group(1).strip(), all_locations)
    if to_match:   entities["dest"] = get_best_match(to_match.group(1).strip(), all_locations)
    if via_match:  entities["via"]  = get_best_match(via_match.group(1).strip(), all_locations)
    if not any([entities["src"], entities["dest"], entities["bus_no"], entities["via"]]):
        entities["via"] = get_best_match(query, all_locations)
    return entities


# --------------------------------------------------
# CARD TRANSLATION
# --------------------------------------------------
def translate_field_label(key: str, lang: str) -> str:
    key_lower = key.lower().strip()
    lang_map = FIELD_LABELS.get(lang, FIELD_LABELS['en'])
    return lang_map.get(key_lower, lang_map.get(key_lower.replace(' ', '_'), key))


def translate_card_results(results: list, lang: str) -> list:
    if lang == 'en' or not results:
        return results
    translated = []
    for item in results:
        new_item = {}
        for key, value in item.items():
            translated_key = translate_field_label(key, lang)
            key_lower = key.lower().strip()
            if key_lower in NO_TRANSLATE_VALUE_KEYS or not str(value).strip():
                new_item[translated_key] = value
            else:
                new_item[translated_key] = safe_translate_from_english(str(value), lang)
        translated.append(new_item)
    return translated


def send_card_results(dispatcher, user_query, english_query, results, category_en, lang='en'):
    try:
        category_localised = get_category_label(category_en, lang)
        if not results:
            dispatcher.utter_message(
                text=get_ui_message('no_results', lang, query=user_query, category=category_localised)
            )
            return []
        dispatcher.utter_message(
            text=get_ui_message('found_results', lang, count=len(results), query=user_query, category=category_localised)
        )
        dispatcher.utter_message(json_message={
            "display_type": "card_list",
            "data": translate_card_results(results, lang),
            "language": lang
        })
        return []
    except Exception as e:
        logger.error(f"send_card_results error: {e}")
        dispatcher.utter_message(text=f"Found {len(results) if results else 0} results.")
        return []


# --------------------------------------------------
# LANGUAGE SELECTION ACTION
# --------------------------------------------------
class ActionSetLanguage(Action):
    def name(self): return "action_set_language"

    def run(self, dispatcher, tracker, domain):
        user_message = tracker.latest_message.get("text", "")

        selected_lang = 'en'
        for keyword, lang_code in LANGUAGE_KEYWORDS.items():
            if keyword.lower() in user_message.lower():
                selected_lang = lang_code
                break

        lang_display = LANGUAGE_DISPLAY_NAMES.get(selected_lang, {}).get(selected_lang, selected_lang.upper())

        dispatcher.utter_message(
            text=get_ui_message('language_set', selected_lang, lang_name=lang_display)
        )

        dispatcher.utter_message(json_message={
            "type": "language_change",
            "lang": selected_lang,
            "lang_name": lang_display
        })

        return [SlotSet("user_language", selected_lang)]


# --------------------------------------------------
# BUS SEARCH ACTION
# --------------------------------------------------
class ActionSearchBus(Action):
    def name(self): return "action_search_bus"

    def run(self, dispatcher, tracker, domain):
        try:
            user_query = tracker.latest_message.get("text", "")
            user_lang  = get_user_language(tracker)
            events     = []

            english_query, detected_lang = safe_translate_to_english(user_query)

            if detected_lang and detected_lang in FIELD_LABELS and detected_lang != 'en':
                if user_lang != detected_lang:
                    events.append(SlotSet("user_language", detected_lang))
                    user_lang = detected_lang

            if bus_data.empty:
                dispatcher.utter_message(text=get_ui_message('bus_db_error', user_lang))
                return events

            ent = extract_entities(english_query)
            df  = bus_data.copy()

            if ent.get("bus_no"):
                df = df[df["Bus Number"].astype(str).str.contains(
                    rf"\b{re.escape(ent['bus_no'])}\b", case=False, regex=True, na=False
                )]
            if ent.get("src"):
                s = ent["src"]
                df = df[
                    df["Starting Point"].str.contains(s, case=False, na=False) |
                    df["Ending Point"].str.contains(s, case=False, na=False) |
                    df["Via"].str.contains(s, case=False, na=False)
                ]
            if ent.get("dest"):
                d = ent["dest"]
                df = df[
                    df["Starting Point"].str.contains(d, case=False, na=False) |
                    df["Ending Point"].str.contains(d, case=False, na=False) |
                    df["Via"].str.contains(d, case=False, na=False)
                ]
            if ent.get("via"):
                df = df[df["Via"].str.contains(ent["via"], case=False, na=False)]

            if df.empty:
                dispatcher.utter_message(
                    text=get_ui_message('bus_not_found', user_lang, query=user_query)
                )
                return events

            freq_high   = UI_MESSAGES['frequency_high'].get(user_lang, 'High')
            freq_normal = UI_MESSAGES['frequency_normal'].get(user_lang, 'Normal')

            results = []
            for _, row in df.head(10).iterrows():
                results.append({
                    "bus_number":  str(row["Bus Number"]),
                    "source":      row["Starting Point"],
                    "destination": row["Ending Point"],
                    "via":         row["Via"],
                    "frequency":   freq_high if str(row.get("High Frequency Route", "")).lower() == "x" else freq_normal,
                })

            dispatcher.utter_message(text=get_ui_message('bus_found', user_lang, count=len(df)))
            dispatcher.utter_message(json_message={
                "display_type": "card_list",
                "data": translate_card_results(results, user_lang),
                "language": user_lang
            })
            return events

        except Exception as e:
            logger.error(f"ActionSearchBus error: {e}")
            dispatcher.utter_message(text="An error occurred while searching for buses.")
            return []


# --------------------------------------------------
# GENERIC SEARCH ACTION FACTORY
# --------------------------------------------------
def _make_search_action(action_name, json_file, category_label_en):
    class GenericSearchAction(Action):
        def name(self):
            return action_name

        def run(self, dispatcher, tracker, domain):
            try:
                user_query    = tracker.latest_message.get("text", "")
                user_lang     = get_user_language(tracker)
                english_query, detected_lang = safe_translate_to_english(user_query)

                events = []
                if detected_lang and detected_lang in FIELD_LABELS and detected_lang != 'en':
                    if user_lang != detected_lang:
                        events.append(SlotSet("user_language", detected_lang))
                        user_lang = detected_lang

                results = search(english_query, json_file)
                return send_card_results(
                    dispatcher,
                    user_query=user_query,
                    english_query=english_query,
                    results=results,
                    category_en=category_label_en,
                    lang=user_lang
                ) + events

            except Exception as e:
                logger.error(f"{action_name} error: {e}")
                dispatcher.utter_message(
                    text=safe_translate_from_english(
                        f"An error occurred while searching for {category_label_en} information.",
                        get_user_language(tracker)
                    )
                )
                return []

    GenericSearchAction.__name__ = action_name
    return GenericSearchAction


# --------------------------------------------------
# ACTION REGISTRATIONS
# --------------------------------------------------
ActionSearchEducation     = _make_search_action("action_search_education",      "actions/education_list.json",          "Education")
ActionSearchExams         = _make_search_action("action_search_exams",          "actions/exams_structured.json",        "Exams")
ActionSearchPassports     = _make_search_action("action_search_passports",      "actions/passports_structured.json",    "Passports")
ActionSearchTax           = _make_search_action("action_search_tax",            "actions/tax_structured.json",          "Tax")
ActionSearchCertificates  = _make_search_action("action_search_certificates",   "actions/birthdeath_structured.json",   "Certificates")
ActionSearchSports        = _make_search_action("action_search_sports",         "actions/sports_structured.json",       "Sports")
ActionSearchAgriculture   = _make_search_action("action_search_agriculture",    "actions/agriculture_structured.json",  "Agriculture")
ActionSearchBusiness      = _make_search_action("action_search_business",       "actions/business_structured.json",     "Business")
ActionSearchElectricity   = _make_search_action("action_search_electricity",    "actions/electricity_structured.json",  "Electricity")
ActionSearchHealth        = _make_search_action("action_search_health",         "actions/health_structured.json",       "Health")
ActionSearchHousing       = _make_search_action("action_search_housing",        "actions/housing_structured.json",      "Housing")
ActionSearchJobs          = _make_search_action("action_search_jobs",           "actions/jobs_structured.json",         "Jobs")
ActionSearchJustice       = _make_search_action("action_search_justice",        "actions/justice_structured.json",      "Justice")
ActionSearchLocal         = _make_search_action("action_search_local",          "actions/local_structured.json",        "Local")
ActionSearchLpgServices   = _make_search_action("action_search_lpg_services",   "actions/lpg_services_structured.json", "LPG Services")
ActionSearchMoneyBanking  = _make_search_action("action_search_money_banking",  "actions/moneybanking_structured.json", "Money Banking")
ActionSearchMoneyTax      = _make_search_action("action_search_money_tax",      "actions/moneytax_structured.json",     "Money Tax")
ActionSearchPension       = _make_search_action("action_search_pension",        "actions/pension_structured.json",      "Pension")
ActionSearchScienceIt     = _make_search_action("action_search_science_it",     "actions/science_it_structured.json",   "Science IT")
ActionSearchTransport     = _make_search_action("action_search_transport",      "actions/transport_structured.json",    "Transport")
ActionSearchTravelTourism = _make_search_action("action_search_travel_tourism", "actions/traveltourism_structured.json","Travel Tourism")
ActionSearchWater         = _make_search_action("action_search_water",          "actions/water_structured.json",        "Water")
ActionSearchYouth         = _make_search_action("action_search_youth",          "actions/youth_structured.json",        "Youth")