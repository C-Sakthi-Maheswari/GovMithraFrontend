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
    'bn': {
        'id': 'আইডি', 'name': 'নাম', 'url': 'লিঙ্ক',
        'service type': 'সেবার ধরন', 'service_type': 'সেবার ধরন',
        'domain': 'ডোমেইন', 'state': 'রাজ্য',
        'target roles': 'লক্ষ্য ভূমিকা', 'target_roles': 'লক্ষ্য ভূমিকা',
        'eligible categories': 'যোগ্য বিভাগ', 'eligible_categories': 'যোগ্য বিভাগ',
        'tags': 'ট্যাগ', 'description': 'বিবরণ', 'eligibility': 'যোগ্যতা',
        'documents': 'নথিপত্র', 'fee': 'ফি', 'deadline': 'শেষ তারিখ', 'level': 'স্তর',
        'bus_number': 'বাস নম্বর', 'source': 'উৎস', 'destination': 'গন্তব্য',
        'via': 'হয়ে', 'frequency': 'ফ্রিকোয়েন্সি', 'city': 'শহর', 'district': 'জেলা',
    },
    'mr': {
        'id': 'आयडी', 'name': 'नाव', 'url': 'दुवा',
        'service type': 'सेवा प्रकार', 'service_type': 'सेवा प्रकार',
        'domain': 'डोमेन', 'state': 'राज्य',
        'target roles': 'लक्ष्य भूमिका', 'target_roles': 'लक्ष्य भूमिका',
        'eligible categories': 'पात्र श्रेणी', 'eligible_categories': 'पात्र श्रेणी',
        'tags': 'टॅग', 'description': 'वर्णन', 'eligibility': 'पात्रता',
        'documents': 'कागदपत्रे', 'fee': 'शुल्क', 'deadline': 'अंतिम तारीख', 'level': 'स्तर',
        'bus_number': 'बस क्रमांक', 'source': 'सुरुवातीचे ठिकाण', 'destination': 'गंतव्य',
        'via': 'मार्गे', 'frequency': 'वारंवारता', 'city': 'शहर', 'district': 'जिल्हा',
    },
    'gu': {
        'id': 'આઈડી', 'name': 'નામ', 'url': 'લિંક',
        'service type': 'સેવા પ્રકાર', 'service_type': 'સેવા પ્રકાર',
        'domain': 'ડોમેન', 'state': 'રાજ્ય',
        'target roles': 'લક્ષ્ય ભૂમિકાઓ', 'target_roles': 'લક્ષ્ય ભૂમિકાઓ',
        'eligible categories': 'પાત્ર શ્રેણીઓ', 'eligible_categories': 'પાત્ર શ્રેણીઓ',
        'tags': 'ટૅગ', 'description': 'વર્ણન', 'eligibility': 'પાત્રતા',
        'documents': 'દસ્તાવેજો', 'fee': 'ફી', 'deadline': 'છેલ્લી તારીખ', 'level': 'સ્તર',
        'bus_number': 'બસ નંબર', 'source': 'સ્ત્રોત', 'destination': 'ગંતવ્ય',
        'via': 'થઈ', 'frequency': 'આવૃત્તિ', 'city': 'શહેર', 'district': 'જિલ્લો',
    },
    'pa': {
        'id': 'ਆਈਡੀ', 'name': 'ਨਾਮ', 'url': 'ਲਿੰਕ',
        'service type': 'ਸੇਵਾ ਕਿਸਮ', 'service_type': 'ਸੇਵਾ ਕਿਸਮ',
        'domain': 'ਡੋਮੇਨ', 'state': 'ਰਾਜ',
        'target roles': 'ਟੀਚਾ ਭੂਮਿਕਾਵਾਂ', 'target_roles': 'ਟੀਚਾ ਭੂਮਿਕਾਵਾਂ',
        'eligible categories': 'ਯੋਗ ਸ਼੍ਰੇਣੀਆਂ', 'eligible_categories': 'ਯੋਗ ਸ਼੍ਰੇਣੀਆਂ',
        'tags': 'ਟੈਗ', 'description': 'ਵੇਰਵਾ', 'eligibility': 'ਯੋਗਤਾ',
        'documents': 'ਦਸਤਾਵੇਜ਼', 'fee': 'ਫੀਸ', 'deadline': 'ਆਖਰੀ ਤਾਰੀਖ', 'level': 'ਪੱਧਰ',
        'bus_number': 'ਬੱਸ ਨੰਬਰ', 'source': 'ਸਰੋਤ', 'destination': 'ਮੰਜ਼ਿਲ',
        'via': 'ਰਾਹੀਂ', 'frequency': 'ਬਾਰੰਬਾਰਤਾ', 'city': 'ਸ਼ਹਿਰ', 'district': 'ਜ਼ਿਲ੍ਹਾ',
    },
    'or': {
        'id': 'ଆଇଡି', 'name': 'ନାମ', 'url': 'ଲିଙ୍କ',
        'service type': 'ସେବା ପ୍ରକାର', 'service_type': 'ସେବା ପ୍ରକାର',
        'domain': 'ଡୋମେନ', 'state': 'ରାଜ୍ୟ',
        'target roles': 'ଲକ୍ଷ୍ୟ ଭୂମିକା', 'target_roles': 'ଲକ୍ଷ୍ୟ ଭୂମିକା',
        'eligible categories': 'ଯୋଗ୍ୟ ବର୍ଗ', 'eligible_categories': 'ଯୋଗ୍ୟ ବର୍ଗ',
        'tags': 'ଟ୍ୟାଗ', 'description': 'ବିବରଣ', 'eligibility': 'ଯୋଗ୍ୟତା',
        'documents': 'ଦଲିଲ', 'fee': 'ଫି', 'deadline': 'ଶେଷ ତାରିଖ', 'level': 'ସ୍ତର',
        'bus_number': 'ବସ ନମ୍ବର', 'source': 'ଉତ୍ସ', 'destination': 'ଗନ୍ତବ୍ୟ',
        'via': 'ଦେଇ', 'frequency': 'ବାରମ୍ବାରତା', 'city': 'ସହର', 'district': 'ଜିଲ୍ଲା',
    },
    'as': {
        'id': 'আইডি', 'name': 'নাম', 'url': 'লিংক',
        'service type': 'সেৱাৰ প্ৰকাৰ', 'service_type': 'সেৱাৰ প্ৰকাৰ',
        'domain': 'ডমেইন', 'state': 'ৰাজ্য',
        'target roles': 'লক্ষ্য ভূমিকা', 'target_roles': 'লক্ষ্য ভূমিকা',
        'eligible categories': 'যোগ্য শ্ৰেণী', 'eligible_categories': 'যোগ্য শ্ৰেণী',
        'tags': 'টেগ', 'description': 'বিৱৰণ', 'eligibility': 'যোগ্যতা',
        'documents': 'নথিপত্ৰ', 'fee': 'মাচুল', 'deadline': 'শেষ তাৰিখ', 'level': 'স্তৰ',
        'bus_number': 'বাছ নম্বৰ', 'source': 'উৎস', 'destination': 'গন্তব্য',
        'via': 'হৈ', 'frequency': 'কম্পাঙ্ক', 'city': 'চহৰ', 'district': 'জিলা',
    },
    'ur': {
        'id': 'آئی ڈی', 'name': 'نام', 'url': 'لنک',
        'service type': 'خدمت کی قسم', 'service_type': 'خدمت کی قسم',
        'domain': 'ڈومین', 'state': 'ریاست',
        'target roles': 'ہدف کردار', 'target_roles': 'ہدف کردار',
        'eligible categories': 'اہل زمرے', 'eligible_categories': 'اہل زمرے',
        'tags': 'ٹیگ', 'description': 'تفصیل', 'eligibility': 'اہلیت',
        'documents': 'دستاویزات', 'fee': 'فیس', 'deadline': 'آخری تاریخ', 'level': 'سطح',
        'bus_number': 'بس نمبر', 'source': 'ذریعہ', 'destination': 'منزل',
        'via': 'سے گزر کر', 'frequency': 'تعدد', 'city': 'شہر', 'district': 'ضلع',
    },
    'mai': {
        'id': 'आईडी', 'name': 'नाम', 'url': 'लिंक',
        'service type': 'सेवाक प्रकार', 'service_type': 'सेवाक प्रकार',
        'domain': 'डोमेन', 'state': 'राज्य',
        'target roles': 'लक्ष्य भूमिका', 'target_roles': 'लक्ष्य भूमिका',
        'eligible categories': 'पात्र श्रेणी', 'eligible_categories': 'पात्र श्रेणी',
        'tags': 'टैग', 'description': 'विवरण', 'eligibility': 'पात्रता',
        'documents': 'दस्तावेज', 'fee': 'शुल्क', 'deadline': 'अंतिम तिथि', 'level': 'स्तर',
        'bus_number': 'बस नम्बर', 'source': 'स्रोत', 'destination': 'गंतव्य',
        'via': 'होइत', 'frequency': 'आवृत्ति', 'city': 'शहर', 'district': 'जिला',
    },
    'kok': {
        'id': 'आयडी', 'name': 'नांव', 'url': 'लिंक',
        'service type': 'सेवेचो प्रकार', 'service_type': 'सेवेचो प्रकार',
        'domain': 'डोमेन', 'state': 'राज्य',
        'target roles': 'लक्ष्य भूमिका', 'target_roles': 'लक्ष्य भूमिका',
        'eligible categories': 'पात्र वर्ग', 'eligible_categories': 'पात्र वर्ग',
        'tags': 'टॅग', 'description': 'वर्णन', 'eligibility': 'पात्रता',
        'documents': 'दस्तावेज', 'fee': 'फी', 'deadline': 'शेवटची तारीख', 'level': 'पातळी',
        'bus_number': 'बस नंबर', 'source': 'उगम', 'destination': 'गंतव्य',
        'via': 'मार्गान', 'frequency': 'वारंवारता', 'city': 'शार', 'district': 'जिल्हो',
    },
    'sd': {
        'id': 'آئي ڊي', 'name': 'نالو', 'url': 'لنڪ',
        'service type': 'خدمت جو قسم', 'service_type': 'خدمت جو قسم',
        'domain': 'ڊومين', 'state': 'رياست',
        'target roles': 'ھدف ڪردار', 'target_roles': 'ھدف ڪردار',
        'eligible categories': 'لائق زمرا', 'eligible_categories': 'لائق زمرا',
        'tags': 'ٽيگ', 'description': 'تفصيل', 'eligibility': 'اھليت',
        'documents': 'دستاويز', 'fee': 'في', 'deadline': 'آخري تاريخ', 'level': 'سطح',
        'bus_number': 'بس نمبر', 'source': 'ذريعو', 'destination': 'منزل',
        'via': 'کان گذري', 'frequency': 'تعداد', 'city': 'شهر', 'district': 'ضلعو',
    },
}

CATEGORY_LABELS = {
    'Education':      {'ta': 'கல்வி',                           'hi': 'शिक्षा',          'te': 'విద్య',         'ml': 'വിദ്യാഭ്യാസം',    'kn': 'ಶಿಕ್ಷಣ',         'bn': 'শিক্ষা',         'mr': 'शिक्षण',       'gu': 'શિક્ષણ',       'pa': 'ਸਿੱਖਿਆ',       'or': 'ଶିକ୍ଷା',        'as': 'শিক্ষা',         'ur': 'تعلیم',          'mai': 'शिक्षा',      'kok': 'शिक्षण',      'sd': 'تعليم'},
    'Exams':          {'ta': 'தேர்வுகள்',                       'hi': 'परीक्षाएं',       'te': 'పరీక్షలు',      'ml': 'പരീക്ഷകൾ',        'kn': 'ಪರೀಕ್ಷೆಗಳು',     'bn': 'পরীক্ষা',        'mr': 'परीक्षा',      'gu': 'પરીક્ષા',      'pa': 'ਪ੍ਰੀਖਿਆਵਾਂ',   'or': 'ପରୀକ୍ଷା',      'as': 'পৰীক্ষা',        'ur': 'امتحانات',       'mai': 'परीक्षा',     'kok': 'परीक्षा',     'sd': 'امتحان'},
    'Passports':      {'ta': 'பாஸ்போர்ட்',                     'hi': 'पासपोर्ट',        'te': 'పాస్‌పోర్ట్',   'ml': 'പാസ്‌പോർട്ട്',    'kn': 'ಪಾಸ್‌ಪೋರ್ಟ್',   'bn': 'পাসপোর্ট',       'mr': 'पासपोर्ट',     'gu': 'પાસપોર્ટ',     'pa': 'ਪਾਸਪੋਰਟ',      'or': 'ପାସପୋର୍ଟ',     'as': 'পাসপোৰ্ট',       'ur': 'پاسپورٹ',        'mai': 'पासपोर्ट',    'kok': 'पासपोर्ट',    'sd': 'پاسپورٽ'},
    'Tax':            {'ta': 'வரி',                              'hi': 'कर',               'te': 'పన్ను',          'ml': 'നികുതി',           'kn': 'ತೆರಿಗೆ',         'bn': 'কর',             'mr': 'कर',           'gu': 'કર',           'pa': 'ਟੈਕਸ',         'or': 'କର',            'as': 'কৰ',             'ur': 'ٹیکس',           'mai': 'कर',          'kok': 'कर',          'sd': 'ٽيڪس'},
    'Certificates':   {'ta': 'சான்றிதழ்கள்',                   'hi': 'प्रमाण पत्र',     'te': 'సర్టిఫికేట్లు', 'ml': 'സർട്ടിഫിക്കറ്റുകൾ','kn': 'ಪ್ರಮಾಣಪತ್ರಗಳು', 'bn': 'সার্টিফিকেট',    'mr': 'प्रमाणपत्रे',  'gu': 'પ્રમાણપત્રો',  'pa': 'ਸਰਟੀਫਿਕੇਟ',    'or': 'ପ୍ରମାଣପତ୍ର',   'as': 'প্ৰমাণপত্ৰ',     'ur': 'سرٹیفکیٹ',      'mai': 'प्रमाण पत्र', 'kok': 'प्रमाणपत्र',  'sd': 'سرٽيفڪيٽ'},
    'Sports':         {'ta': 'விளையாட்டு',                     'hi': 'खेल',              'te': 'క్రీడలు',        'ml': 'കായികം',           'kn': 'ಕ್ರೀಡೆ',         'bn': 'খেলাধুলা',       'mr': 'क्रीडा',       'gu': 'રમતગમત',       'pa': 'ਖੇਡਾਂ',        'or': 'କ୍ରୀଡ଼ା',       'as': 'খেলাধুলা',       'ur': 'کھیل',           'mai': 'खेल',         'kok': 'खेळ',         'sd': 'راند'},
    'Agriculture':    {'ta': 'விவசாயம்',                       'hi': 'कृषि',             'te': 'వ్యవసాయం',      'ml': 'കൃഷി',             'kn': 'ಕೃಷಿ',           'bn': 'কৃষি',           'mr': 'शेती',         'gu': 'કૃષિ',         'pa': 'ਖੇਤੀਬਾੜੀ',     'or': 'କୃଷି',          'as': 'কৃষি',           'ur': 'زراعت',          'mai': 'कृषि',        'kok': 'शेती',        'sd': 'زراعت'},
    'Business':       {'ta': 'வணிகம்',                         'hi': 'व्यवसाय',         'te': 'వ్యాపారం',      'ml': 'ബിസിനസ്',         'kn': 'ವ್ಯಾಪಾರ',        'bn': 'ব্যবসা',         'mr': 'व्यवसाय',      'gu': 'વ્યવસાય',      'pa': 'ਕਾਰੋਬਾਰ',      'or': 'ବ୍ୟବସାୟ',      'as': 'ব্যৱসায়',       'ur': 'کاروبار',        'mai': 'व्यवसाय',     'kok': 'व्यवसाय',     'sd': 'ڪاروبار'},
    'Electricity':    {'ta': 'மின்சாரம்',                      'hi': 'बिजली',            'te': 'విద్యుత్',      'ml': 'വൈദ്യുതി',         'kn': 'ವಿದ್ಯುತ್',      'bn': 'বিদ্যুৎ',        'mr': 'वीज',          'gu': 'વીજળી',        'pa': 'ਬਿਜਲੀ',        'or': 'ବିଦ୍ୟୁତ',       'as': 'বিদ্যুৎ',        'ur': 'بجلی',           'mai': 'बिजली',       'kok': 'वीज',         'sd': 'بجلي'},
    'Health':         {'ta': 'சுகாதாரம்',                      'hi': 'स्वास्थ्य',       'te': 'ఆరోగ్యం',       'ml': 'ആരോഗ്യം',          'kn': 'ಆರೋಗ್ಯ',        'bn': 'স্বাস্থ্য',      'mr': 'आरोग्य',       'gu': 'આરોગ્ય',       'pa': 'ਸਿਹਤ',         'or': 'ସ୍ୱାସ୍ଥ୍ୟ',    'as': 'স্বাস্থ্য',      'ur': 'صحت',            'mai': 'स्वास्थ्य',   'kok': 'आरोग्य',      'sd': 'صحت'},
    'Housing':        {'ta': 'வீட்டுவசதி',                     'hi': 'आवास',             'te': 'గృహనిర్మాణం',   'ml': 'ഭവനം',             'kn': 'ವಸತಿ',           'bn': 'আবাসন',          'mr': 'गृहनिर्माण',   'gu': 'આવાસ',         'pa': 'ਰਿਹਾਇਸ਼',      'or': 'ଗୃହ',           'as': 'আৱাসন',          'ur': 'رہائش',          'mai': 'आवास',        'kok': 'घरकूल',       'sd': 'رهائش'},
    'Jobs':           {'ta': 'வேலைகள்',                        'hi': 'नौकरियां',         'te': 'ఉద్యోగాలు',     'ml': 'ജോലികൾ',           'kn': 'ಉದ್ಯೋಗಗಳು',     'bn': 'চাকরি',          'mr': 'नोकऱ्या',      'gu': 'નોકરીઓ',       'pa': 'ਨੌਕਰੀਆਂ',      'or': 'ଚାକିରି',       'as': 'চাকৰি',          'ur': 'نوکریاں',        'mai': 'नौकरी',       'kok': 'नोकऱ्या',     'sd': 'نوڪريون'},
    'Justice':        {'ta': 'நீதி',                            'hi': 'न्याय',            'te': 'న్యాయం',         'ml': 'നീതി',             'kn': 'ನ್ಯಾಯ',         'bn': 'বিচার',          'mr': 'न्याय',        'gu': 'ન્યાય',        'pa': 'ਨਿਆਂ',         'or': 'ନ୍ୟାୟ',        'as': 'ন্যায়',         'ur': 'انصاف',          'mai': 'न्याय',       'kok': 'न्याय',       'sd': 'انصاف'},
    'Local':          {'ta': 'உள்ளாட்சி',                      'hi': 'स्थानीय',         'te': 'స్థానిక',        'ml': 'പ്രാദേശിക',        'kn': 'ಸ್ಥಳೀಯ',        'bn': 'স্থানীয়',       'mr': 'स्थानिक',      'gu': 'સ્થાનિક',      'pa': 'ਸਥਾਨਕ',        'or': 'ସ୍ଥାନୀୟ',      'as': 'স্থানীয়',       'ur': 'مقامی',          'mai': 'स्थानीय',     'kok': 'स्थानिक',     'sd': 'مقامي'},
    'LPG Services':   {'ta': 'எல்பிஜி சேவைகள்',               'hi': 'एलपीजी सेवाएं',   'te': 'ఎల్‌పీజీ సేవలు', 'ml': 'എൽപിജി സേവനങ്ങൾ',  'kn': 'ಎಲ್‌ಪಿಜಿ ಸೇವೆಗಳು', 'bn': 'এলপিজি সেবা',  'mr': 'एलपीजी सेवा',  'gu': 'એલપીજી સેવા',  'pa': 'ਐਲਪੀਜੀ ਸੇਵਾਵਾਂ', 'or': 'ଏଲ୍‌ପିଜି ସେବା', 'as': 'এলপিজি সেৱা',   'ur': 'ایل پی جی خدمات', 'mai': 'एलपीजी सेवा', 'kok': 'एलपीजी सेवा', 'sd': 'ايل پي جي خدمت'},
    'Money Banking':  {'ta': 'வங்கி சேவைகள்',                 'hi': 'बैंकिंग सेवाएं',  'te': 'బ్యాంకింగ్ సేవలు','ml': 'ബാങ്കിംഗ് സേവനങ്ങൾ','kn': 'ಬ್ಯಾಂಕಿಂಗ್ ಸೇವೆಗಳು', 'bn': 'ব্যাংকিং সেবা', 'mr': 'बँकिंग सेवा',  'gu': 'બેન્કિંગ સેવા', 'pa': 'ਬੈਂਕਿੰਗ ਸੇਵਾਵਾਂ', 'or': 'ବ୍ୟାଙ୍କିଂ ସେବା', 'as': 'বেংকিং সেৱা',  'ur': 'بینکنگ خدمات',   'mai': 'बैंकिंग सेवा', 'kok': 'बँकिंग सेवा', 'sd': 'بينڪنگ خدمت'},
    'Money Tax':      {'ta': 'வரி சேவைகள்',                   'hi': 'कर सेवाएं',        'te': 'పన్ను సేవలు',    'ml': 'നികുതി സേവനങ്ങൾ',  'kn': 'ತೆರಿಗೆ ಸೇವೆಗಳು', 'bn': 'কর সেবা',       'mr': 'कर सेवा',      'gu': 'કર સેવા',      'pa': 'ਟੈਕਸ ਸੇਵਾਵਾਂ', 'or': 'କର ସେବା',      'as': 'কৰ সেৱা',        'ur': 'ٹیکس خدمات',    'mai': 'कर सेवा',     'kok': 'कर सेवा',     'sd': 'ٽيڪس خدمت'},
    'Pension':        {'ta': 'ஓய்வூதியம்',                    'hi': 'पेंशन',            'te': 'పెన్షన్',        'ml': 'പെൻഷൻ',            'kn': 'ಪಿಂಚಣಿ',        'bn': 'পেনশন',          'mr': 'पेन्शन',       'gu': 'પેન્શન',       'pa': 'ਪੈਨਸ਼ਨ',       'or': 'ପେନ୍‌ସନ',       'as': 'পেঞ্চন',         'ur': 'پنشن',           'mai': 'पेंशन',       'kok': 'पेन्शन',      'sd': 'پينشن'},
    'Science IT':     {'ta': 'அறிவியல் தகவல் தொழில்நுட்பம்', 'hi': 'विज्ञान और आईटी', 'te': 'సైన్స్ ఐటీ',     'ml': 'ശാസ്ത്ര ഐടി',      'kn': 'ವಿಜ್ಞಾನ ಐಟಿ',   'bn': 'বিজ্ঞান ও আইটি', 'mr': 'विज्ञान आयटी', 'gu': 'વિજ્ઞાન આઈટી',  'pa': 'ਵਿਗਿਆਨ ਆਈਟੀ', 'or': 'ବିଜ୍ଞାନ ଆଇଟି',  'as': 'বিজ্ঞান আইটি',  'ur': 'سائنس آئی ٹی',  'mai': 'विज्ञान आईटी', 'kok': 'विज्ञान आयटी', 'sd': 'سائنس آئي ٽي'},
    'Transport':      {'ta': 'போக்குவரத்து',                   'hi': 'परिवहन',           'te': 'రవాణా',          'ml': 'ഗതാഗതം',           'kn': 'ಸಾರಿಗೆ',        'bn': 'পরিবহন',         'mr': 'परिवहन',       'gu': 'પરિવહન',       'pa': 'ਆਵਾਜਾਈ',       'or': 'ପରିବହନ',       'as': 'পৰিবহন',         'ur': 'نقل و حمل',      'mai': 'परिवहन',      'kok': 'वाहतूक',      'sd': 'ٽرانسپورٽ'},
    'Travel Tourism': {'ta': 'சுற்றுலா',                       'hi': 'पर्यटन',           'te': 'పర్యటన',         'ml': 'ടൂറിസം',           'kn': 'ಪ್ರವಾಸೋದ್ಯಮ',  'bn': 'পর্যটন',         'mr': 'पर्यटन',       'gu': 'પ્રવાસ',       'pa': 'ਸੈਰ-ਸਪਾਟਾ',    'or': 'ପ୍ରବାସ',        'as': 'পৰ্যটন',         'ur': 'سیاحت',          'mai': 'पर्यटन',      'kok': 'पर्यटन',      'sd': 'سياحت'},
    'Water':          {'ta': 'நீர் சேவைகள்',                   'hi': 'जल सेवाएं',        'te': 'నీటి సేవలు',     'ml': 'ജല സേവനങ്ങൾ',      'kn': 'ನೀರಿನ ಸೇವೆಗಳು', 'bn': 'জল সেবা',        'mr': 'जल सेवा',      'gu': 'જળ સેવા',      'pa': 'ਪਾਣੀ ਸੇਵਾਵਾਂ', 'or': 'ଜଳ ସେବା',      'as': 'জল সেৱা',        'ur': 'پانی کی خدمات', 'mai': 'जल सेवा',     'kok': 'जल सेवा',     'sd': 'پاڻي خدمت'},
    'Youth':          {'ta': 'இளைஞர்',                         'hi': 'युवा',              'te': 'యువత',           'ml': 'യുവജനം',           'kn': 'ಯುವಜನ',         'bn': 'যুব',            'mr': 'युवा',         'gu': 'યુવા',         'pa': 'ਨੌਜਵਾਨ',       'or': 'ଯୁବ',           'as': 'যুৱ',            'ur': 'نوجوان',         'mai': 'युवा',        'kok': 'युवा',        'sd': 'نوجوان'},
    'Bus':            {'ta': 'பேருந்து',                        'hi': 'बस',               'te': 'బస్సు',          'ml': 'ബസ്',              'kn': 'ಬಸ್',           'bn': 'বাস',            'mr': 'बस',           'gu': 'બસ',           'pa': 'ਬੱਸ',          'or': 'ବସ',            'as': 'বাছ',            'ur': 'بس',             'mai': 'बस',          'kok': 'बस',          'sd': 'بس'},
}

UI_MESSAGES = {
    'found_results': {
        'en':  "I found {count} results for '{query}' in {category}:",
        'ta':  "'{query}' க்கான {count} முடிவுகளை {category} இல் கண்டேன்:",
        'hi':  "मुझे '{query}' के लिए {category} में {count} परिणाम मिले:",
        'te':  "'{query}' కోసం {category} లో {count} ఫలితాలు కనుగొన్నాను:",
        'ml':  "'{query}' നായി {category} ൽ {count} ഫലങ്ങൾ കണ്ടെത്തി:",
        'kn':  "'{query}' ಗಾಗಿ {category} ನಲ್ಲಿ {count} ಫಲಿತಾಂಶಗಳು ಸಿಕ್ಕಿವೆ:",
        'bn':  "'{query}' এর জন্য {category} তে {count} ফলাফল পাওয়া গেছে:",
        'mr':  "'{query}' साठी {category} मध्ये {count} निकाल सापडले:",
        'gu':  "'{query}' માટે {category} માં {count} પરિણામો મળ્યા:",
        'pa':  "'{query}' ਲਈ {category} ਵਿੱਚ {count} ਨਤੀਜੇ ਮਿਲੇ:",
        'or':  "'{query}' ପାଇଁ {category} ରେ {count} ଫଳାଫଳ ମିଳିଲା:",
        'as':  "'{query}' ৰ বাবে {category} ত {count} ফলাফল পোৱা গৈছে:",
        'ur':  "'{query}' کے لیے {category} میں {count} نتائج ملے:",
        'mai': "'{query}' लेल {category} मे {count} परिणाम भेटल:",
        'kok': "'{query}' साठी {category} मध्ये {count} निकाल मेळ्ळे:",
        'sd':  "'{query}' لاءِ {category} ۾ {count} نتيجا مليا:",
    },
    'no_results': {
        'en':  "❌ No {category} information found for '{query}'.",
        'ta':  "❌ '{query}' க்கான {category} தகவல் எதுவும் கிடைக்கவில்லை.",
        'hi':  "❌ '{query}' के लिए {category} में कोई जानकारी नहीं मिली।",
        'te':  "❌ '{query}' కోసం {category} సమాచారం ఏదీ కనుగొనలేదు.",
        'ml':  "❌ '{query}' నায i {category} వివรారం ఏదీ కనుగొనలేదు.",
        'kn':  "❌ '{query}' ಗಾಗಿ {category} ಮಾಹಿತಿ ಏನೂ ಸಿಗಲಿಲ್ಲ.",
        'bn':  "❌ '{query}' এর জন্য {category} তথ্য পাওয়া যায়নি।",
        'mr':  "❌ '{query}' साठी {category} माहिती आढळली नाही.",
        'gu':  "❌ '{query}' માટે {category} માહિતી મળી નથી.",
        'pa':  "❌ '{query}' ਲਈ {category} ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ।",
        'or':  "❌ '{query}' ପାଇଁ {category} ତଥ୍ୟ ମିଳିଲା ନାହିଁ।",
        'as':  "❌ '{query}' ৰ বাবে {category} তথ্য পোৱা নগ'ল।",
        'ur':  "❌ '{query}' کے لیے {category} کی معلومات نہیں ملیں۔",
        'mai': "❌ '{query}' लेल {category} जानकारी नहि भेटल।",
        'kok': "❌ '{query}' साठी {category} माहिती सापडली ना.",
        'sd':  "❌ '{query}' لاءِ {category} معلومات نه مليون.",
    },
    'bus_found': {
        'en':  "🚌 Found {count} route(s). Here are the top matches:",
        'ta':  "🚌 {count} வழி(கள்) கண்டறியப்பட்டது. சிறந்த போட்டிகள் இங்கே:",
        'hi':  "🚌 {count} मार्ग मिले। शीर्ष परिणाम यहां हैं:",
        'te':  "🚌 {count} మార్గాలు కనుగొనబడ్డాయి. అగ్ర ఫలితాలు ఇక్కడ ఉన్నాయి:",
        'ml':  "🚌 {count} റൂട്ടുകൾ കണ്ടെത്തി. മികച്ച ഫലങ്ങൾ ഇവിടെ:",
        'kn':  "🚌 {count} ಮಾರ್ಗಗಳು ಸಿಕ್ಕಿವೆ. ಮೇಲ್ಭಾಗದ ಫಲಿತಾಂಶಗಳು ಇಲ್ಲಿವೆ:",
        'bn':  "🚌 {count}টি রুট পাওয়া গেছে। শীর্ষ ফলাফল এখানে:",
        'mr':  "🚌 {count} मार्ग सापडले. शीर्ष निकाल येथे:",
        'gu':  "🚌 {count} રૂટ મળ્યા. ટોચના પરિણામો અહીં છે:",
        'pa':  "🚌 {count} ਰੂਟ ਮਿਲੇ। ਚੋਟੀ ਦੇ ਨਤੀਜੇ ਇੱਥੇ ਹਨ:",
        'or':  "🚌 {count}ଟି ରୁଟ ମିଳିଲା। ଶୀର୍ଷ ଫଳାଫଳ ଏଠାରେ:",
        'as':  "🚌 {count}টা ৰুট পোৱা গৈছে। শীৰ্ষ ফলাফলসমূহ ইয়াত:",
        'ur':  "🚌 {count} راستے ملے۔ ٹاپ نتائج یہاں ہیں:",
        'mai': "🚌 {count} रूट भेटल। शीर्ष परिणाम एतय अछि:",
        'kok': "🚌 {count} मार्ग मेळ्ळे. शीर्ष निकाल हांगा आसात:",
        'sd':  "🚌 {count} رستا مليا. مٿيان نتيجا هتي آهن:",
    },
    'bus_not_found': {
        'en':  "🧐 I couldn't find a direct match for '{query}'. Try checking the spelling or use a major stop like CMBT, Guindy, or Central.",
        'ta':  "🧐 '{query}' க்கு நேரடி பொருத்தம் கிடைக்கவில்லை. எழுத்துப்பிழையை சரிபார்க்கவும் அல்லது CMBT, கின்டி, சென்ட்ரல் போன்ற முக்கிய நிறுத்தங்களை பயன்படுத்தவும்.",
        'hi':  "🧐 '{query}' के लिए कोई सीधा मिलान नहीं मिला। वर्तनी जांचें या CMBT, गिंडी, सेंट्रल जैसे प्रमुख स्टॉप का उपयोग करें।",
        'te':  "🧐 '{query}' కి నేరుగా సరిపోలిక దొరకలేదు. స్పెల్లింగ్ తనిఖీ చేయండి లేదా CMBT, గిండి, సెంట్రల్ వంటి ప్రధాన స్టాప్‌లను ఉపయోగించండి.",
        'ml':  "🧐 '{query}' ന് നേരിട്ടുള്ള പൊരുത്തം കണ്ടെത്തിയില്ല. സ്പെല്ലിംഗ് പരിശോധിക്കുക അല്ലെങ്കിൽ CMBT, ഗിണ്ടി, സെൻട്രൽ പോലുള്ള പ്രധാന സ്റ്റോപ്പുകൾ ഉപയോഗിക്കുക.",
        'kn':  "🧐 '{query}' ಗೆ ನೇರ ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ. ಕಾಗುಣಿತ ಪರಿಶೀಲಿಸಿ ಅಥವಾ CMBT, ಗಿಂಡಿ, ಸೆಂಟ್ರಲ್ ನಂತಹ ಪ್ರಮುಖ ನಿಲ್ದಾಣಗಳನ್ನು ಬಳಸಿ.",
        'bn':  "🧐 '{query}' এর জন্য কোনো সরাসরি মিল পাওয়া যায়নি। বানান পরীক্ষা করুন বা CMBT, Guindy বা Central এর মতো প্রধান স্টপ ব্যবহার করুন।",
        'mr':  "🧐 '{query}' साठी थेट जुळणी सापडली नाही। स्पेलिंग तपासा किंवा CMBT, Guindy किंवा Central सारखे प्रमुख थांबे वापरा।",
        'gu':  "🧐 '{query}' માટે સીધો મેળ મળ્યો નહિ. સ્પેલિંગ તપાસો અથવા CMBT, Guindy અથવા Central જેવા મુખ્ય સ્ટોપ વાપરો.",
        'pa':  "🧐 '{query}' ਲਈ ਸਿੱਧਾ ਮੇਲ ਨਹੀਂ ਮਿਲਿਆ। ਸਪੈਲਿੰਗ ਜਾਂਚੋ ਜਾਂ CMBT, Guindy ਜਾਂ Central ਵਰਗੇ ਮੁੱਖ ਸਟਾਪ ਵਰਤੋ।",
        'or':  "🧐 '{query}' ପାଇଁ ସିଧା ମିଳ ମିଳିଲା ନାହିଁ। ବନାନ ଯାଞ୍ଚ କରନ୍ତୁ ବା CMBT, Guindy ବା Central ଭଳି ମୁଖ୍ୟ ଷ୍ଟପ ବ୍ୟବହାର କରନ୍ତୁ।",
        'as':  "🧐 '{query}' ৰ বাবে প্ৰত্যক্ষ মিল পোৱা নগ'ল। বানান পৰীক্ষা কৰক বা CMBT, Guindy বা Central ৰ দৰে মুখ্য ষ্টপ ব্যৱহাৰ কৰক।",
        'ur':  "🧐 '{query}' کے لیے کوئی براہ راست مماثلت نہیں ملی۔ ہجے چیک کریں یا CMBT، Guindy یا Central جیسے بڑے اسٹاپ استعمال کریں۔",
        'mai': "🧐 '{query}' लेल कोनो सीधा मेल नहि भेटल। वर्तनी जाँचू वा CMBT, Guindy वा Central जकाँ प्रमुख स्टॉप उपयोग करू।",
        'kok': "🧐 '{query}' साठी थेट जुळणी मेळ्ळी ना. स्पेलिंग तपासात किंवा CMBT, Guindy किंवा Central सारके मुखेल थांबे वापरात.",
        'sd':  "🧐 '{query}' لاءِ سڌي ميچ نه ملي. اسپيلنگ چيڪ ڪريو يا CMBT، Guindy يا Central جهڙا وڏا اسٽاپ استعمال ڪريو.",
    },
    'bus_db_error': {
        'en':  "⚠️ Bus database not loaded.",
        'ta':  "⚠️ பேருந்து தரவுத்தளம் ஏற்றப்படவில்லை.",
        'hi':  "⚠️ बस डेटाबेस लोड नहीं हुआ।",
        'te':  "⚠️ బస్ డేటాబేస్ లోడ్ కాలేదు.",
        'ml':  "⚠️ ബസ് ഡാറ്റാബേസ് ലോഡ് ആയില്ല.",
        'kn':  "⚠️ ಬಸ್ ಡೇಟಾಬೇಸ್ ಲೋಡ್ ಆಗಲಿಲ್ಲ.",
        'bn':  "⚠️ বাস ডেটাবেস লোড হয়নি।",
        'mr':  "⚠️ बस डेटाबेस लोड झाला नाही.",
        'gu':  "⚠️ બસ ડેટાબેઝ લોડ થઈ નથી.",
        'pa':  "⚠️ ਬੱਸ ਡੇਟਾਬੇਸ ਲੋਡ ਨਹੀਂ ਹੋਇਆ।",
        'or':  "⚠️ ବସ ଡାଟାବେସ ଲୋଡ ହୋଇନାହିଁ।",
        'as':  "⚠️ বাছ ডেটাবেছ লোড হোৱা নাই।",
        'ur':  "⚠️ بس ڈیٹا بیس لوڈ نہیں ہوا۔",
        'mai': "🧐 बस डेटाबेस लोड नहि भेल।",
        'kok': "⚠️ बस डेटाबेस लोड जालो ना.",
        'sd':  "⚠️ بس ڊيٽابيس لوڊ نه ٿيو.",
    },
    'frequency_high':   {'en': 'High',   'ta': 'உயர்',        'hi': 'उच्च',     'te': 'అధిక',    'ml': 'ഉയർന്ന',   'kn': 'ಉನ್ನತ',    'bn': 'উচ্চ',     'mr': 'उच्च',     'gu': 'ઉચ્ચ',     'pa': 'ਉੱਚ',      'or': 'ଉଚ୍ଚ',     'as': 'উচ্চ',      'ur': 'زیادہ',    'mai': 'उच्च',    'kok': 'उच्च',    'sd': 'اعلي'},
    'frequency_normal': {'en': 'Normal', 'ta': 'இயல்பானது',  'hi': 'सामान्य',  'te': 'సాధారణ',  'ml': 'സാധാരണ',  'kn': 'ಸಾಮಾನ್ಯ', 'bn': 'স্বাভাবিক', 'mr': 'सामान्य',  'gu': 'સામાન્ય',  'pa': 'ਸਾਧਾਰਨ',   'or': 'ସ୍ୱାଭାବିକ', 'as': 'সাধাৰণ',   'ur': 'معمول',    'mai': 'सामान्य', 'kok': 'सामान्य', 'sd': 'عام'},
    'language_set': {
        'en':  "✅ Language set to {lang_name}. How can I help you?",
        'ta':  "✅ மொழி {lang_name} ஆக அமைக்கப்பட்டது. நான் எவ்வாறு உதவலாம்?",
        'hi':  "✅ भाषा {lang_name} पर सेट की गई। मैं आपकी कैसे सहायता कर सकता हूं?",
        'te':  "✅ భాష {lang_name} కి సెట్ చేయబడింది. నేను మీకు ఎలా సహాయం చేయగలను?",
        'ml':  "✅ ഭാഷ {lang_name} ആക്കി സജ്ജീകരിച്ചു. ഞാൻ എങ്ങനെ സഹായിക്കാം?",
        'kn':  "✅ ಭಾಷೆ {lang_name} ಗೆ ಹೊಂದಿಸಲಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
        'bn':  "✅ ভাষা {lang_name} এ সেট করা হয়েছে। আমি কীভাবে সাহায্য করতে পারি?",
        'mr':  "✅ भाषा {lang_name} वर सेट केली. मी तुम्हाला कशी मदत करू?",
        'gu':  "✅ ભાષા {lang_name} પર સેટ કરવામાં આવી. હું કેવી રીતે મદદ કરી શકું?",
        'pa':  "✅ ਭਾਸ਼ਾ {lang_name} 'ਤੇ ਸੈੱਟ ਕੀਤੀ ਗਈ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
        'or':  "✅ ଭାଷା {lang_name} ରେ ସେଟ ହେଲା। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
        'as':  "✅ ভাষা {lang_name} ত সেট কৰা হৈছে। মই কেনেকৈ সহায় কৰিব পাৰোঁ?",
        'ur':  "✅ زبان {lang_name} پر سیٹ کر دی گئی۔ میں آپ کی کیسے مدد کر سکتا ہوں؟",
        'mai': "✅ भाषा {lang_name} पर सेट भेल। हम अहाँक केना सहायता क' सकैत छी?",
        'kok': "✅ भाषा {lang_name} वर सेट केली. हांव तुमकां कसो मदत करूं?",
        'sd':  "✅ ٻولي {lang_name} تي سيٽ ڪئي وئي. مان توهان جي ڪيئن مدد ڪري سگهان ٿو؟",
    },
}

LANGUAGE_DISPLAY_NAMES = {
    'en':  {'en': 'English',   'ta': 'ஆங்கிலம்', 'hi': 'अंग्रेजी', 'te': 'ఇంగ్లీష్',  'ml': 'ഇംഗ്ലീഷ്',  'kn': 'ಇಂಗ್ಲಿಷ್',  'bn': 'ইংরেজি',    'mr': 'इंग्रजी',   'gu': 'અંગ્રેજી',  'pa': 'ਅੰਗਰੇਜ਼ੀ',  'or': 'ଇଂରାଜୀ',   'as': 'ইংৰাজী',    'ur': 'انگریزی',   'mai': 'अंग्रेजी', 'kok': 'इंग्रजी',  'sd': 'انگريزي'},
    'ta':  {'en': 'Tamil',     'ta': 'தமிழ்',    'hi': 'तमिल',     'te': 'తమిళం',     'ml': 'തമിഴ്',     'kn': 'ತಮಿಳು',     'bn': 'তামিল',     'mr': 'तमिळ',      'gu': 'તમિળ',      'pa': 'ਤਮਿਲ',      'or': 'ତାମିଲ',    'as': 'তামিল',     'ur': 'تامل',      'mai': 'तमिल',     'kok': 'तमीळ',     'sd': 'تامل'},
    'hi':  {'en': 'Hindi',     'ta': 'இந்தி',    'hi': 'हिंदी',    'te': 'హిందీ',     'ml': 'ഹിന്ദി',    'kn': 'ಹಿಂದಿ',     'bn': 'হিন্দি',    'mr': 'हिंदी',     'gu': 'હિન્દી',    'pa': 'ਹਿੰਦੀ',     'or': 'ହିନ୍ଦୀ',   'as': 'হিন্দী',    'ur': 'ہندی',      'mai': 'हिंदी',    'kok': 'हिंदी',    'sd': 'هندي'},
    'te':  {'en': 'Telugu',    'ta': 'தெலுங்கு', 'hi': 'तेलुगु',   'te': 'తెలుగు',    'ml': 'തെലുഗു',    'kn': 'ತೆಲುಗು',    'bn': 'তেলুগু',    'mr': 'तेलुगू',    'gu': 'તેલુગુ',    'pa': 'ਤੇਲੁਗੂ',    'or': 'ତେଲୁଗୁ',   'as': 'তেলুগু',    'ur': 'تیلگو',     'mai': 'तेलुगु',   'kok': 'तेलुगू',   'sd': 'تيلگو'},
    'ml':  {'en': 'Malayalam', 'ta': 'மலையாளம்', 'hi': 'मलयालम',   'te': 'మలయాళం',   'ml': 'മലയാളം',    'kn': 'ಮಲಯಾಳಂ',   'bn': 'মালায়ালাম', 'mr': 'मल्याळम',   'gu': 'મલયાળમ',    'pa': 'ਮਲਿਆਲਮ',    'or': 'ମଲୟାଳମ',   'as': 'মালায়ালম',  'ur': 'ملیالم',    'mai': 'मलयालम',   'kok': 'मल्याळम',  'sd': 'مليالم'},
    'kn':  {'en': 'Kannada',   'ta': 'கன்னடம்',  'hi': 'कन्नड़',   'te': 'కన్నడం',    'ml': 'കന്നഡ',     'kn': 'ಕನ್ನಡ',     'bn': 'কন্নড়',    'mr': 'कन्नड',     'gu': 'કન્નડ',     'pa': 'ਕੰਨੜ',      'or': 'କନ୍ନଡ',    'as': 'কন্নড়',    'ur': 'کنڑ',       'mai': 'कन्नड',    'kok': 'कन्नड',    'sd': 'ڪنڊا'},
    'bn':  {'en': 'Bengali',   'ta': 'வங்காளம்', 'hi': 'बंगाली',   'te': 'బెంగాలీ',   'ml': 'ബംഗാളി',   'kn': 'ಬಂಗಾಳಿ',   'bn': 'বাংলা',     'mr': 'बंगाली',    'gu': 'બંગાળી',    'pa': 'ਬੰਗਾਲੀ',    'or': 'ବଙ୍ଗଳା',   'as': 'বাংলা',     'ur': 'بنگالی',    'mai': 'बंगाली',   'kok': 'बंगाली',   'sd': 'بنگالي'},
    'mr':  {'en': 'Marathi',   'ta': 'மராத்தி',  'hi': 'मराठी',    'te': 'మరాఠీ',     'ml': 'മറാഠി',     'kn': 'ಮರಾಠಿ',    'bn': 'মারাঠি',    'mr': 'मराठी',     'gu': 'મરાઠી',     'pa': 'ਮਰਾਠੀ',     'or': 'ମରାଠୀ',    'as': 'মাৰাঠী',    'ur': 'مراٹھی',    'mai': 'मराठी',    'kok': 'मराठी',    'sd': 'مراٺي'},
    'gu':  {'en': 'Gujarati',  'ta': 'குஜராத்தி','hi': 'गुजराती',  'te': 'గుజరాతీ',   'ml': 'ഗുജറാത്തി', 'kn': 'ಗುಜರಾತಿ',  'bn': 'গুজরাটি',   'mr': 'गुजराती',   'gu': 'ગુજરાતી',   'pa': 'ਗੁਜਰਾਤੀ',   'or': 'ଗୁଜୁରାଟୀ', 'as': 'গুজৰাটী',   'ur': 'گجراتی',    'mai': 'गुजराती',  'kok': 'गुजराती',  'sd': 'گجراتي'},
    'pa':  {'en': 'Punjabi',   'ta': 'பஞ்சாபி',  'hi': 'पंजाबी',   'te': 'పంజాబీ',    'ml': 'പഞ്ചാബി',   'kn': 'ಪಂಜಾಬಿ',   'bn': 'পাঞ্জাবি',  'mr': 'पंजाबी',    'gu': 'પંજાબી',    'pa': 'ਪੰਜਾਬੀ',    'or': 'ପଞ୍ଜାବୀ',  'as': 'পঞ্জাবী',   'ur': 'پنجابی',    'mai': 'पंजाबी',   'kok': 'पंजाबी',   'sd': 'پنجابي'},
    'or':  {'en': 'Odia',      'ta': 'ஒடியா',    'hi': 'ओडिया',    'te': 'ఒడియా',     'ml': 'ഒഡിയ',      'kn': 'ಒಡಿಯಾ',    'bn': 'ওড়িয়া',   'mr': 'ओडिया',     'gu': 'ઓડિયા',     'pa': 'ਓਡੀਆ',      'or': 'ଓଡ଼ିଆ',    'as': 'ওড়িয়া',   'ur': 'اڈیہ',      'mai': 'ओडिया',    'kok': 'ओडिया',    'sd': 'اوڊيا'},
    'as':  {'en': 'Assamese',  'ta': 'அசாமி',    'hi': 'असमिया',   'te': 'అస్సామీ',   'ml': 'അസ്സാമീസ്', 'kn': 'ಅಸ್ಸಾಮಿ',  'bn': 'অসমীয়া',   'mr': 'आसामी',     'gu': 'આસામી',     'pa': 'ਅਸਾਮੀ',     'or': 'ଅସମୀୟା',   'as': 'অসমীয়া',   'ur': 'آسامی',     'mai': 'असमिया',   'kok': 'आसामी',    'sd': 'آسامي'},
    'ur':  {'en': 'Urdu',      'ta': 'உர்து',    'hi': 'उर्दू',    'te': 'ఉర్దూ',     'ml': 'ഉറുദു',     'kn': 'ಉರ್ದು',    'bn': 'উর্দু',     'mr': 'उर्दू',     'gu': 'ઉર્દૂ',     'pa': 'ਉਰਦੂ',      'or': 'ଉର୍ଦୁ',    'as': 'উৰ্দু',     'ur': 'اردو',      'mai': 'उर्दू',    'kok': 'उर्दू',    'sd': 'اردو'},
    'mai': {'en': 'Maithili',  'ta': 'மைதிலி',  'hi': 'मैथिली',   'te': 'మైథిలీ',    'ml': 'മൈഥിലി',   'kn': 'ಮೈಥಿಲಿ',   'bn': 'মৈথিলী',    'mr': 'मैथिली',    'gu': 'મૈથિલી',    'pa': 'ਮੈਥਿਲੀ',    'or': 'ମୈଥିଲୀ',   'as': 'মৈথিলী',    'ur': 'میتھلی',    'mai': 'मैथिली',   'kok': 'मैथिली',   'sd': 'ميٿلي'},
    'kok': {'en': 'Konkani',   'ta': 'கொங்கணி', 'hi': 'कोंकणी',   'te': 'కొంకణి',    'ml': 'കൊങ്കണി',  'kn': 'ಕೊಂಕಣಿ',   'bn': 'কোঙ্কণি',   'mr': 'कोंकणी',    'gu': 'કોંકણી',    'pa': 'ਕੋਂਕਣੀ',    'or': 'କୋଙ୍କଣୀ',  'as': 'কোংকণী',    'ur': 'کونکنی',    'mai': 'कोंकणी',   'kok': 'कोंकणी',   'sd': 'ڪونڪاني'},
    'sd':  {'en': 'Sindhi',    'ta': 'சிந்தி',   'hi': 'सिंधी',    'te': 'సింధీ',     'ml': 'സിന്ധി',   'kn': 'ಸಿಂಧಿ',    'bn': 'সিন্ধি',    'mr': 'सिंधी',     'gu': 'સિંધી',     'pa': 'ਸਿੰਧੀ',     'or': 'ସିନ୍ଧୀ',   'as': 'সিন্ধী',    'ur': 'سندھی',     'mai': 'सिंधी',    'kok': 'सिंधी',    'sd': 'سنڌي'},
}

# All language-change trigger keywords across all scripts
LANGUAGE_KEYWORDS = {
    'english': 'en',    'tamil': 'ta',     'hindi': 'hi',
    'telugu': 'te',     'malayalam': 'ml', 'kannada': 'kn',
    'bengali': 'bn',    'marathi': 'mr',   'gujarati': 'gu',
    'punjabi': 'pa',    'odia': 'or',      'assamese': 'as',
    'urdu': 'ur',       'maithili': 'mai', 'konkani': 'kok',
    'sindhi': 'sd',
    # Tamil script
    'ஆங்கிலம்': 'en',  'தமிழ்': 'ta',    'இந்தி': 'hi',
    'தெலுங்கு': 'te',  'மலையாளம்': 'ml', 'கன்னடம்': 'kn',
    'வங்காளம்': 'bn',  'மராத்தி': 'mr',  'குஜராத்தி': 'gu',
    'பஞ்சாபி': 'pa',   'ஒடியா': 'or',    'அசாமி': 'as',
    'உர்து': 'ur',      'மைதிலி': 'mai',  'கொங்கணி': 'kok',
    'சிந்தி': 'sd',
    # Hindi/Devanagari script
    'अंग्रेजी': 'en',  'तमिल': 'ta',     'हिंदी': 'hi',
    'तेलुगु': 'te',    'मलयालम': 'ml',   'कन्नड़': 'kn',
    'बंगाली': 'bn',    'मराठी': 'mr',    'गुजराती': 'gu',
    'पंजाबी': 'pa',    'ओडिया': 'or',    'असमिया': 'as',
    'उर्दू': 'ur',     'मैथिली': 'mai',  'कोंकणी': 'kok',
    'सिंधी': 'sd',
    # Telugu script
    'ఇంగ్లీష్': 'en',  'తమిళం': 'ta',    'హిందీ': 'hi',
    'తెలుగు': 'te',    'మలయాళం': 'ml',   'కన్నడం': 'kn',
    'బెంగాలీ': 'bn',   'మరాఠీ': 'mr',    'గుజరాతీ': 'gu',
    'పంజాబీ': 'pa',    'ఒడియా': 'or',    'అస్సామీ': 'as',
    'ఉర్దూ': 'ur',     'మైథిలీ': 'mai',  'కొంకణి': 'kok',
    'సింధీ': 'sd',
    # Malayalam script
    'ഇംഗ്ലീഷ്': 'en',  'തമിഴ്': 'ta',    'ഹിന്ദി': 'hi',
    'തെലുഗു': 'te',    'മലയാളം': 'ml',   'കന്നഡ': 'kn',
    'ബംഗാളി': 'bn',    'മറാഠി': 'mr',    'ഗുജറാത്തി': 'gu',
    'പഞ്ചാബി': 'pa',   'ഒഡിയ': 'or',     'അസ്സാമീസ്': 'as',
    'ഉറുദു': 'ur',     'മൈഥിലി': 'mai',  'കൊങ്കണി': 'kok',
    'സിന്ധി': 'sd',
    # Kannada script
    'ಇಂಗ್ಲಿಷ್': 'en',  'ತಮಿಳು': 'ta',    'ಹಿಂದಿ': 'hi',
    'ತೆಲುಗು': 'te',    'ಮಲಯಾಳಂ': 'ml',   'ಕನ್ನಡ': 'kn',
    'ಬಂಗಾಳಿ': 'bn',    'ಮರಾಠಿ': 'mr',    'ಗುಜರಾತಿ': 'gu',
    'ಪಂಜಾಬಿ': 'pa',    'ಒಡಿಯಾ': 'or',    'ಅಸ್ಸಾಮಿ': 'as',
    'ಉರ್ದು': 'ur',     'ಮೈಥಿಲಿ': 'mai',  'ಕೊಂಕಣಿ': 'kok',
    'ಸಿಂಧಿ': 'sd',
    # Bengali script
    'ইংরেজি': 'en',    'তামিল': 'bn',    'হিন্দি': 'hi',
    'তেলুগু': 'te',    'মালায়ালাম': 'ml', 'কন্নড়': 'kn',
    'বাংলা': 'bn',     'মারাঠি': 'mr',   'গুজরাটি': 'gu',
    'পাঞ্জাবি': 'pa',  'ওড়িয়া': 'or',   'অসমীয়া': 'as',
    'উর্দু': 'ur',     'মৈথিলী': 'mai',  'কোঙ্কণি': 'kok',
    'সিন্ধি': 'sd',
    # Gujarati script
    'અંગ્રેજી': 'en',  'તમિળ': 'ta',     'હિન્દી': 'hi',
    'તેલુગુ': 'te',    'મલયાળમ': 'ml',   'કન્નડ': 'kn',
    'બંગાળી': 'bn',    'મરાઠી': 'mr',    'ગુજરાતી': 'gu',
    'પંજાબી': 'pa',    'ઓડિયા': 'or',    'આસામી': 'as',
    'ઉર્દૂ': 'ur',     'મૈથિલી': 'mai',  'કોંકણી': 'kok',
    'સિંધી': 'sd',
    # Punjabi (Gurmukhi) script
    'ਅੰਗਰੇਜ਼ੀ': 'en',  'ਤਮਿਲ': 'ta',     'ਹਿੰਦੀ': 'hi',
    'ਤੇਲੁਗੂ': 'te',    'ਮਲਿਆਲਮ': 'ml',   'ਕੰਨੜ': 'kn',
    'ਬੰਗਾਲੀ': 'bn',    'ਮਰਾਠੀ': 'mr',    'ਗੁਜਰਾਤੀ': 'gu',
    'ਪੰਜਾਬੀ': 'pa',    'ਓਡੀਆ': 'or',     'ਅਸਾਮੀ': 'as',
    'ਉਰਦੂ': 'ur',      'ਮੈਥਿਲੀ': 'mai',  'ਕੋਂਕਣੀ': 'kok',
    'ਸਿੰਧੀ': 'sd',
    # Urdu/Arabic script
    'انگریزی': 'en',   'تامل': 'ta',     'ہندی': 'hi',
    'تیلگو': 'te',     'ملیالم': 'ml',   'کنڑ': 'kn',
    'بنگالی': 'bn',    'مراٹھی': 'mr',   'گجراتی': 'gu',
    'پنجابی': 'pa',    'اڈیہ': 'or',     'آسامی': 'as',
    'اردو': 'ur',      'میتھلی': 'mai',  'کونکنی': 'kok',
    'سندھی': 'sd',
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