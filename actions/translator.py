from googletrans import Translator
import logging

logger = logging.getLogger(__name__)

class MultilingualTranslator:
    def __init__(self):
        self.translator = Translator()
        self.supported_languages = {
            'en': 'English',
            'ta': 'Tamil',
            'hi': 'Hindi',
            'te': 'Telugu',
            'ml': 'Malayalam'
        }
        
        # Comprehensive keyword mappings for all supported languages
        self.keyword_mappings = {
            'hi': {
                # Sports
                'खेल': 'sports',
                'खेलकूद': 'sports',
                'क्रीड़ा': 'sports',
                # Scholarship
                'छात्रवृत्ति': 'scholarship',
                'स्कॉलरशिप': 'scholarship',
                # Training
                'प्रशिक्षण': 'training',
                'ट्रेनिंग': 'training',
                # Program
                'कार्यक्रम': 'program',
                'योजना': 'scheme',
                # Education
                'शिक्षा': 'education',
                'पढ़ाई': 'education',
                'अध्ययन': 'study',
                # Exam
                'परीक्षा': 'exam',
                'इम्तिहान': 'exam',
                # Passport
                'पासपोर्ट': 'passport',
                'पारपत्र': 'passport',
                # Tax
                'कर': 'tax',
                'टैक्स': 'tax',
                # Certificate
                'प्रमाण पत्र': 'certificate',
                'प्रमाणपत्र': 'certificate',
                'सर्टिफिकेट': 'certificate',
                # Bus
                'बस': 'bus',
                'बस मार्ग': 'bus route',
                # Route/Path
                'मार्ग': 'route',
                'रास्ता': 'route',
                # From/To
                'से': 'from',
                'तक': 'to',
                'के माध्यम से': 'via',
                # Documents
                'दस्तावेज': 'document',
                'कागजात': 'document',
                # Application
                'आवेदन': 'application',
                # Government
                'सरकार': 'government',
                'सरकारी': 'government'
            },
            'ta': {
                # Sports
                'விளையாட்டு': 'sports',
                'விளையாட்டுகள்': 'sports',
                'கிரிக்கெட்': 'cricket',
                # Scholarship
                'உதவித்தொகை': 'scholarship',
                'ஸ்காலர்ஷிப்': 'scholarship',
                # Training
                'பயிற்சி': 'training',
                'பயிற்சித்': 'training',
                # Program
                'திட்டங்கள்': 'program',
                'திட்டம்': 'scheme',
                'தொகுப்பு': 'package',
                # Education
                'கல்வி': 'education',
                'படிப்பு': 'study',
                # Exam
                'தேர்வு': 'exam',
                'தேர்வுகள்': 'exam',
                'பரீட்சை': 'exam',
                # Passport
                'பாஸ்போர்ட்': 'passport',
                'கடவுச்சீட்டு': 'passport',
                # Tax
                'வரி': 'tax',
                'வரிகள்': 'tax',
                # Certificate
                'சான்றிதழ்': 'certificate',
                'சான்று': 'certificate',
                'சர்டிபிகேட்': 'certificate',
                # Bus
                'பேருந்து': 'bus',
                'பஸ்': 'bus',
                'எம்டிசி': 'mtc',
                # Route
                'வழி': 'route',
                'பாதை': 'route',
                # From/To
                'இருந்து': 'from',
                'முதல்': 'from',
                'வரை': 'to',
                'க்கு': 'to',
                'வழியாக': 'via',
                # Documents
                'ஆவணங்கள்': 'document',
                'ஆவணம்': 'document',
                # Application
                'விண்ணப்பம்': 'application',
                # Government
                'அரசு': 'government',
                'அரசாங்கம்': 'government'
            },
            'te': {
                # Sports
                'క్రీడా': 'sports',
                'క్రీడలు': 'sports',
                'స్పోర్ట్స్': 'sports',
                # Scholarship
                'స్కాలర్‌షిప్': 'scholarship',
                'స్కాలర్షిప్': 'scholarship',
                'వేతనం': 'scholarship',
                # Training
                'శిక్షణ': 'training',
                'శిక్షణా': 'training',
                'ట్రైనింగ్': 'training',
                # Program
                'కార్యక్రమాలు': 'program',
                'కార్యక్రమం': 'program',
                'పథకాలు': 'scheme',
                # Education
                'విద్య': 'education',
                'విద్యా': 'education',
                'చదువు': 'study',
                # Exam
                'పరీక్ష': 'exam',
                'పరీక్షలు': 'exam',
                # Passport
                'పాస్‌పోర్ట్': 'passport',
                'పాస్పోర్ట్': 'passport',
                # Tax
                'పన్ను': 'tax',
                'పన్నులు': 'tax',
                'టాక్స్': 'tax',
                # Certificate
                'సర్టిఫికేట్': 'certificate',
                'ధృవీకరణ పత్రం': 'certificate',
                'సర్టిఫికెట్': 'certificate',
                # Bus
                'బస్': 'bus',
                'బస్సు': 'bus',
                'బస్సులు': 'bus',
                # Route
                'మార్గం': 'route',
                'మార్గాలు': 'route',
                # From/To
                'నుండి': 'from',
                'వరకు': 'to',
                'ద్వారా': 'via',
                # Documents
                'పత్రాలు': 'document',
                'పత్రం': 'document',
                # Application
                'దరఖాస్తు': 'application',
                # Government
                'ప్రభుత్వ': 'government',
                'ప్రభుత్వం': 'government'
            },
            'ml': {
                # Sports
                'കായിക': 'sports',
                'കായികം': 'sports',
                'സ്പോർട്സ്': 'sports',
                # Scholarship
                'സ്കോളർഷിപ്പ്': 'scholarship',
                'സ്കോളർഷിപ്': 'scholarship',
                'വിദ്യാസഹായം': 'scholarship',
                # Training
                'പരിശീലനം': 'training',
                'പരിശീലന': 'training',
                'പരിശീലനാ': 'training',
                # Program
                'പരിപാടികൾ': 'program',
                'പരിപാടി': 'program',
                'പദ്ധതികൾ': 'scheme',
                # Education
                'വിദ്യാഭ്യാസം': 'education',
                'വിദ്യാഭ്യാസ': 'education',
                'പഠനം': 'study',
                # Exam
                'പരീക്ഷ': 'exam',
                'പരീക്ഷകൾ': 'exam',
                # Passport
                'പാസ്‌പോർട്ട്': 'passport',
                'പാസ്പോർട്ട്': 'passport',
                # Tax
                'നികുതി': 'tax',
                'നികുതികൾ': 'tax',
                'ടാക്സ്': 'tax',
                # Certificate
                'സർട്ടിഫിക്കറ്റ്': 'certificate',
                'സർട്ടിഫിക്കേറ്റ്': 'certificate',
                'സാക്ഷ്യപത്രം': 'certificate',
                # Bus
                'ബസ്': 'bus',
                'ബസ്സ്': 'bus',
                # Route
                'റൂട്ട്': 'route',
                'റൂട്ടുകൾ': 'route',
                'പാത': 'route',
                # From/To
                'മുതൽ': 'from',
                'വരെ': 'to',
                'വഴി': 'via',
                # Documents
                'രേഖകൾ': 'document',
                'രേഖ': 'document',
                # Application
                'അപേക്ഷ': 'application',
                # Government
                'സർക്കാർ': 'government',
                'സർക്കാരിന്റെ': 'government'
            }
        }
    
    def preprocess_with_keywords(self, text, lang_code):
        """Replace known keywords before translation for better accuracy"""
        if lang_code not in self.keyword_mappings:
            return text
        
        processed_text = text
        replaced_words = []
        
        # Sort keywords by length (longest first) to handle multi-word phrases
        sorted_keywords = sorted(
            self.keyword_mappings[lang_code].items(), 
            key=lambda x: len(x[0]), 
            reverse=True
        )
        
        for local_word, english_word in sorted_keywords:
            if local_word in processed_text:
                processed_text = processed_text.replace(local_word, english_word)
                replaced_words.append(f"{local_word}→{english_word}")
        
        if replaced_words:
            logger.info(f"Keyword replacements ({lang_code}): {', '.join(replaced_words)}")
        
        return processed_text
    
    def detect_language(self, text):
        """Detect the language of input text"""
        try:
            detected = self.translator.detect(text)
            lang_code = detected.lang
            # If detected language is not in supported list, default to English
            if lang_code not in self.supported_languages:
                lang_code = 'en'
            return lang_code
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            return 'en'
    
    def translate(self, text, target_lang='en', source_lang='auto'):
        """Translate text to target language"""
        try:
            if source_lang == target_lang:
                return text
            
            if not text or text.strip() == "":
                return text
                
            result = self.translator.translate(text, src=source_lang, dest=target_lang)
            return result.text if result and result.text else text
            
        except Exception as e:
            logger.error(f"Translation error: {e} - Text: {text[:50]}...")
            return text
    
    def translate_to_english(self, text):
        """Translate any language to English for processing"""
        try:
            if not text or text.strip() == "":
                return text, 'en'
                
            detected_lang = self.detect_language(text)
            
            if detected_lang == 'en':
                return text, 'en'
            
            # Preprocess with keyword mapping for better accuracy
            preprocessed_text = self.preprocess_with_keywords(text, detected_lang)
            
            logger.info(f"Original ({detected_lang}): '{text}'")
            logger.info(f"Preprocessed: '{preprocessed_text}'")
            
            # If preprocessing changed the text, translate the remaining parts
            if preprocessed_text != text:
                try:
                    # Translate the preprocessed text (which now has English keywords mixed in)
                    translated = self.translator.translate(preprocessed_text, src=detected_lang, dest='en')
                    final_text = translated.text if translated and translated.text else preprocessed_text
                except:
                    final_text = preprocessed_text
                
                logger.info(f"Final English: '{final_text}'")
                return final_text, detected_lang
            
            # Otherwise, translate normally
            translated = self.translator.translate(text, src=detected_lang, dest='en')
            translated_text = translated.text if translated and translated.text else text
            
            logger.info(f"Translated to EN: '{translated_text}'")
            
            return translated_text, detected_lang
            
        except Exception as e:
            logger.error(f"Translation to English error: {e}")
            return text, 'en'
    
    def translate_from_english(self, text, target_lang):
        """Translate English text to target language"""
        try:
            if not text or text.strip() == "":
                return text
                
            if target_lang == 'en':
                return text
                
            return self.translate(text, target_lang=target_lang, source_lang='en')
            
        except Exception as e:
            logger.error(f"Translation from English error: {e}")
            return text

# Global translator instance
translator_instance = MultilingualTranslator()