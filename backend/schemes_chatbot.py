import json

# -------------------------------
# Load JSON
# -------------------------------
def load_schemes(file_path="schemes.json"):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# -------------------------------
# Retrieval functions
# -------------------------------
def get_scheme_by_name(schemes, scheme_name):
    scheme_name = scheme_name.lower().strip()
    for scheme in schemes:
        if scheme_name in scheme.get("scheme_name", "").lower():
            return scheme
    return None

def get_schemes_by_ministry(schemes, ministry_name):
    ministry_name = ministry_name.lower().strip()
    return [s for s in schemes if ministry_name in s.get("ministry", "").lower()]

def get_schemes_by_category(schemes, category):
    category = category.lower().strip()
    return [s for s in schemes if category == s.get("category", "").lower()]

def search_schemes_by_keyword(schemes, user_input):
    user_input = user_input.lower().strip()
    results = []

    for s in schemes:
        # 1️⃣ check scheme_name
        if user_input in s.get("scheme_name","").lower():
            results.append(s)
            continue
        # 2️⃣ check objective
        if user_input in s.get("objective","").lower():
            results.append(s)
            continue
        # 3️⃣ check keywords (allow multi-word match)
        for kw in s.get("keywords", []):
            if all(word in kw.lower() for word in user_input.split()):
                results.append(s)
                break
    return results

# -------------------------------
# Pretty print
# -------------------------------
def print_scheme(scheme):
    if not scheme:
        print("No scheme found.\n")
        return
    print("\n--- Scheme Details ---")
    print(f"Ministry  : {scheme.get('ministry', 'N/A')}")
    print(f"Scheme    : {scheme.get('scheme_name', 'N/A')}")
    print(f"Category  : {scheme.get('category', 'N/A')}")
    print(f"Objective : {scheme.get('objective', 'N/A')}")
    print(f"Keywords  : {', '.join(scheme.get('keywords', []))}")
    print("----------------------\n")

# -------------------------------
# Chatbot loop
# -------------------------------
def chatbot():
    schemes = load_schemes()
    print("Hello! I am GovMithra, your Government Services Chatbot. Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            print("GovMithra: Goodbye! Stay informed and safe.")
            break

        # 1️⃣ Scheme search
        if user_input.lower().startswith("scheme:"):
            query = user_input.split("scheme:")[1].strip()
            scheme = get_scheme_by_name(schemes, query)
            print_scheme(scheme)

        # 2️⃣ Ministry search
        elif user_input.lower().startswith("ministry:"):
            query = user_input.split("ministry:")[1].strip()
            results = get_schemes_by_ministry(schemes, query)
            if results:
                print(f"\nSchemes under {query}:")
                for s in results:
                    print("-", s.get("scheme_name", "N/A"))
                print()
            else:
                print("No schemes found for this ministry.\n")

        # 3️⃣ Category search
        elif user_input.lower().startswith("category:"):
            query = user_input.split("category:")[1].strip()
            results = get_schemes_by_category(schemes, query)
            if results:
                print(f"\nSchemes in category '{query}':")
                for s in results:
                    print("-", s.get("scheme_name", "N/A"))
                print()
            else:
                print("No schemes found in this category.\n")

        # 4️⃣ Fallback: keyword search
        else:
            results = search_schemes_by_keyword(schemes, user_input)
            if results:
                print(f"\nSchemes related to '{user_input}':")
                for s in results:
                    print("-", s.get("scheme_name", "N/A"))
                print()
            else:
                print("Sorry, I couldn't find any schemes related to that.\n")

# -------------------------------
# Run chatbot
# -------------------------------
if __name__ == "__main__":
    chatbot()
