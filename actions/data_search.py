import json
import re
from collections import Counter

# -------------------- CONFIG --------------------
TOP_K = 3
GOOGLE_THRESHOLD = 0.75
MIN_KEYWORDS_MATCHED = 2  # Minimum keywords that must match for multi-word queries

# -------------------- SIMPLE STEMMER --------------------
def simple_stem(word):
    suffixes = ['ation', 'ations', 'ment', 'ments', 'ing', 'ed', 'es', 's']
    for suffix in suffixes:
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            return word[:-len(suffix)]
    return word

# -------------------- LOAD DATA --------------------
def load_data(json_file):
    with open(json_file, "r", encoding="utf-8") as f:
        return json.load(f)

# -------------------- NORMALIZATION, STOPWORDS, SYNONYMS --------------------
STOP_WORDS = {
    "what", "is", "are", "the", "a", "an", "i", "we", "you",
    "want", "need", "show", "tell", "me", "about", "schemes",
    "scheme", "for", "please", "give", "list", "of", "to",
    "find", "get", "all", "my", "in", "on", "due", "because",
    "have", "has", "had", "was", "were", "this", "that"
}

SYNONYMS = {
    "vaccine": ["vaccines", "vaccination", "vaccinations", "immunization", "immunisation"],
    "child": ["children", "infant", "baby"],
    "pregnant": ["pregnancy", "maternity"],
    "pension": ["retirement", "oldage", "senior"],
    "accident": ["disaster", "fire", "flood", "cyclone"],
    "health": ["medical", "hospital", "treatment"],
    "education": ["school", "college", "study", "postgraduate", "masters", "phd", "doctorate"]
}

IMPORTANT_PHRASES = [
    "lost certificate", "lost certificates", "lost document", "lost documents",
    "fire accident", "fire disaster", "document replacement", "certificate reissue",
    "certificate replacement", "disaster relief", "accident compensation",
    "reissue certificate", "reissue document", "replace certificate",
    "replace document", "document loss", "certificate loss"
]

def normalize_text(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return text

def flatten_json(obj):
    words = []

    def extract(value):
        if isinstance(value, dict):
            for v in value.values():
                extract(v)
        elif isinstance(value, list):
            for item in value:
                extract(item)
        else:
            words.append(normalize_text(str(value)))

    extract(obj)
    return " ".join(words)

def extract_keywords(text):
    words = normalize_text(text).split()
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    stemmed = [simple_stem(w) for w in keywords]
    return list(set(keywords + stemmed))

def expand_keywords(words):
    expanded = set(words)
    for word in words:
        for key, values in SYNONYMS.items():
            if word == key:
                expanded.update(values)
            elif word in values:
                expanded.add(key)
        expanded.add(simple_stem(word))
    return list(expanded)

def fuzzy_match(word, target_words, threshold=0.75):
    word_stem = simple_stem(word)
    for tw in target_words:
        tw_stem = simple_stem(tw)
        matches = sum(1 for a, b in zip(word, tw) if a == b)
        similarity = matches / max(len(word), len(tw))
        if similarity >= threshold or word_stem == tw_stem:
            return True
    return False

def score_record(record, record_text, query_words, query_text):
    score = 0
    record_words = record_text.split()
    record_counter = Counter(record_words)

    for phrase in IMPORTANT_PHRASES:
        if phrase in query_text and phrase in record_text:
            score += 20

    if query_text in record_text:
        score += 12

    for word in query_words:
        if word in record_counter:
            score += 4 * record_counter[word]
        elif fuzzy_match(word, record_words):
            score += 2

    for key in record.keys():
        if key.lower() in {"name", "title"}:
            name_text = normalize_text(str(record[key]))
            for word in query_words:
                if word in name_text:
                    score += 6

    return score

def count_keyword_matches(record_text, keywords):
    matches = 0
    for keyword in keywords:
        if keyword in record_text:
            matches += 1
    return matches

# -------------------- MAIN SEARCH FUNCTION --------------------
def search(query_text, json_file):
    data = load_data(json_file)
    keywords = extract_keywords(query_text)
    original_keywords = keywords.copy()
    keywords = expand_keywords(keywords)

    if not keywords:
        return []

    scored_results = []
    for record in data:
        record_text = flatten_json(record)
        score = score_record(record, record_text, keywords, query_text)
        if score > 0:
            scored_results.append((score, record, record_text))

    if len(original_keywords) >= 3:
        filtered_results = []
        for score, rec, rec_text in scored_results:
            matches = count_keyword_matches(rec_text, original_keywords)
            if matches >= MIN_KEYWORDS_MATCHED:
                filtered_results.append((score, rec))
        if filtered_results:
            scored_results = filtered_results
        else:
            scored_results = [(s, r) for s, r, _ in scored_results]
    else:
        scored_results = [(s, r) for s, r, _ in scored_results]

    scored_results.sort(key=lambda x: x[0], reverse=True)
    best_score, best_record = scored_results[0]
    close_results = [
        rec for score, rec in scored_results
        if score >= GOOGLE_THRESHOLD * best_score
    ][:TOP_K]

    return [best_record] + close_results[1:]
