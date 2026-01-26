import json
import re
from collections import Counter

# -------------------- CONFIG --------------------
TOP_K = 3
GOOGLE_THRESHOLD = 0.75
MIN_KEYWORDS_MATCHED = 2  # Minimum keywords that must match for multi-word queries

# -------------------- SIMPLE STEMMER --------------------
def simple_stem(word):
    """Remove common suffixes to get word stem"""
    suffixes = ['ation', 'ations', 'ment', 'ments', 'ing', 'ed', 'es', 's']
    for suffix in suffixes:
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            return word[:-len(suffix)]
    return word

# -------------------- LOAD DATA --------------------
with open("structured.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("🤖 Government Schemes Chatbot (Enhanced with Phrase Matching)")
print("Ask naturally: 'schemes for lost certificates in fire accident'")
print("Type 'exit' to quit\n")

# -------------------- STOP WORDS --------------------
STOP_WORDS = {
    "what", "is", "are", "the", "a", "an", "i", "we", "you",
    "want", "need", "show", "tell", "me", "about", "schemes",
    "scheme", "for", "please", "give", "list", "of", "to",
    "find", "get", "all", "my", "in", "on", "due", "because",
    "have", "has", "had", "was", "were", "this", "that"
}

# -------------------- SYNONYMS --------------------
SYNONYMS = {
    "vaccine": ["vaccines", "vaccination", "vaccinations", "immunization", "immunisation"],
    "child": ["children", "infant", "baby"],
    "pregnant": ["pregnancy", "maternity"],
    "pension": ["retirement", "oldage", "senior"],
    "accident": ["disaster", "fire", "flood", "cyclone"],
    "health": ["medical", "hospital", "treatment"],
    "education": ["school", "college", "study", "postgraduate", "masters", "phd", "doctorate"]
}

# -------------------- IMPORTANT PHRASES --------------------
IMPORTANT_PHRASES = [
    "lost certificate", "lost certificates", "lost document", "lost documents",
    "fire accident", "fire disaster", "document replacement", "certificate reissue",
    "certificate replacement", "disaster relief", "accident compensation",
    "reissue certificate", "reissue document", "replace certificate",
    "replace document", "document loss", "certificate loss"
]

# -------------------- TEXT NORMALIZATION --------------------
def normalize_text(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return text

# -------------------- FLATTEN JSON --------------------
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

# -------------------- KEYWORDS --------------------
def extract_keywords(text):
    words = normalize_text(text).split()
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    # Add stemmed versions
    stemmed = [simple_stem(w) for w in keywords]
    return list(set(keywords + stemmed))  # Combine original + stemmed

def expand_keywords(words):
    expanded = set(words)
    for word in words:
        for key, values in SYNONYMS.items():
            if word == key:
                expanded.update(values)
            elif word in values:
                expanded.add(key)
        # Add stemmed version of the word
        expanded.add(simple_stem(word))
    return list(expanded)

# -------------------- FUZZY MATCH --------------------
def fuzzy_match(word, target_words, threshold=0.75):
    # Also check stemmed versions
    word_stem = simple_stem(word)
    for tw in target_words:
        tw_stem = simple_stem(tw)
        # Check original words
        matches = sum(1 for a, b in zip(word, tw) if a == b)
        similarity = matches / max(len(word), len(tw))
        if similarity >= threshold:
            return True
        # Check stemmed versions
        if word_stem == tw_stem:
            return True
    return False

# -------------------- SCORING (ENHANCED) --------------------
def score_record(record, record_text, query_words, query_text):
    score = 0
    record_words = record_text.split()
    record_counter = Counter(record_words)

    # ===== OPTION 1: MULTI-WORD PHRASE DETECTION =====
    # Check for important phrase matches
    for phrase in IMPORTANT_PHRASES:
        if phrase in query_text and phrase in record_text:
            score += 20  # Strong boost for phrase match

    # Exact full query phrase match (very strong)
    if query_text in record_text:
        score += 12

    # Keyword + fuzzy match
    for word in query_words:
        if word in record_counter:
            score += 4 * record_counter[word]
        elif fuzzy_match(word, record_words):
            score += 2

    # Name / Title boost (Google-like)
    for key in record.keys():
        if key.lower() in {"name", "title"}:
            name_text = normalize_text(str(record[key]))
            for word in query_words:
                if word in name_text:
                    score += 6

    return score

# -------------------- COUNT KEYWORD MATCHES --------------------
def count_keyword_matches(record_text, keywords):
    """Count how many unique keywords appear in the record"""
    matches = 0
    for keyword in keywords:
        if keyword in record_text:
            matches += 1
    return matches

# -------------------- DISPLAY --------------------
def display_record(record):
    for key, value in record.items():
        if isinstance(value, list):
            print(f"{key.capitalize():20}: {', '.join(map(str, value))}")
        elif isinstance(value, dict):
            print(f"{key.capitalize():20}: {json.dumps(value, indent=2)}")
        else:
            print(f"{key.capitalize():20}: {value}")
    print("-" * 80)

# -------------------- MAIN LOOP --------------------
while True:
    user_input = input("You: ").strip()

    if user_input.lower() == "exit":
        print("Bot: Goodbye 👋")
        break

    query_text = normalize_text(user_input)
    keywords = extract_keywords(user_input)
    original_keywords = keywords.copy()  # Keep original before expansion
    keywords = expand_keywords(keywords)

    if not keywords:
        print("Bot: Please enter a meaningful query.\n")
        continue

    scored_results = []

    for record in data:
        record_text = flatten_json(record)
        score = score_record(record, record_text, keywords, query_text)
        if score > 0:
            scored_results.append((score, record, record_text))

    if not scored_results:
        print("Bot: No relevant results found.\n")
        continue

    # ===== OPTION 2: BOOLEAN AND LOGIC FILTER =====
    # For multi-word queries, require multiple keyword matches
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
        # For single/double word queries, keep all scored results
        scored_results = [(s, r) for s, r, _ in scored_results]

    # -------- GOOGLE-STYLE RANKING --------
    scored_results.sort(key=lambda x: x[0], reverse=True)

    best_score, best_record = scored_results[0]

    close_results = [
        rec for score, rec in scored_results
        if score >= GOOGLE_THRESHOLD * best_score
    ][:TOP_K]

    print(f"\nBest matching result:\n")
    display_record(best_record)

    if len(close_results) > 1:
        print(f"\nRelated results:\n")
        for i, rec in enumerate(close_results[1:], 1):
            display_record(rec)