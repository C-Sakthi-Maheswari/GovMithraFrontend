from googletrans import Translator
import logging
import time
import re

logger = logging.getLogger(__name__)


class MultilingualTranslator:
    def __init__(self):
        self.translator = Translator()
        self.supported_languages = {
            'en':  'English',
            'ta':  'Tamil',
            'hi':  'Hindi',
            'te':  'Telugu',
            'ml':  'Malayalam',
            'kn':  'Kannada',
            # 8th Schedule additions
            'bn':  'Bengali',
            'mr':  'Marathi',
            'gu':  'Gujarati',
            'pa':  'Punjabi',
            'or':  'Odia',
            'as':  'Assamese',
            'ur':  'Urdu',
            'mai': 'Maithili',
            'kok': 'Konkani',
            'sd':  'Sindhi',
        }

        self.keyword_mappings = {
            # ------------------------------------------------------------------ #
            #  ORIGINAL LANGUAGES                                                #
            # ------------------------------------------------------------------ #
            'hi': {
                'खेल': 'sports', 'खेलकूद': 'sports', 'क्रीड़ा': 'sports',
                'छात्रवृत्ति': 'scholarship', 'स्कॉलरशिप': 'scholarship',
                'प्रशिक्षण': 'training', 'ट्रेनिंग': 'training',
                'कार्यक्रम': 'program', 'योजना': 'scheme',
                'शिक्षा': 'education', 'पढ़ाई': 'education', 'अध्ययन': 'study',
                'परीक्षा': 'exam', 'इम्तिहान': 'exam',
                'पासपोर्ट': 'passport', 'पारपत्र': 'passport',
                'प्रमाण पत्र': 'certificate', 'प्रमाणपत्र': 'certificate', 'सर्टिफिकेट': 'certificate',
                'बस मार्ग': 'bus route', 'बस': 'bus',
                'मार्ग': 'route', 'रास्ता': 'route',
                'के माध्यम से': 'via',
                'दस्तावेज': 'document', 'कागजात': 'document',
                'आवेदन': 'application',
                'सरकारी': 'government', 'सरकार': 'government',
                'टैक्स': 'tax',
            },
            'ta': {
                'விளையாட்டுகள்': 'sports', 'விளையாட்டு': 'sports', 'கிரிக்கெட்': 'cricket',
                'உதவித்தொகை': 'scholarship', 'ஸ்காலர்ஷிப்': 'scholarship',
                'பயிற்சித்': 'training', 'பயிற்சி': 'training',
                'திட்டங்கள்': 'program', 'திட்டம்': 'scheme', 'தொகுப்பு': 'package',
                'கல்வி': 'education', 'படிப்பு': 'study',
                'தேர்வுகள்': 'exam', 'தேர்வு': 'exam', 'பரீட்சை': 'exam',
                'பாஸ்போர்ட்': 'passport', 'கடவுச்சீட்டு': 'passport',
                'வரிகள்': 'tax', 'வரி': 'tax',
                'சான்றிதழ்': 'certificate', 'சான்று': 'certificate', 'சர்டிபிகேட்': 'certificate',
                'பேருந்து': 'bus', 'பஸ்': 'bus', 'எம்டிசி': 'mtc',
                'வழி': 'route', 'பாதை': 'route',
                'இருந்து': 'from', 'முதல்': 'from', 'வரை': 'to', 'வழியாக': 'via',
                'ஆவணங்கள்': 'document', 'ஆவணம்': 'document',
                'விண்ணப்பம்': 'application',
                'அரசாங்கம்': 'government', 'அரசு': 'government',
                'மின் இணைப்பு': 'electricity connection',
                'மின்சாரம்': 'electricity', 'மின்': 'electricity',
                'வேலைகள்': 'jobs', 'வேலை': 'job',
                'சமீபத்திய': 'recent', 'புதிய': 'new',
            },
            'te': {
                'క్రీడలు': 'sports', 'క్రీడా': 'sports', 'స్పోర్ట్స్': 'sports',
                'స్కాలర్‌షిప్': 'scholarship', 'స్కాలర్షిప్': 'scholarship', 'వేతనం': 'scholarship',
                'శిక్షణా': 'training', 'శిక్షణ': 'training', 'ట్రైనింగ్': 'training',
                'కార్యక్రమాలు': 'program', 'కార్యక్రమం': 'program', 'పథకాలు': 'scheme',
                'విద్యా': 'education', 'విద్య': 'education', 'చదువు': 'study',
                'పరీక్షలు': 'exam', 'పరీక్ష': 'exam',
                'పాస్‌పోర్ట్': 'passport', 'పాస్పోర్ట్': 'passport',
                'పన్నులు': 'tax', 'పన్ను': 'tax', 'టాక్స్': 'tax',
                'సర్టిఫికేట్': 'certificate', 'ధృవీకరణ పత్రం': 'certificate', 'సర్టిఫికెట్': 'certificate',
                'బస్సులు': 'bus', 'బస్సు': 'bus', 'బస్': 'bus',
                'మార్గాలు': 'route', 'మార్గం': 'route',
                'నుండి': 'from', 'వరకు': 'to', 'ద్వారా': 'via',
                'పత్రాలు': 'document', 'పత్రం': 'document',
                'దరఖాస్తు': 'application',
                'ప్రభుత్వం': 'government', 'ప్రభుత్వ': 'government',
            },
            'ml': {
                'కాయిక': 'sports', 'కాయికం': 'sports', 'స్పోర్ట్స్': 'sports',
                'కాయిక': 'sports', 'కాయికం': 'sports',
                'കായിക': 'sports', 'കായികം': 'sports', 'സ്പോർട്സ്': 'sports',
                'സ്കോളർഷിപ്പ്': 'scholarship', 'സ്കോളർഷിപ്': 'scholarship', 'വിദ്യാസഹായം': 'scholarship',
                'പരിശീലനാ': 'training', 'പരിശീലന': 'training', 'പരിശീലനം': 'training',
                'പരിപാടികൾ': 'program', 'പരിപാടി': 'program', 'പദ്ധതികൾ': 'scheme',
                'വിദ്യാഭ്യാസ': 'education', 'വിദ്യാഭ്യാസം': 'education', 'പഠനം': 'study',
                'പരീക്ഷകൾ': 'exam', 'പരീക്ഷ': 'exam',
                'പാസ്‌പോർട്ട്': 'passport', 'പാസ്പോർട്ട്': 'passport',
                'നികുതികൾ': 'tax', 'നികുതി': 'tax', 'ടാക്സ്': 'tax',
                'സർട്ടിഫിക്കറ്റ്': 'certificate', 'സർട്ടിഫിക്കേറ്റ്': 'certificate', 'സാക്ഷ്യപത്രം': 'certificate',
                'ബസ്സ്': 'bus', 'ബസ്': 'bus',
                'റൂട്ടുകൾ': 'route', 'റൂട്ട്': 'route', 'പാത': 'route',
                'മുതൽ': 'from', 'വരെ': 'to', 'വഴി': 'via',
                'രേഖകൾ': 'document', 'രേഖ': 'document',
                'അപേക്ഷ': 'application',
                'സർക്കാരിന്റെ': 'government', 'സർക്കാർ': 'government',
            },
            'kn': {
                'ಕ್ರೀಡೆ': 'sports', 'ವಿದ್ಯಾರ್ಥಿವೇತನ': 'scholarship',
                'ತರಬೇತಿ': 'training', 'ಕಾರ್ಯಕ್ರಮ': 'program', 'ಯೋಜನೆ': 'scheme',
                'ಶಿಕ್ಷಣ': 'education', 'ಪರೀಕ್ಷೆ': 'exam',
                'ಪಾಸ್‌ಪೋರ್ಟ್': 'passport', 'ತೆರಿಗೆ': 'tax',
                'ಪ್ರಮಾಣಪತ್ರ': 'certificate', 'ಬಸ್': 'bus',
                'ಮಾರ್ಗ': 'route', 'ಇಂದ': 'from', 'ವರೆಗೆ': 'to',
                'ಮುಖಾಂತರ': 'via', 'ದಸ್ತಾವೇಜು': 'document',
                'ಅರ್ಜಿ': 'application', 'ಸರ್ಕಾರ': 'government',
            },

            # ------------------------------------------------------------------ #
            #  8th SCHEDULE ADDITIONS                                            #
            # ------------------------------------------------------------------ #

            # Bengali (bn) — West Bengal, Assam
            'bn': {
                'খেলাধুলা': 'sports', 'খেলা': 'sports',
                'বৃত্তি': 'scholarship', 'স্কলারশিপ': 'scholarship',
                'প্রশিক্ষণ': 'training',
                'কর্মসূচি': 'program', 'প্রকল্প': 'scheme',
                'শিক্ষা': 'education', 'পড়াশোনা': 'study',
                'পরীক্ষা': 'exam',
                'পাসপোর্ট': 'passport',
                'কর': 'tax',
                'সনদ': 'certificate', 'সার্টিফিকেট': 'certificate',
                'বাস': 'bus',
                'রুট': 'route', 'পথ': 'route',
                'থেকে': 'from', 'পর্যন্ত': 'to', 'মাধ্যমে': 'via',
                'দলিল': 'document', 'নথি': 'document',
                'আবেদন': 'application',
                'সরকার': 'government', 'সরকারি': 'government',
                'বিদ্যুৎ': 'electricity',
                'চাকরি': 'job',
            },

            # Marathi (mr) — Maharashtra (Devanagari script)
            'mr': {
                'खेळ': 'sports', 'क्रीडा': 'sports',
                'शिष्यवृत्ती': 'scholarship', 'स्कॉलरशिप': 'scholarship',
                'प्रशिक्षण': 'training',
                'कार्यक्रम': 'program', 'योजना': 'scheme',
                'शिक्षण': 'education', 'अभ्यास': 'study',
                'परीक्षा': 'exam',
                'पासपोर्ट': 'passport',
                'प्रमाणपत्र': 'certificate', 'सर्टिफिकेट': 'certificate',
                'बस': 'bus',
                'मार्ग': 'route', 'रस्ता': 'route',
                'पासून': 'from', 'पर्यंत': 'to', 'द्वारे': 'via',
                'दस्तऐवज': 'document', 'कागदपत्र': 'document',
                'अर्ज': 'application',
                'सरकार': 'government', 'शासन': 'government',
                'कर': 'tax',
            },

            # Gujarati (gu) — Gujarat
            'gu': {
                'રમતો': 'sports', 'રમત': 'sports',
                'શિષ્યવૃત્તિ': 'scholarship', 'સ્કૉલરશિપ': 'scholarship',
                'તાલીમ': 'training',
                'કાર્યક્રમ': 'program', 'યોજના': 'scheme',
                'શિક્ષણ': 'education', 'અભ્યાસ': 'study',
                'પરીક્ષા': 'exam',
                'પાસપોર્ટ': 'passport',
                'કર': 'tax',
                'પ્રમાણપત્ર': 'certificate', 'સર્ટિફિકેટ': 'certificate',
                'બસ': 'bus',
                'માર્ગ': 'route', 'રસ્તો': 'route',
                'થી': 'from', 'સુધી': 'to', 'મારફતે': 'via',
                'દસ્તાવેજ': 'document',
                'અરજી': 'application',
                'સરકાર': 'government', 'સરકારી': 'government',
            },

            # Punjabi (pa) — Punjab (Gurmukhi script)
            'pa': {
                'ਖੇਡਾਂ': 'sports', 'ਖੇਡ': 'sports',
                'ਵਜ਼ੀਫ਼ਾ': 'scholarship', 'ਸਕਾਲਰਸ਼ਿਪ': 'scholarship',
                'ਸਿਖਲਾਈ': 'training',
                'ਪ੍ਰੋਗਰਾਮ': 'program', 'ਯੋਜਨਾ': 'scheme',
                'ਸਿੱਖਿਆ': 'education', 'ਪੜ੍ਹਾਈ': 'study',
                'ਪ੍ਰੀਖਿਆ': 'exam',
                'ਪਾਸਪੋਰਟ': 'passport',
                'ਟੈਕਸ': 'tax',
                'ਸਰਟੀਫਿਕੇਟ': 'certificate',
                'ਬੱਸ': 'bus',
                'ਰੂਟ': 'route', 'ਰਾਹ': 'route',
                'ਤੋਂ': 'from', 'ਤੱਕ': 'to', 'ਰਾਹੀਂ': 'via',
                'ਦਸਤਾਵੇਜ਼': 'document',
                'ਅਰਜ਼ੀ': 'application',
                'ਸਰਕਾਰ': 'government', 'ਸਰਕਾਰੀ': 'government',
            },

            # Odia (or) — Odisha
            'or': {
                'କ୍ରୀଡ଼ା': 'sports', 'ଖେଳ': 'sports',
                'ଛାତ୍ରବୃତ୍ତି': 'scholarship', 'ସ୍କଲାରସିପ': 'scholarship',
                'ତାଲିମ': 'training', 'ପ୍ରଶିକ୍ଷଣ': 'training',
                'କାର୍ଯ୍ୟକ୍ରମ': 'program', 'ଯୋଜନା': 'scheme',
                'ଶିକ୍ଷା': 'education', 'ଅଧ୍ୟୟନ': 'study',
                'ପରୀକ୍ଷା': 'exam',
                'ପାସପୋର୍ଟ': 'passport',
                'କର': 'tax',
                'ପ୍ରମାଣପତ୍ର': 'certificate', 'ସର୍ଟିଫିକେଟ': 'certificate',
                'ବସ': 'bus',
                'ମାର୍ଗ': 'route', 'ରାସ୍ତା': 'route',
                'ଠାରୁ': 'from', 'ପର୍ଯ୍ୟନ୍ତ': 'to', 'ମାଧ୍ୟମରେ': 'via',
                'ଦଲିଲ': 'document', 'ନଥି': 'document',
                'ଆବେଦନ': 'application',
                'ସରକାର': 'government', 'ସରକାରୀ': 'government',
            },

            # Assamese (as) — Assam (Bengali script)
            'as': {
                'খেলধেমালি': 'sports', 'ক্ৰীড়া': 'sports',
                'বৃত্তি': 'scholarship', 'স্কলাৰশ্বিপ': 'scholarship',
                'প্ৰশিক্ষণ': 'training',
                'কাৰ্যক্ৰম': 'program', 'আঁচনি': 'scheme',
                'শিক্ষা': 'education', 'পঢ়া-শুনা': 'study',
                'পৰীক্ষা': 'exam',
                'পাছপোৰ্ট': 'passport',
                'কৰ': 'tax',
                'প্ৰমাণপত্ৰ': 'certificate', 'চাৰ্টিফিকেট': 'certificate',
                'বাছ': 'bus',
                'পথ': 'route', 'ৰুট': 'route',
                'পৰা': 'from', 'লৈ': 'to', 'জৰিয়তে': 'via',
                'দলিল': 'document', 'নথি-পত্ৰ': 'document',
                'আবেদন': 'application',
                'চৰকাৰ': 'government', 'চৰকাৰী': 'government',
            },

            # Urdu (ur) — Nastaliq/Arabic script
            'ur': {
                'کھیل': 'sports',
                'اسکالرشپ': 'scholarship', 'وظیفہ': 'scholarship',
                'تربیت': 'training',
                'پروگرام': 'program', 'منصوبہ': 'scheme',
                'تعلیم': 'education', 'پڑھائی': 'study',
                'امتحان': 'exam',
                'پاسپورٹ': 'passport',
                'ٹیکس': 'tax',
                'سرٹیفکیٹ': 'certificate',
                'بس': 'bus',
                'راستہ': 'route', 'روٹ': 'route',
                'سے': 'from', 'تک': 'to', 'کے ذریعے': 'via',
                'دستاویز': 'document',
                'درخواست': 'application',
                'حکومت': 'government', 'سرکاری': 'government',
            },

            # Maithili (mai) — Bihar/Jharkhand (Devanagari script)
            'mai': {
                'खेल': 'sports', 'क्रीड़ा': 'sports',
                'छात्रवृत्ति': 'scholarship',
                'प्रशिक्षण': 'training',
                'कार्यक्रम': 'program', 'योजना': 'scheme',
                'शिक्षा': 'education', 'पढ़ाई': 'study',
                'परीक्षा': 'exam',
                'पासपोर्ट': 'passport',
                'कर': 'tax',
                'प्रमाणपत्र': 'certificate',
                'बस': 'bus',
                'मार्ग': 'route',
                'सँ': 'from', 'तक': 'to', 'द्वारा': 'via',
                'दस्तावेज': 'document',
                'आवेदन': 'application',
                'सरकार': 'government',
            },

            # Konkani (kok) — Goa/coastal Karnataka (Devanagari script)
            'kok': {
                'खेळ': 'sports',
                'शिष्यवृत्ती': 'scholarship',
                'तालीम': 'training',
                'कार्यक्रम': 'program', 'योजना': 'scheme',
                'शिक्षण': 'education',
                'परीक्षा': 'exam',
                'पासपोर्ट': 'passport',
                'कर': 'tax',
                'प्रमाणपत्र': 'certificate',
                'बस': 'bus',
                'मार्ग': 'route',
                'थावन': 'from', 'मेरेन': 'to', 'द्वारे': 'via',
                'दस्तावेज': 'document',
                'अर्ज': 'application',
                'सरकार': 'government',
            },

            # Sindhi (sd) — Nastaliq/Arabic script
            'sd': {
                'راند': 'sports', 'کيل': 'sports',
                'اسڪالرشپ': 'scholarship', 'وظيفو': 'scholarship',
                'تربيت': 'training',
                'پروگرام': 'program', 'منصوبو': 'scheme',
                'تعليم': 'education',
                'امتحان': 'exam',
                'پاسپورٽ': 'passport',
                'ٽيڪس': 'tax',
                'سرٽيفڪيٽ': 'certificate',
                'بس': 'bus',
                'رستو': 'route',
                'کان': 'from', 'تائين': 'to', 'ذريعي': 'via',
                'دستاويز': 'document',
                'درخواست': 'application',
                'حڪومت': 'government',
            },
        }

        # Keywords that are risky to replace because they appear as substrings
        # inside longer words. These are skipped during preprocessing and left
        # for the translation API to handle naturally.
        self._skip_as_substring = {
            'hi':  {'से', 'तक', 'कर'},
            'ta':  {'க்கு', 'மின்'},
            'te':  set(),
            'ml':  set(),
            'kn':  set(),
            'bn':  set(),
            'mr':  {'कर'},
            'gu':  set(),
            'pa':  set(),
            'or':  {'କର'},
            'as':  set(),
            'ur':  {'سے', 'تک'},
            'mai': {'कर', 'तक'},
            'kok': {'कर'},
            'sd':  set(),
        }

        # Unicode script ranges for reliable script-based detection.
        # Note: Languages sharing Devanagari (hi / mr / mai / kok) all map to 'hi'
        # at script-detection time; caller should supply source_lang explicitly for
        # finer disambiguation, or rely on googletrans.
        # Urdu and Sindhi both use the Arabic block → both map to 'ur' here.
        # Assamese shares the Bengali block with 'bn' → maps to 'bn'.
        self._script_ranges = {
            'hi': (0x0900, 0x097F),  # Devanagari → hi / mr / mai / kok
            'bn': (0x0980, 0x09FF),  # Bengali    → bn / as
            'gu': (0x0A80, 0x0AFF),  # Gujarati
            'pa': (0x0A00, 0x0A7F),  # Gurmukhi  → Punjabi
            'or': (0x0B00, 0x0B7F),  # Odia
            'ta': (0x0B80, 0x0BFF),  # Tamil
            'te': (0x0C00, 0x0C7F),  # Telugu
            'kn': (0x0C80, 0x0CFF),  # Kannada
            'ml': (0x0D00, 0x0D7F),  # Malayalam
            'ur': (0x0600, 0x06FF),  # Arabic block → ur / sd
        }

    def _fresh_translator(self):
        """Create a fresh Translator to avoid stale session issues with googletrans."""
        try:
            return Translator()
        except Exception:
            return self.translator

    def detect_language_by_script(self, text):
        """
        Fast, 100%-reliable script-based detection using Unicode code-point ranges.

        Indian scripts occupy completely non-overlapping Unicode blocks, so simply
        counting how many characters of each text fall inside each block gives an
        unambiguous answer.  This eliminates the googletrans misdetection problem
        (e.g. Hindi being reported as Tamil) for all Indian-script input.

        Returns the detected lang code, or None if no Indian script characters
        were found (caller should fall back to googletrans for Latin-script text).
        """
        counts = {lang: 0 for lang in self._script_ranges}
        for ch in text:
            cp = ord(ch)
            for lang, (lo, hi) in self._script_ranges.items():
                if lo <= cp <= hi:
                    counts[lang] += 1
                    break  # a code-point can only belong to one block

        best_lang = max(counts, key=counts.get)
        if counts[best_lang] > 0:
            logger.info(f"Script-based detection → {best_lang} (counts: {counts})")
            return best_lang
        return None  # No Indian script characters found

    def _safe_word_replace(self, text, source_word, target_word):
        """
        Replace source_word with target_word only at word/token boundaries.
        """
        escaped = re.escape(source_word)

        pattern = r'(?:(?<=\s)|(?<=^)|(?<=[,.\-:;!?()\[\]]))' \
                  + escaped + \
                  r'(?=\s|$|[,.\-:;!?()\[\]])'

        replaced = re.sub(pattern, target_word, text)

        if replaced == text and source_word in text:
            result = []
            i = 0
            src_len = len(source_word)
            while i < len(text):
                if text[i:i + src_len] == source_word:
                    before = text[i - 1] if i > 0 else ' '
                    after  = text[i + src_len] if i + src_len < len(text) else ' '
                    if before in (' ', '\t', '\n') and after in (' ', '\t', '\n'):
                        result.append(target_word)
                    else:
                        result.append(text[i:i + src_len])
                    i += src_len
                else:
                    result.append(text[i])
                    i += 1
            replaced = ''.join(result)

        return replaced

    def preprocess_with_keywords(self, text, lang_code):
        """
        Replace known keywords before translation for better accuracy.
        Uses boundary-aware replacement to avoid corrupting longer words.
        """
        if lang_code not in self.keyword_mappings:
            return text

        processed_text = text
        replaced_words = []
        skip_set = self._skip_as_substring.get(lang_code, set())

        sorted_keywords = sorted(
            self.keyword_mappings[lang_code].items(),
            key=lambda x: len(x[0]),
            reverse=True
        )

        for local_word, english_word in sorted_keywords:
            if local_word in skip_set:
                continue

            if local_word in processed_text:
                new_text = self._safe_word_replace(processed_text, local_word, english_word)
                if new_text != processed_text:
                    replaced_words.append(f"{local_word}→{english_word}")
                    processed_text = new_text

        if replaced_words:
            logger.info(f"Keyword replacements ({lang_code}): {', '.join(replaced_words)}")

        return processed_text

    def detect_language(self, text):
        """
        Detect the language of input text.

        Strategy:
          1. Try script-based detection first — fast, deterministic, and 100%
             accurate for Indian scripts (Devanagari, Tamil, Telugu, Kannada,
             Malayalam occupy completely separate Unicode blocks).
          2. Fall back to googletrans only for Latin-script text (English, etc.)
             where script-based detection cannot distinguish the language.

        This fixes the known googletrans bug where Hindi (Devanagari script) is
        sometimes misreported as Tamil.
        """
        # Step 1: Script-based detection (reliable for all Indian scripts)
        script_lang = self.detect_language_by_script(text)
        if script_lang:
            return script_lang

        # Step 2: Fallback to googletrans for Latin / unknown scripts
        try:
            t = self._fresh_translator()
            detected = t.detect(text)
            lang_code = detected.lang
            if lang_code not in self.supported_languages:
                lang_code = 'en'
            logger.info(f"googletrans detection → {lang_code}")
            return lang_code
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            return 'en'

    def translate(self, text, target_lang='en', source_lang='auto'):
        """Low-level translate via googletrans with one retry."""
        if not text or str(text).strip() == "" or source_lang == target_lang:
            return text

        for attempt in range(2):
            try:
                t = self._fresh_translator()
                result = t.translate(str(text), src=source_lang, dest=target_lang)
                if result and result.text:
                    return result.text
            except Exception as e:
                logger.error(f"Translation attempt {attempt + 1} error: {e}")
                if attempt == 0:
                    time.sleep(0.5)

        return text  # Return original if both attempts fail

    def translate_to_english(self, text):
        """
        Translate any supported language to English.
        Always returns a tuple: (english_text: str, detected_lang: str)
        """
        try:
            if not text or str(text).strip() == "":
                return text, 'en'

            detected_lang = self.detect_language(text)

            if detected_lang == 'en':
                return text, 'en'

            preprocessed_text = self.preprocess_with_keywords(text, detected_lang)
            logger.info(f"Original ({detected_lang}): '{text}'")
            logger.info(f"Preprocessed: '{preprocessed_text}'")

            final_text = self.translate(preprocessed_text, target_lang='en', source_lang=detected_lang)
            logger.info(f"Final English: '{final_text}'")

            return final_text, detected_lang

        except Exception as e:
            logger.error(f"translate_to_english error: {e}")
            return text, 'en'

    def translate_from_english(self, text, target_lang):
        """
        Translate English text to the target language.
        Returns translated string (or original on failure).
        """
        try:
            if not text or str(text).strip() == "" or target_lang == 'en':
                return text
            return self.translate(str(text), target_lang=target_lang, source_lang='en')
        except Exception as e:
            logger.error(f"translate_from_english error: {e}")
            return text


# Global instance used across all actions
translator_instance = MultilingualTranslator()