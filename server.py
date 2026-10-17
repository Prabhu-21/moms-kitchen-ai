import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import db
from ai_service import (
    generate_recipes,
    get_ingredient_substitutions,
    scan_ingredients_from_image,
    get_active_model,
    get_api_key,
    RecipeGenerationError,
)

app = FastAPI(
    title="Mom's Kitchen AI API",
    description="Culinary food-waste reduction API powered by Gemma 4",
    version="2.0.0",
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class RecipeRequest(BaseModel):
    ingredients: list[str] = Field(..., min_length=1)
    dietary: str = "Vegetarian"
    cooking_time: str = "30 minutes"
    servings: int = 2
    prioritize_soon: bool = True
    model_override: Optional[str] = None
    allow_fallback: bool = True
    cuisine: str = "Any"
    difficulty: str = "Any"
    allergies: Optional[list[str]] = None
    rescue_mode: bool = False


class PantryItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    quantity: float = 1.0
    unit: str = "pcs"
    category: str = "Produce"
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None


class PantryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None


class SubstitutionRequest(BaseModel):
    ingredient: str
    recipe_context: Optional[str] = ""
    dietary: Optional[str] = "No preference"
    allergies: Optional[list[str]] = None


class SaveRecipeRequest(BaseModel):
    name: Optional[str] = None
    recipe: Dict[str, Any]


class RateRecipeRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    notes: Optional[str] = ""


class LogCookedRequest(BaseModel):
    recipe_name: str
    servings: int = 2
    ingredients_used: Optional[list[str]] = None
    notes: Optional[str] = ""


class MealPlanCreate(BaseModel):
    date: str
    meal_slot: str = "dinner"
    recipe_name: str
    recipe: Optional[Dict[str, Any]] = None
    servings: int = 2


class ShoppingItemCreate(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = "pcs"
    category: str = "Pantry"
    source: str = "manual"


class ShoppingItemUpdate(BaseModel):
    is_purchased: Optional[bool] = None
    quantity: Optional[float] = None


# ==============================================================================
# CORE & RECIPE ENDPOINTS
# ==============================================================================

@app.get("/api/config")
def get_config():
    """Return backend status and active model information."""
    api_key = get_api_key()
    return {
        "status": "online",
        "has_api_key": bool(api_key),
        "active_model": get_active_model(),
        "key_preview": f"{api_key[:6]}..." if api_key else "",
    }


@app.post("/api/recipes")
def create_recipes(req: RecipeRequest):
    """Generate 3 culinary recipes using available leftover ingredients."""
    if not req.ingredients:
        raise HTTPException(status_code=400, detail="Please provide at least one ingredient.")

    try:
        data = generate_recipes(
            ingredients=req.ingredients,
            dietary=req.dietary,
            cooking_time=req.cooking_time,
            servings=req.servings,
            prioritize_soon=req.prioritize_soon,
            model_override=req.model_override,
            allow_fallback=req.allow_fallback,
            cuisine=req.cuisine,
            difficulty=req.difficulty,
            allergies=req.allergies,
            rescue_mode=req.rescue_mode,
        )
        return data
    except RecipeGenerationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Chef AI encountered an issue generating your recipes: {exc}",
        )


@app.post("/api/substitutions")
def find_substitutions(req: SubstitutionRequest):
    """Find safe ingredient substitutions respecting allergies and diets."""
    if not req.ingredient:
        raise HTTPException(status_code=400, detail="Ingredient name is required.")
    return get_ingredient_substitutions(
        ingredient=req.ingredient,
        recipe_context=req.recipe_context or "",
        dietary=req.dietary or "No preference",
        allergies=req.allergies or [],
    )


@app.post("/api/scan-ingredients")
async def scan_pantry_image(image: UploadFile = File(...)):
    """Upload an image of pantry/fridge to automatically detect ingredients."""
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    content = await image.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        result = scan_ingredients_from_image(image_bytes=content, mime_type=image.content_type)
        return result
    except RecipeGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image scan failed: {exc}")


# ==============================================================================
# SMART PANTRY ENDPOINTS (PHASE 1)
# ==============================================================================

@app.get("/api/pantry")
def list_pantry(category: Optional[str] = None, search: Optional[str] = None, sort_by: str = "expiry"):
    """Retrieve all active pantry items with status and days remaining."""
    return db.get_pantry_items(status="active", category=category, search=search, sort_by=sort_by)


@app.post("/api/pantry")
def add_pantry_item_endpoint(item: PantryItemCreate):
    """Add a new ingredient to the smart pantry."""
    try:
        new_id = db.add_pantry_item(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            category=item.category,
            purchase_date=item.purchase_date,
            expiry_date=item.expiry_date,
        )
        return {"success": True, "id": new_id, "message": f"Added {item.name} to your pantry."}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.put("/api/pantry/{item_id}")
def update_pantry_item_endpoint(item_id: int, item: PantryItemUpdate):
    """Update details of a pantry item."""
    success = db.update_pantry_item(
        item_id=item_id,
        name=item.name,
        quantity=item.quantity,
        unit=item.unit,
        category=item.category,
        purchase_date=item.purchase_date,
        expiry_date=item.expiry_date,
        status=item.status,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Pantry item not found.")
    return {"success": True, "message": "Pantry item updated."}


@app.delete("/api/pantry/{item_id}")
def delete_pantry_item_endpoint(item_id: int):
    """Remove an item from pantry."""
    success = db.delete_pantry_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pantry item not found.")
    return {"success": True, "message": "Pantry item deleted."}


@app.post("/api/pantry/{item_id}/consume")
def consume_pantry_item_endpoint(item_id: int):
    """Mark item as consumed and add to food-waste avoided metrics."""
    success = db.consume_pantry_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pantry item not found.")
    return {"success": True, "message": "Item consumed and logged to waste-savings!"}


@app.get("/api/pantry/rescue")
def get_rescue_items_endpoint(days: int = 3):
    """Retrieve ingredients needing urgent use (Rescue Mode / Use It First)."""
    return db.get_rescue_items(days_threshold=days)


# ==============================================================================
# SAVED RECIPES & COOKBOOK ENDPOINTS (PHASE 7)
# ==============================================================================

@app.get("/api/saved-recipes")
def list_saved_recipes(search: Optional[str] = None, favorites_only: bool = False):
    """List saved recipes in user's cookbook."""
    return db.get_saved_recipes(search=search, favorites_only=favorites_only)


@app.post("/api/saved-recipes")
def save_recipe_endpoint(req: SaveRecipeRequest):
    """Bookmark and save a recipe."""
    rec_id = db.save_recipe(req.recipe, name=req.name)
    return {"success": True, "id": rec_id, "message": "Recipe saved to your cookbook."}


@app.delete("/api/saved-recipes/{recipe_id}")
def unsave_recipe_endpoint(recipe_id: int):
    """Remove recipe from cookbook."""
    success = db.unsave_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved recipe not found.")
    return {"success": True, "message": "Recipe unsaved."}


@app.post("/api/saved-recipes/{recipe_id}/favorite")
def toggle_favorite_endpoint(recipe_id: int):
    """Toggle favorite star on recipe."""
    success = db.toggle_favorite_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved recipe not found.")
    return {"success": True}


@app.post("/api/saved-recipes/{recipe_id}/rate")
def rate_recipe_endpoint(recipe_id: int, req: RateRecipeRequest):
    """Rate and review a saved recipe."""
    success = db.rate_recipe(recipe_id, rating=req.rating, notes=req.notes)
    if not success:
        raise HTTPException(status_code=404, detail="Saved recipe not found.")
    return {"success": True}


@app.post("/api/cooking-history/log")
def log_cooked_dish(req: LogCookedRequest):
    """Log that a user completed and ate a recipe (Interactive Cooking Mode finish)."""
    hist_id = db.log_recipe_cooked(
        recipe_name=req.recipe_name,
        servings=req.servings,
        ingredients_used=req.ingredients_used or [],
        notes=req.notes or "",
    )
    return {"success": True, "id": hist_id, "message": "Dish logged to your cooking history!"}


# ==============================================================================
# MEAL PLANNER ENDPOINTS (PHASE 6)
# ==============================================================================

@app.get("/api/meal-plans")
def list_meal_plans(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get weekly meal schedule."""
    return db.get_meal_plans(start_date=start_date, end_date=end_date)


@app.post("/api/meal-plans")
def create_meal_plan(plan: MealPlanCreate):
    """Add a meal to the weekly planner."""
    plan_id = db.add_meal_plan(
        date_str=plan.date,
        meal_slot=plan.meal_slot,
        recipe_name=plan.recipe_name,
        recipe_dict=plan.recipe,
        servings=plan.servings,
    )
    return {"success": True, "id": plan_id}


@app.delete("/api/meal-plans/{plan_id}")
def delete_meal_plan_endpoint(plan_id: int):
    """Delete a planned meal."""
    success = db.delete_meal_plan(plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meal plan entry not found.")
    return {"success": True}


# ==============================================================================
# SHOPPING LIST ENDPOINTS (PHASE 6)
# ==============================================================================

@app.get("/api/shopping-list")
def list_shopping_items():
    """Retrieve all shopping list items."""
    return db.get_shopping_items()


@app.post("/api/shopping-list")
def add_shopping_item_endpoint(item: ShoppingItemCreate):
    """Add item to shopping list."""
    new_id = db.add_shopping_item(
        name=item.name,
        quantity=item.quantity,
        unit=item.unit,
        category=item.category,
        source=item.source,
    )
    return {"success": True, "id": new_id}


@app.put("/api/shopping-list/{item_id}")
def update_shopping_item_endpoint(item_id: int, item: ShoppingItemUpdate):
    """Update item purchased state or quantity."""
    success = db.update_shopping_item(item_id, is_purchased=item.is_purchased, quantity=item.quantity)
    if not success:
        raise HTTPException(status_code=404, detail="Shopping item not found.")
    return {"success": True}


@app.delete("/api/shopping-list/{item_id}")
def delete_shopping_item_endpoint(item_id: int):
    """Remove item from shopping list."""
    success = db.delete_shopping_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shopping item not found.")
    return {"success": True}


@app.post("/api/shopping-list/clear-purchased")
def clear_purchased_endpoint():
    """Delete all checked off shopping items."""
    count = db.clear_purchased_shopping_items()
    return {"success": True, "deleted_count": count}


@app.post("/api/shopping-list/transfer-to-pantry")
def transfer_purchased_to_pantry_endpoint():
    """Move all purchased shopping items directly into the active pantry."""
    count = db.transfer_purchased_to_pantry()
    return {"success": True, "transferred_count": count, "message": f"Transferred {count} items to your pantry."}


@app.post("/api/shopping-list/generate-from-planner")
def generate_shopping_from_planner():
    """
    Compile missing ingredients from weekly meal plans minus active pantry stock.
    Avoids double-counting and handles pantry matching.
    """
    plans = db.get_meal_plans()
    pantry_items = db.get_pantry_items(status="active")
    pantry_names = {it["name"].lower().strip() for it in pantry_items}

    needed_map: Dict[str, Dict[str, Any]] = {}

    for plan in plans:
        recipe = plan.get("recipe")
        if not recipe or not isinstance(recipe, dict):
            continue
        missing_list = recipe.get("missing_ingredients_detailed") or recipe.get("missing_ingredients") or []
        for item in missing_list:
            if isinstance(item, dict):
                raw_name = str(item.get("item", "")).strip()
                unit = str(item.get("unit", "pcs")).strip()
                try:
                    qty = float(item.get("amount", 1))
                except Exception:
                    qty = 1.0
            else:
                raw_name = str(item).strip()
                unit = "pcs"
                qty = 1.0

            clean_key = raw_name.lower()
            if not clean_key or clean_key in pantry_names:
                # Already in pantry!
                continue

            if clean_key in needed_map:
                needed_map[clean_key]["quantity"] += qty
            else:
                needed_map[clean_key] = {
                    "name": raw_name.title(),
                    "quantity": qty,
                    "unit": unit,
                    "category": "Pantry",
                    "source": "planner",
                }

    added_count = 0
    for data in needed_map.values():
        db.add_shopping_item(
            name=data["name"],
            quantity=data["quantity"],
            unit=data["unit"],
            category=data["category"],
            source=data["source"],
        )
        added_count += 1

    return {"success": True, "items_added": added_count, "items": list(needed_map.values())}


# ==============================================================================
# ANALYTICS & FOOD-WASTE IMPACT (PHASE 8)
# ==============================================================================

@app.get("/api/analytics")
def get_analytics():
    """Compute verified food waste avoided and pantry health stats."""
    return db.get_analytics_summary()


# ==============================================================================
# USER PREFERENCES (PHASE 5)
# ==============================================================================

@app.get("/api/preferences")
def get_preferences():
    """Retrieve user kitchen settings, diet preferences, and hard allergy exclusions."""
    return db.get_user_preferences()


@app.post("/api/preferences")
def save_preferences(prefs: Dict[str, Any]):
    """Persist user kitchen settings, diet preferences, and hard allergy exclusions."""
    db.save_user_preferences(prefs)
    return {"success": True, "message": "Preferences saved."}


# ==============================================================================
# STATIC FRONTEND SERVING
# ==============================================================================

dist_dir = Path(__file__).resolve().parent / "dist"
if dist_dir.exists() and (dist_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f">> Mom's Kitchen AI Backend starting on http://localhost:{port}")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
