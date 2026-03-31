import json
import random
import re

def is_valid_skill(text):
    text = text.lower().strip()
    
    if len(text.split()) > 3:
        return False
        
    if any(word in text for word in [
        "reducing", "implemented", "optimized",
        "improved", "increased", "designed"
    ]):
        return False
        
    if any(char.isdigit() for char in text):
        return False  # removes "20%", "25%"
        
    return True

def clean_dataset(data):
    cleaned_data = []
    for record in data:
        new_annotations = []
        for ann in record.get("annotation", []):
            labels = ann.get("label", [])
            is_skill = "Skills" in labels or "Skill" in labels
            
            if not is_skill:
                new_annotations.append(ann)
                continue
                
            valid_points = []
            for point in ann.get("points", []):
                if is_valid_skill(point["text"]):
                    valid_points.append(point)
                    
            if valid_points:
                new_ann = ann.copy()
                new_ann["points"] = valid_points
                new_annotations.append(new_ann)
                
        new_record = record.copy()
        new_record["annotation"] = new_annotations
        cleaned_data.append(new_record)
        
    return cleaned_data

def synonym_augmentation(text):
    """Simple synonym replacement for action verbs or common tech terms."""
    synonyms = {
        r"\bBuilt\b": ["Developed", "Created", "Engineered", "Implemented"],
        r"\bbuilt\b": ["developed", "created", "engineered", "implemented"],
        r"\bDeveloped\b": ["Built", "Created", "Engineered", "Implemented"],
        r"\bdeveloped\b": ["built", "created", "engineered", "implemented"],
        r"\bCreated\b": ["Built", "Developed", "Engineered", "Designed"],
        r"\bcreated\b": ["built", "developed", "engineered", "designed"],
        r"\bREST APIs\b": ["RESTful APIs", "Web APIs", "Backend APIs", "REST Services"],
        r"\bFrontend\b": ["Front-end", "UI/UX", "Client-side"],
        r"\bBackend\b": ["Back-end", "Server-side", "API layer"]
    }
    
    new_text = text
    for pattern, choices in synonyms.items():
        if re.search(pattern, new_text):
            replacement = random.choice(choices)
            new_text = re.sub(pattern, replacement, new_text)
    return new_text

def load_data(filepath):
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data

def build_skill_pool(data):
    skill_pool = []
    for record in data:
        annotations = record.get("annotation", [])
        if annotations:
            for ann in annotations:
                if "Skills" in ann.get("label", []) or "Skill" in ann.get("label", []):
                    for point in ann.get("points", []):
                        skill_pool.append(point["text"])
    return list(set(skill_pool))  # unique skills

def generate_augmented_data(data, skill_pool, N=3):
    augmented_data = []
    
    for record_idx, record in enumerate(data):
        original_text = record.get("content", "")
        annotations = record.get("annotation", [])
        
        if not annotations:
            continue
        
        # We need a flat list of entities to sort by start index
        # Format: (start, end, label_list, original_text)
        entities = []
        for ann_idx, ann in enumerate(annotations):
            labels = ann.get("label", [])
            for pt_idx, pt in enumerate(ann.get("points", [])):
                entities.append({
                    "start": pt["start"],
                    "end": pt["end"],
                    "label": labels,
                    "original_text": pt["text"],
                    "ann_idx": ann_idx,
                    "pt_idx": pt_idx
                })
                
        # Sort entities by start index
        entities.sort(key=lambda x: x["start"])
        
        for _ in range(N):
            new_text = original_text
            offset_shift = 0
            new_annotations_dict = {}
            
            # Deep copy annotations structure
            for ann_idx, ann in enumerate(annotations):
                new_annotations_dict[ann_idx] = {
                    "label": ann.get("label", []),
                    "points": []
                }
            
            for ent in entities:
                start = ent["start"]
                end = ent["end"]
                labels = ent["label"]
                
                # Check if this is a skill we can augment
                is_skill = "Skills" in labels or "Skill" in labels
                
                if is_skill and skill_pool:
                    # 50% chance to replace with entirely different skill block
                    # 50% chance to do synonym augmentation on original 
                    if random.random() < 0.5:
                        replacement = random.choice(skill_pool)
                    else:
                        replacement = synonym_augmentation(ent["original_text"])
                else:
                    # Do not augment Name, Location, Companies, Designation, etc.
                    replacement = new_text[start+offset_shift : end+offset_shift]
                
                new_start = start + offset_shift
                new_end = end + offset_shift
                
                # Verify we are slicing exactly at the expected boundaries
                # Note: original text at this position in new_text is new_text[new_start:new_end]
                
                new_text = (
                    new_text[:new_start] +
                    replacement +
                    new_text[new_end:]
                )
                
                # Record the new point
                new_pt = {
                    "start": new_start,
                    "end": new_start + len(replacement),
                    "text": replacement
                }
                
                # Validation check
                assert new_text[new_start:new_start + len(replacement)] == replacement, "Offset misalignment!"
                
                new_annotations_dict[ent["ann_idx"]]["points"].append(new_pt)
                
                offset_shift += len(replacement) - (end - start)
                
            # Reconstruct annotation list
            final_annotations = []
            for ann_idx in sorted(new_annotations_dict.keys()):
                if new_annotations_dict[ann_idx]["points"]:
                    final_annotations.append(new_annotations_dict[ann_idx])
                    
            augmented_record = {
                "content": new_text,
                "annotation": final_annotations,
                "extras": record.get("extras", None)
            }
            augmented_data.append(augmented_record)
            
    return augmented_data

def main():
    print("Loading original dataset...")
    data = load_data("dataset.json")
    print(f"Loaded {len(data)} records.")
    
    print("Cleaning dataset...")
    cleaned_data = clean_dataset(data)
    
    skill_pool = build_skill_pool(cleaned_data)
    print(f"Extracted {len(skill_pool)} unique valid skill blocks for the pool.")
    
    N = 3
    print(f"Generating augmented data with N={N}...")
    augmented_data = generate_augmented_data(cleaned_data, skill_pool, N=N)
    
    print(f"Generated {len(augmented_data)} synthetic records.")
    
    final_data = cleaned_data + augmented_data
    output_file = "dataset_augmented.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for record in final_data:
            f.write(json.dumps(record) + "\n")
            
    print(f"Successfully saved {len(final_data)} total records to {output_file}.")

if __name__ == "__main__":
    main()
