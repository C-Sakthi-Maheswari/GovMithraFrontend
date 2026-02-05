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
            # Don't translate if already in target language or if target is English and source is auto
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
            
            translated = self.translator.translate(text, src=detected_lang, dest='en')
            return translated.text if translated and translated.text else text, detected_lang
            
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