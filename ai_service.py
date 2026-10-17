import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load local .env from project directory reliably
_env_path = Path(__file__).resolve().parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    load_dotenv()

DEFAULT_MODEL = "gemma-4-26b-a4b-it"

# Fast, ultra-reliable fallback models in order of responsiveness
FAST_FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

# Timeouts in milliseconds
PRIMARY_TIMEOUT_MS = 14000   # 14s for Gemma 4 (catches cloud queue stalls early)
FALLBACK_TIMEOUT_MS = 20000  # 20s for fast production fallback

logger = logging.getLogger(__name__)


class RecipeGenerationError(RuntimeError):
    """A clear, user-facing error for recipe generation failures."""


def get_api_key() -> str:
    """Retrieve Gemini API key from environment or Streamlit secrets."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key and key != "your_actual_api_key" and key != "your_real_api_key":
        return key
    try:
        import streamlit as st
        if "GEMINI_API_KEY" in st.secrets:
            key = str(st.secrets["GEMINI_API_KEY"]).strip()
            if key and key != "your_actual_api_key" and key != "your_real_api_key":
                return key
    except Exception:
        pass
    return ""


def get_active_model() -> str:
    """Retrieve configured Gemma model name."""
    model = (os.getenv("GEMMA_MODEL") or "").strip().strip('"').strip("'")
    if not model:
        try:
            import streamlit as st
            if "GEMMA_MODEL" in st.secrets:
                model = str(st.secrets["GEMMA_MODEL"]).strip()
        except Exception:
            pass
    return model or DEFAULT_MODEL


def _clean_trailing_commas(json_str: str) -> str:
    """Remove trailing commas before closing braces/brackets."""
    return re.sub(r",\s*([\]}])", r"\1", json_str)


def _repair_json_string(text: str) -> Optional[dict]:
    """Attempt aggressive repairs on malformed LLM JSON strings."""
    cleaned = text.strip()
    # Replace unescaped newlines within quotes
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    try:
        # Strip code blocks
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if match:
                cleaned = match.group(1).strip()
        cleaned = _clean_trailing_commas(cleaned)
        return json.loads(cleaned)
    except Exception:
        pass

    # Find outermost curly braces
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cand = cleaned[start:end + 1]
        try:
            return json.loads(cand)
        except Exception:
            try:
                return json.loads(_clean_trailing_commas(cand))
            except Exception:
                pass
    return None


def _extract_json(text: str) -> dict[str, Any]:
    """Parse model output with multi-tier recovery."""
    data = _repair_json_string(text)
    if isinstance(data, dict):
        return data

    raise RecipeGenerationError(
        "Mom's Kitchen AI encountered a formatting issue while plating your recipes. Please try once more."
    )


def _build_prompt(
    ingredients: list[str],
    dietary: str,
    cooking_time: str,
    servings: int,
    prioritize_soon: bool,
    cuisine: str = "Any",
    difficulty: str = "Any",
    allergies: Optional[list[str]] = None,
    rescue_mode: bool = False,
) -> str:
    ingredient_text = ", ".join(ingredients)
    allergies_text = ", ".join(allergies) if allergies else "None"
    
    priority_note = (
        "RESCUE MODE ACTIVE: These ingredients are approaching expiration. Prioritize maximizing their usage first."
        if (rescue_mode or prioritize_soon)
        else "Use available ingredients sensibly."
    )

    allergy_rule = ""
    if allergies and len(allergies) > 0:
        allergy_rule = f"""
CRITICAL SAFETY RULE — STRICT ALLERGY EXCLUSIONS:
The user is allergic or has strict exclusions for: {allergies_text}.
Under NO CIRCUMSTANCES include any of these items, or common ingredients derived from them, in the recipes, missing ingredients, or substitutions. If an ingredient usually contains them, explicitly specify a safe alternative.
"""

    return f"""You are Mom's Kitchen AI, a warm, caring, world-class zero-waste culinary expert.
Create exactly 3 realistic, delicious, creative recipes using the available ingredients below.

AVAILABLE INGREDIENTS: {ingredient_text}
DIETARY PREFERENCE: {dietary}
PREFERRED CUISINE: {cuisine}
TARGET DIFFICULTY: {difficulty}
MAX TIME LIMIT: {cooking_time}
SERVINGS: {servings}
PRIORITY: {priority_note}
{allergy_rule}

Culinary Objectives:
1. Maximize use of provided leftover ingredients.
2. Minimize extra missing ingredients (stick to basic pantry staples like salt, oil, pepper when possible).
3. Provide accurate measurement amounts and units for every ingredient.
4. Explain why each dish is recommended (e.g. how it saves food).
5. Provide practical substitutions and storage advice.

Output MUST be strictly valid JSON conforming to this schema (no extra text, no markdown wrappers):
{{
  "recipes": [
    {{
      "name": "Recipe Name",
      "description": "Appetizing 1-sentence summary.",
      "prep_time_minutes": 10,
      "cook_time_minutes": 15,
      "time_minutes": 25,
      "difficulty": "Easy",
      "servings": {servings},
      "why_recommended": "Why this dish rescues these specific ingredients.",
      "ingredients_used": [
        {{"item": "ingredient name", "amount": "2", "unit": "cups"}}
      ],
      "missing_ingredients": [
        {{"item": "staple or missing item", "amount": "1", "unit": "tbsp"}}
      ],
      "steps": [
        "Step 1 action description.",
        "Step 2 action description.",
        "Step 3 action description."
      ],
      "substitutions": [
        {{"original": "butter", "substitute": "olive oil", "notes": "Use 3/4 amount"}}
      ],
      "allergens": ["Gluten", "Dairy"],
      "storage_advice": "Refrigerate in an airtight container for up to 3 days.",
      "waste_reduction_tip": "Keep vegetable peels for homemade vegetable broth."
    }}
  ],
  "leftover_ingredients": ["list of items still left over"],
  "food_waste_tip": "One practical zero-waste tip."
}}
"""


def calculate_utilization(used_count: int, missing_count: int) -> int:
    """
    Calculate and display an ingredient utilization percentage using a clearly defined formula:
    Utilization % = (pantry_ingredients_used / (pantry_ingredients_used + missing_ingredients)) * 100
    """
    total = used_count + missing_count
    if total <= 0:
        return 100
    return round((used_count / total) * 100)


def generate_recipes(
    ingredients: list[str],
    dietary: str = "Vegetarian",
    cooking_time: str = "30 minutes",
    servings: int = 2,
    prioritize_soon: bool = True,
    model_override: str | None = None,
    allow_fallback: bool = True,
    cuisine: str = "Any",
    difficulty: str = "Any",
    allergies: Optional[list[str]] = None,
    rescue_mode: bool = False,
) -> dict[str, Any]:
    api_key = get_api_key()
    if not api_key:
        raise RecipeGenerationError(
            "Gemini API key not found. Add GEMINI_API_KEY=your_key to a local .env file."
        )

    chosen_model = model_override or get_active_model()
    is_gemma = "gemma" in chosen_model.lower()
    primary_timeout = PRIMARY_TIMEOUT_MS if is_gemma else FALLBACK_TIMEOUT_MS

    # Client configured with strict timeout
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=primary_timeout,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )

    prompt = _build_prompt(
        ingredients=ingredients,
        dietary=dietary,
        cooking_time=cooking_time,
        servings=servings,
        prioritize_soon=prioritize_soon,
        cuisine=cuisine,
        difficulty=difficulty,
        allergies=allergies,
        rescue_mode=rescue_mode,
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.2,
    )

    response = None
    used_model = chosen_model
    fallback_used = False
    fallback_reason = ""

    # Primary attempt
    try:
        response = client.models.generate_content(
            model=chosen_model,
            contents=prompt,
            config=config,
        )
    except Exception as primary_exc:
        err_msg = str(primary_exc)
        logger.warning("Primary model %s failed: %s", chosen_model, err_msg)

        is_overloaded_or_timedout = any(
            x in err_msg.lower()
            for x in ["504", "deadline", "timeout", "503", "unavailable", "500", "internal", "overloaded", "spikes in demand"]
        )

        # Cascading fallback through fast production models if overloaded or timed out
        if allow_fallback and is_overloaded_or_timedout:
            fallback_client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    timeout=FALLBACK_TIMEOUT_MS,
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )
            fallback_success = False
            for fb_model in FAST_FALLBACK_MODELS:
                if fb_model == chosen_model:
                    continue
                try:
                    logger.info("Attempting fast fallback model: %s", fb_model)
                    response = fallback_client.models.generate_content(
                        model=fb_model,
                        contents=prompt,
                        config=config,
                    )
                    used_model = fb_model
                    fallback_used = True
                    fallback_reason = f"Gemma 4 cloud servers were under peak demand; seamlessly generated via {fb_model}."
                    fallback_success = True
                    break
                except Exception as fb_exc:
                    logger.warning("Fallback model %s failed: %s", fb_model, fb_exc)

            if not fallback_success:
                raise RecipeGenerationError(
                    "Gemma 4 servers are experiencing peak cloud demand right now. Please select 'Turbo Flash Mode' in the sidebar for instant recipe generation."
                ) from primary_exc
        else:
            if "api_key_invalid" in err_msg.lower() or "invalid api key" in err_msg.lower():
                raise RecipeGenerationError("The Gemini API key is invalid. Please check your key in Google AI Studio.") from primary_exc
            if "not found" in err_msg.lower() or "404" in err_msg:
                raise RecipeGenerationError(f"Model '{chosen_model}' was not found for your API key.") from primary_exc
            if "429" in err_msg or "resource_exhausted" in err_msg.lower():
                raise RecipeGenerationError("The API rate limit was reached. Please wait a minute and try again.") from primary_exc
            if is_overloaded_or_timedout:
                raise RecipeGenerationError(
                    "Gemma 4 servers are experiencing high traffic right now. Switch to 'Turbo Flash Mode' in the sidebar for instant recipes."
                ) from primary_exc

            raise RecipeGenerationError(f"API request failed ({err_msg}). Check your connection and try again.") from primary_exc

    output = getattr(response, "text", None)
    if not output:
        raise RecipeGenerationError(
            "The model returned an empty response. Please click Craft Recipes again."
        )

    data = _extract_json(output)
    recipes = data.get("recipes")
    if not isinstance(recipes, list):
        raise RecipeGenerationError("The model response did not contain recipe cards. Please try again.")

    # Normalize fields and ensure rich structure
    normalized = []
    for recipe in recipes[:3]:
        if not isinstance(recipe, dict):
            continue

        raw_used = recipe.get("ingredients_used", [])
        raw_missing = recipe.get("missing_ingredients", [])

        # Parse ingredients into rich objects and string list for backward compatibility
        norm_used = _normalize_ingredient_items(raw_used)
        norm_missing = _normalize_ingredient_items(raw_missing)

        # Legacy string lists
        used_strings = [item["item"] for item in norm_used]
        missing_strings = [item["item"] for item in norm_missing]

        # Calculate ingredient utilization percentage
        util_pct = calculate_utilization(len(norm_used), len(norm_missing))

        total_time = recipe.get("time_minutes")
        prep_time = recipe.get("prep_time_minutes", 10)
        cook_time = recipe.get("cook_time_minutes", 15)
        if total_time is None or total_time == "—":
            try:
                total_time = int(prep_time) + int(cook_time)
            except Exception:
                total_time = 25

        normalized.append({
            "name": str(recipe.get("name", "Artisan Leftover Dish")),
            "description": str(recipe.get("description", "")),
            "prep_time_minutes": prep_time,
            "cook_time_minutes": cook_time,
            "time_minutes": total_time,
            "difficulty": str(recipe.get("difficulty", "Easy")),
            "servings": recipe.get("servings", servings),
            "why_recommended": str(recipe.get("why_recommended", "Rescues pantry ingredients before they spoil.")),
            "utilization_percentage": util_pct,
            "ingredients_used_detailed": norm_used,
            "missing_ingredients_detailed": norm_missing,
            "ingredients_used": used_strings,          # Backward-compatibility with existing frontend
            "missing_ingredients": missing_strings,  # Backward-compatibility with existing frontend
            "steps": _as_string_list(recipe.get("steps")),
            "substitutions": recipe.get("substitutions") if isinstance(recipe.get("substitutions"), list) else [],
            "allergens": _as_string_list(recipe.get("allergens")),
            "storage_advice": str(recipe.get("storage_advice", "Store in an airtight container in the refrigerator for up to 3 days.")),
            "waste_reduction_tip": str(recipe.get("waste_reduction_tip", "")),
        })

    data["recipes"] = normalized
    data["leftover_ingredients"] = _as_string_list(data.get("leftover_ingredients"))
    data["food_waste_tip"] = str(data.get("food_waste_tip", ""))
    data["_metadata"] = {
        "model_used": used_model,
        "fallback_used": fallback_used,
        "fallback_reason": fallback_reason,
        "utilization_formula": "utilization_pct = round((len(used) / (len(used) + len(missing))) * 100)",
    }
    return data


def _normalize_ingredient_items(raw_list: Any) -> list[dict[str, str]]:
    """Convert mixed string / dict ingredient list into clean structured list of dicts."""
    if not isinstance(raw_list, list):
        return []
    items = []
    for item in raw_list:
        if isinstance(item, dict):
            name = str(item.get("item", item.get("name", ""))).strip()
            amount = str(item.get("amount", item.get("quantity", "1"))).strip()
            unit = str(item.get("unit", "")).strip()
            if name:
                items.append({"item": name, "amount": amount, "unit": unit})
        elif isinstance(item, str) and item.strip():
            # Try to parse string like "2 cups cooked rice"
            parts = item.strip().split(" ", 2)
            if len(parts) >= 3 and parts[0].replace(".", "", 1).isdigit():
                items.append({"item": parts[2], "amount": parts[0], "unit": parts[1]})
            else:
                items.append({"item": item.strip(), "amount": "as needed", "unit": ""})
    return items


def _as_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None and str(item).strip()]


# ==============================================================================
# SMART INGREDIENT SUBSTITUTIONS (PHASE 3)
# ==============================================================================

# Curated culinary substitutions knowledge-base for zero-latency instant responses
COMMON_SUBSTITUTIONS = {
    "egg": [
        {"replacement": "Flaxseed meal + water", "ratio": "1 tbsp ground flax + 3 tbsp water per egg", "flavor_texture": "Nutty flavor, slightly denser crumb; excellent binding", "limitations": "Not suitable for meringues or souffles", "dietary": ["Vegan", "Gluten-free", "Dairy-free"]},
        {"replacement": "Mashed ripe banana", "ratio": "1/2 ripe banana per egg", "flavor_texture": "Adds mild banana sweetness and moisture", "limitations": "Best in pancakes, quick breads, and baked goods", "dietary": ["Vegan", "Gluten-free", "Dairy-free"]},
        {"replacement": "Unsweetened applesauce", "ratio": "1/4 cup applesauce per egg", "flavor_texture": "Moist, neutral flavor, tender texture", "limitations": "May need 1/2 tsp extra baking powder", "dietary": ["Vegan", "Gluten-free", "Dairy-free"]},
    ],
    "milk": [
        {"replacement": "Oat milk or almond milk", "ratio": "1:1 equal volume", "flavor_texture": "Oat milk provides creamy neutral mouthfeel", "limitations": "Check for added sugars in savory dishes", "dietary": ["Vegan", "Dairy-free"]},
        {"replacement": "Water + 1 tbsp butter/oil", "ratio": "1 cup water + 1 tbsp fat per cup of milk", "flavor_texture": "Provides necessary fat content in baking batters", "limitations": "Lacks dairy sweetness; suitable for pancakes/waffles", "dietary": ["Vegetarian"]},
    ],
    "butter": [
        {"replacement": "Olive oil or vegetable oil", "ratio": "3/4 cup oil per 1 cup butter", "flavor_texture": "Olive oil adds fruitiness; neutral oil stays unobtrusive", "limitations": "Cannot be creamed with sugar for light cakes", "dietary": ["Vegan", "Dairy-free"]},
        {"replacement": "Coconut oil", "ratio": "1:1 solid coconut oil", "flavor_texture": "Solidifies similarly to butter; slight coconut aroma unless refined", "limitations": "High melting point; watch pan temperature", "dietary": ["Vegan", "Dairy-free"]},
    ],
    "heavy cream": [
        {"replacement": "Full-fat coconut milk", "ratio": "1:1 equal volume", "flavor_texture": "Rich and silky, mild coconut undertone", "limitations": "Noticeable aroma in very mild soups", "dietary": ["Vegan", "Dairy-free", "Gluten-free"]},
        {"replacement": "Milk + melted butter", "ratio": "3/4 cup milk + 1/4 cup melted butter", "flavor_texture": "Very close to heavy cream in pan sauces and soups", "limitations": "Cannot be whipped into stiff peaks", "dietary": ["Vegetarian"]},
    ],
    "buttermilk": [
        {"replacement": "Milk + lemon juice / white vinegar", "ratio": "1 cup milk + 1 tbsp acid, let sit 5 mins", "flavor_texture": "Clabbered acidity identical to buttermilk", "limitations": "Slightly thinner viscosity", "dietary": ["Vegetarian", "Gluten-free"]},
    ],
    "sour cream": [
        {"replacement": "Plain Greek yogurt", "ratio": "1:1 equal volume", "flavor_texture": "Tangy and thick with higher protein and lower fat", "limitations": "May curdle under boiling heat; stir in off the flame", "dietary": ["Vegetarian", "Gluten-free"]},
    ],
    "soy sauce": [
        {"replacement": "Coconut aminos", "ratio": "1:1 volume (add pinch of salt)", "flavor_texture": "Slightly sweeter and lower in sodium, rich umami", "limitations": "Less salty than dark soy sauce", "dietary": ["Gluten-free", "Soy-free", "Vegan"]},
        {"replacement": "Tamari (Gluten-free)", "ratio": "1:1 volume", "flavor_texture": "Deeper, richer soy aroma with no wheat", "limitations": "Still contains soy", "dietary": ["Gluten-free", "Vegan"]},
    ],
    "breadcrumbs": [
        {"replacement": "Rolled oats (coarsely blended)", "ratio": "1:1 volume", "flavor_texture": "Hearty texture, excellent binder for patties/meatballs", "limitations": "Slightly softer outer crunch", "dietary": ["Gluten-free", "Vegan"]},
        {"replacement": "Crushed cornflakes or crackers", "ratio": "1:1 volume", "flavor_texture": "Extra crisp golden coating", "limitations": "Check salt/sugar levels in the brand", "dietary": ["Vegetarian"]},
    ],
    "cornstarch": [
        {"replacement": "All-purpose flour", "ratio": "2 tbsp flour per 1 tbsp cornstarch", "flavor_texture": "Requires cooking for 2 mins to eliminate raw flour taste", "limitations": "Cloudier sauce finish", "dietary": ["Vegetarian", "Vegan"]},
        {"replacement": "Arrowroot powder / tapioca starch", "ratio": "1:1 volume", "flavor_texture": "Glossy sheen, completely odorless and neutral", "limitations": "Do not overheat or it breaks down", "dietary": ["Gluten-free", "Vegan"]},
    ],
    "garlic": [
        {"replacement": "Garlic powder", "ratio": "1/8 tsp garlic powder per fresh clove", "flavor_texture": "Even garlic seasoning without fresh pungency", "limitations": "Lacks the textural saute aroma of browned garlic", "dietary": ["Vegan", "Gluten-free"]},
        {"replacement": "Shallots or chives", "ratio": "1 tbsp minced shallot per clove", "flavor_texture": "Mild, delicate allium sweetness", "limitations": "Less sharp punch than raw garlic", "dietary": ["Vegan", "Gluten-free"]},
    ],
    "tomato paste": [
        {"replacement": "Tomato sauce / puree (simmered down)", "ratio": "3 tbsp puree simmered to 1 tbsp paste", "flavor_texture": "Rich concentrated tomato acidity", "limitations": "Takes 5 mins of extra simmering", "dietary": ["Vegan", "Gluten-free"]},
    ],
}


ALLERGEN_DERIVATIVES = {
    "dairy": ["dairy", "milk", "butter", "cream", "cheese", "yogurt", "ghee", "whey", "casein", "buttermilk"],
    "lactose": ["dairy", "milk", "butter", "cream", "cheese", "yogurt", "lactose", "buttermilk"],
    "gluten": ["gluten", "wheat", "flour", "breadcrumbs", "barley", "rye", "semolina", "couscous", "pasta"],
    "wheat": ["wheat", "flour", "breadcrumbs", "semolina", "couscous"],
    "peanuts": ["peanut", "peanuts", "groundnut"],
    "tree nuts": ["nut", "nuts", "almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "macadamia"],
    "nuts": ["nut", "nuts", "almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "peanut"],
    "eggs": ["egg", "eggs", "mayonnaise", "albumen"],
    "egg": ["egg", "eggs", "mayonnaise", "albumen"],
    "soy": ["soy", "soya", "tofu", "tempeh", "edamame", "tamari"],
    "fish": ["fish", "salmon", "tuna", "cod", "anchovy", "tilapia", "halibut"],
    "shellfish": ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
    "sesame": ["sesame", "tahini"],
}


def get_ingredient_substitutions(
    ingredient: str,
    recipe_context: str = "",
    dietary: str = "No preference",
    allergies: Optional[list[str]] = None,
) -> dict[str, Any]:
    """
    Find safe, practical ingredient substitutions respecting user dietary rules and allergies.
    Checks curated culinary knowledge base first; falls back to LLM for uncommon ingredients.
    """
    clean_ing = ingredient.lower().strip()
    allergies = allergies or []

    # Build comprehensive blocked keywords from allergies
    blocked_keywords = set()
    for a in allergies:
        a_clean = a.lower().strip()
        blocked_keywords.add(a_clean)
        if a_clean in ALLERGEN_DERIVATIVES:
            for deriv in ALLERGEN_DERIVATIVES[a_clean]:
                blocked_keywords.add(deriv)

    # Check curated dictionary
    matched_key = None
    for key in COMMON_SUBSTITUTIONS:
        if key in clean_ing or clean_ing in key:
            matched_key = key
            break

    if matched_key:
        candidates = COMMON_SUBSTITUTIONS[matched_key]
        filtered = []
        for c in candidates:
            # Check dietary and allergy constraints
            c_text = f"{c['replacement']} {c['flavor_texture']} {c['ratio']}".lower()
            is_safe = True
            for kw in blocked_keywords:
                # Word boundary match
                if re.search(rf"\b{re.escape(kw)}\b", c_text):
                    is_safe = False
                    break
            if "vegan" in dietary.lower() and "Vegan" not in c.get("dietary", []):
                is_safe = False
            if "gluten-free" in dietary.lower() and "Gluten-free" not in c.get("dietary", []):
                is_safe = False
            if "dairy-free" in dietary.lower() and any(d in c_text for d in ALLERGEN_DERIVATIVES["dairy"]):
                is_safe = False
            if is_safe:
                filtered.append(c)

        if filtered:
            return {
                "ingredient": ingredient,
                "found": True,
                "substitutions": filtered,
                "source": "curated_culinary_kb",
                "disclaimer": "Substitutions may alter taste, texture, and cooking time. Use as a creative culinary guide.",
            }

    # If not in curated KB or filtered out, query Gemini
    api_key = get_api_key()
    if not api_key:
        return {
            "ingredient": ingredient,
            "found": False,
            "substitutions": [],
            "message": f"No immediate substitute found for '{ingredient}'. Try a similar pantry staple.",
            "disclaimer": "Always inspect and taste adjustments gradually.",
        }

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=10000),
        )
        allergy_str = ", ".join(allergies) if allergies else "None"
        prompt = f"""You are a culinary expert on recipe substitutions.
Suggest 2 practical kitchen substitutes for: "{ingredient}".
Dish context: {recipe_context or 'General cooking'}
Dietary Preference: {dietary}
Excluded Allergens (NEVER USE): {allergy_str}

Return STRICT JSON:
{{
  "substitutions": [
    {{
      "replacement": "Substitute name",
      "ratio": "e.g. 1 tbsp substitute for 1 tbsp original",
      "flavor_texture": "Short explanation of difference",
      "limitations": "When not to use it"
    }}
  ]
}}
"""
        res = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = _extract_json(res.text)
        subs = data.get("substitutions", [])
        return {
            "ingredient": ingredient,
            "found": len(subs) > 0,
            "substitutions": subs,
            "source": "ai_culinary_engine",
            "disclaimer": "Substitutions may alter taste, texture, and cooking time. Use as a creative culinary guide.",
        }
    except Exception as exc:
        logger.warning("Dynamic substitution failed: %s", exc)
        return {
            "ingredient": ingredient,
            "found": False,
            "substitutions": [],
            "message": f"Could not determine substitute for '{ingredient}'.",
            "disclaimer": "Always test small amounts first.",
        }


# ==============================================================================
# MULTIMODAL INGREDIENT IMAGE SCANNER (PHASE 9)
# ==============================================================================

def scan_ingredients_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict[str, Any]:
    """
    Detect likely food and pantry ingredients from an uploaded image using gemini-2.5-flash.
    Returns detected ingredients with confidence ratings and recommended storage category.
    """
    api_key = get_api_key()
    if not api_key:
        raise RecipeGenerationError("Gemini API key is required to scan pantry images.")

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=18000),
    )

    prompt = """Inspect this image carefully and identify all visible food ingredients, fresh produce, pantry staples, and leftovers.
Return a STRICT JSON list of ingredients detected.
Exclude non-food items, kitchen tools, packaging, and utensils.

JSON Schema:
{
  "detected_ingredients": [
    {
      "name": "Tomatoes",
      "estimated_quantity": 4,
      "unit": "pcs",
      "category": "Produce",
      "confidence": "High",
      "estimated_freshness_days": 4
    }
  ],
  "image_summary": "Short 1-sentence description of the scanned items."
}
Categories must be one of: "Produce", "Dairy & Eggs", "Grains & Pasta", "Bakery", "Proteins", "Pantry & Spices", "Canned & Preserved", "Other".
Confidence must be one of: "High", "Medium", "Low".
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt,
            ],
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        output = getattr(response, "text", "")
        data = _extract_json(output)
        items = data.get("detected_ingredients", [])

        # Validate and clean items
        cleaned_items = []
        for it in items:
            if isinstance(it, dict) and it.get("name"):
                cleaned_items.append({
                    "name": str(it["name"]).strip().title(),
                    "estimated_quantity": float(it.get("estimated_quantity") or 1.0),
                    "unit": str(it.get("unit") or "pcs").strip(),
                    "category": str(it.get("category") or "Produce").strip(),
                    "confidence": str(it.get("confidence") or "High").strip(),
                    "estimated_freshness_days": int(it.get("estimated_freshness_days") or 5),
                })

        return {
            "success": True,
            "detected_ingredients": cleaned_items,
            "image_summary": data.get("image_summary", f"Detected {len(cleaned_items)} items in your pantry image."),
        }
    except Exception as exc:
        logger.error("Image scan failed: %s", exc)
        raise RecipeGenerationError(f"Could not analyze image for ingredients: {exc}")
