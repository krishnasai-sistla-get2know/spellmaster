import json
import requests
import time
from datetime import datetime

# Load the data
with open(file="/workspaces/spellmaster/mywords.json", mode="r") as f:
    data = json.load(fp=f)

print(f"[{datetime.now().strftime(format='%H:%M:%S')}] Loaded {len(data)} words")

# Count missing entries
missing_meanings: int = sum(1 for item in data if item.get("MEANING") == "Not found")
missing_phonetics: int = sum(
    1 for item in data if item.get("PHONETIC") == "Phonetic not available"
)

print(f"Missing meanings: {missing_meanings}")
print(f"Missing phonetics: {missing_phonetics}")
print()


# Function to get word info with rate limiting and retry
def get_word_info(word, retry_count=3):
    for attempt in range(retry_count):
        try:
            response = requests.get(
                f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}", timeout=10
            )
            if response.status_code == 200:
                result = response.json()[0]
                phonetic = result.get("phonetic", "Phonetic not available")
                meanings = result.get("meanings", [])
                if meanings:
                    definition = (
                        meanings[0]
                        .get("definitions", [{}])[0]
                        .get("definition", "Definition not available")
                    )
                else:
                    definition = "Definition not available"
                return phonetic, definition
            elif response.status_code == 429:  # Rate limited
                wait_time = 2**attempt  # Exponential backoff
                print(
                    f"Rate limited on '{word}'. Waiting {wait_time}s before retry {attempt + 1}/{retry_count}..."
                )
                time.sleep(wait_time)
                continue
            else:
                return "Phonetic not available", "Definition not available"
        except requests.exceptions.Timeout:
            print(f"Timeout on '{word}'. Retry {attempt + 1}/{retry_count}...")
            time.sleep(2**attempt)
            continue
        except Exception as e:
            print(f"Error on '{word}': {str(object=e)}")
            return "Phonetic not available", "Definition not available"

    return "Phonetic not available", "Definition not available"


# Update missing entries
updated_count = 0
for i, item in enumerate(iterable=data):
    word = item["WORD"]
    needs_update = False

    if item.get("MEANING") == "Not found":
        phonetic, meaning = get_word_info(word)
        item["MEANING"] = meaning
        item["PHONETIC"] = phonetic
        needs_update = True
    elif item.get("PHONETIC") == "Phonetic not available":
        phonetic, meaning = get_word_info(word)
        item["PHONETIC"] = phonetic
        if meaning != "Definition not available":
            item["MEANING"] = meaning
        needs_update = True

    if needs_update:
        updated_count += 1
        print(
            f"[{datetime.now().strftime(format='%H:%M:%S')}] Updated '{word}': {item['PHONETIC']}, {item['MEANING'][:50]}..."
        )

    # Progress update every 100 words
    if (i + 1) % 100 == 0:
        print(
            f"[{datetime.now().strftime(format='%H:%M:%S')}] Processed {i + 1}/{len(data)} words. Updated: {updated_count}"
        )

    # Delay between requests to avoid rate limiting (0.5 seconds)
    time.sleep(0.5)

# Save back
with open(file="/workspaces/spellmaster/mywords.json", mode="w") as f:
    json.dump(obj=data, fp=f, separators=(',', ':'))

print()
print(f"[{datetime.now().strftime(format='%H:%M:%S')}] Done! Updated {updated_count} entries")

# Verify the update
missing_meanings_after: int = sum(1 for item in data if item.get("MEANING") == "Not found")
missing_phonetics_after: int = sum(
    1 for item in data if item.get("PHONETIC") == "Phonetic not available"
)
print(f"Remaining missing meanings: {missing_meanings_after}")
print(f"Remaining missing phonetics: {missing_phonetics_after}")
