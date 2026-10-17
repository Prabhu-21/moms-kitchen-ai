"""
Mom's Kitchen AI — Database & Persistence Module
SQLite-based zero-dependency thread-safe persistence for:
- Smart Pantry & Expiry Tracking
- Saved Recipes & Favorites
- Weekly Meal Plans
- Smart Shopping List
- Cooking History & Food-Waste Analytics
- User Preferences & Allergy Exclusions
"""

from datetime import date, datetime, timedelta
import json
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional

DB_FILE = Path(__file__).resolve().parent / "leftover_chef.db"


def get_connection() -> sqlite3.Connection:
    """Create a thread-safe connection to the SQLite database with row factory."""
    conn = sqlite3.connect(str(DB_FILE), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize database tables with schema migrations."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Pantry Items
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pantry_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 1.0,
                unit TEXT NOT NULL DEFAULT 'pcs',
                category TEXT NOT NULL DEFAULT 'Produce',
                purchase_date TEXT,
                expiry_date TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pantry_status ON pantry_items(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiry_date)")

        # 2. Saved Recipes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                recipe_json TEXT NOT NULL,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                rating INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                times_cooked INTEGER NOT NULL DEFAULT 0,
                last_cooked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 3. Weekly Meal Plans
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meal_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                meal_slot TEXT NOT NULL,
                recipe_name TEXT NOT NULL,
                recipe_json TEXT,
                servings INTEGER DEFAULT 2,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meal_date ON meal_plans(date)")

        # 4. Shopping List Items
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shopping_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 1.0,
                unit TEXT NOT NULL DEFAULT 'pcs',
                category TEXT NOT NULL DEFAULT 'Pantry',
                is_purchased INTEGER NOT NULL DEFAULT 0,
                source TEXT DEFAULT 'manual',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 5. Cooking History / Logged Meals
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cooking_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipe_name TEXT NOT NULL,
                servings INTEGER DEFAULT 2,
                ingredients_used_json TEXT,
                waste_saved_kg REAL DEFAULT 0.35,
                notes TEXT DEFAULT '',
                cooked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 6. User Preferences & Settings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed initial sample pantry items if table is brand new
        cursor.execute("SELECT COUNT(*) FROM pantry_items")
        if cursor.fetchone()[0] == 0:
            today = date.today()
            samples = [
                ("Leftover Cooked Rice", 2.0, "cups", "Grains & Pasta", str(today - timedelta(days=2)), str(today + timedelta(days=1))),
                ("Ripe Tomatoes", 4.0, "pcs", "Produce", str(today - timedelta(days=4)), str(today + timedelta(days=1))),
                ("Red Bell Pepper", 1.0, "pcs", "Produce", str(today - timedelta(days=3)), str(today + timedelta(days=2))),
                ("Yellow Onion", 3.0, "pcs", "Produce", str(today - timedelta(days=5)), str(today + timedelta(days=12))),
                ("Cheddar Cheese", 200.0, "g", "Dairy & Eggs", str(today - timedelta(days=6)), str(today + timedelta(days=5))),
                ("Frozen Green Peas", 1.0, "bag", "Produce", str(today - timedelta(days=10)), str(today + timedelta(days=60))),
                ("Stale Sourdough Bread", 3.0, "slices", "Bakery", str(today - timedelta(days=3)), str(today + timedelta(days=1))),
            ]
            for name, qty, unit, cat, p_date, e_date in samples:
                cursor.execute("""
                    INSERT INTO pantry_items (name, quantity, unit, category, purchase_date, expiry_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'active')
                """, (name, qty, unit, cat, p_date, e_date))

        conn.commit()


# ==============================================================================
# PANTRY OPERATIONS
# ==============================================================================

def get_pantry_items(
    status: str = "active",
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "expiry",
) -> List[Dict[str, Any]]:
    """Retrieve pantry items with filtering and expiry categorization."""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM pantry_items WHERE status = ?"
        params: List[Any] = [status]

        if category and category.lower() != "all":
            query += " AND category = ?"
            params.append(category)

        if search and search.strip():
            query += " AND name LIKE ?"
            params.append(f"%{search.strip()}%")

        if sort_by == "expiry":
            query += " ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END, expiry_date ASC, name ASC"
        elif sort_by == "name":
            query += " ORDER BY name ASC"
        elif sort_by == "recent":
            query += " ORDER BY created_at DESC"
        else:
            query += " ORDER BY id DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

    today = date.today()
    items = []
    for r in rows:
        d = dict(r)
        exp_str = d.get("expiry_date")
        urgency = "fresh"
        days_left = None

        if exp_str:
            try:
                exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
                days_left = (exp_date - today).days
                if days_left < 0:
                    urgency = "expired"
                elif days_left <= 1:
                    urgency = "critical"  # today or tomorrow
                elif days_left <= 3:
                    urgency = "urgent"    # within 3 days
                elif days_left <= 7:
                    urgency = "approaching"
                else:
                    urgency = "fresh"
            except ValueError:
                pass

        d["days_left"] = days_left
        d["urgency"] = urgency
        items.append(d)

    return items


def add_pantry_item(
    name: str,
    quantity: float = 1.0,
    unit: str = "pcs",
    category: str = "Produce",
    purchase_date: Optional[str] = None,
    expiry_date: Optional[str] = None,
) -> int:
    """Add a new item to pantry."""
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Ingredient name cannot be empty.")

    p_date = purchase_date or str(date.today())

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO pantry_items (name, quantity, unit, category, purchase_date, expiry_date, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (name_clean, max(0.01, float(quantity)), unit.strip(), category.strip(), p_date, expiry_date or None))
        conn.commit()
        return cursor.lastrowid


def update_pantry_item(
    item_id: int,
    name: Optional[str] = None,
    quantity: Optional[float] = None,
    unit: Optional[str] = None,
    category: Optional[str] = None,
    purchase_date: Optional[str] = None,
    expiry_date: Optional[str] = None,
    status: Optional[str] = None,
) -> bool:
    """Update existing pantry item."""
    updates = []
    params: List[Any] = []

    if name is not None:
        name_clean = name.strip()
        if not name_clean:
            raise ValueError("Ingredient name cannot be empty.")
        updates.append("name = ?")
        params.append(name_clean)
    if quantity is not None:
        updates.append("quantity = ?")
        params.append(max(0.0, float(quantity)))
    if unit is not None:
        updates.append("unit = ?")
        params.append(unit.strip())
    if category is not None:
        updates.append("category = ?")
        params.append(category.strip())
    if purchase_date is not None:
        updates.append("purchase_date = ?")
        params.append(purchase_date or None)
    if expiry_date is not None:
        updates.append("expiry_date = ?")
        params.append(expiry_date or None)
    if status is not None:
        updates.append("status = ?")
        params.append(status)

    if not updates:
        return False

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(item_id)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE pantry_items SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        return cursor.rowcount > 0


def delete_pantry_item(item_id: int) -> bool:
    """Permanently delete or archive a pantry item."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pantry_items WHERE id = ?", (item_id,))
        conn.commit()
        return cursor.rowcount > 0


def consume_pantry_item(item_id: int, log_waste_saved: bool = True) -> bool:
    """Mark an item as consumed and log towards food waste avoided."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pantry_items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            return False

        cursor.execute("UPDATE pantry_items SET status = 'consumed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (item_id,))
        if log_waste_saved:
            cursor.execute("""
                INSERT INTO cooking_history (recipe_name, servings, ingredients_used_json, waste_saved_kg, notes)
                VALUES (?, 1, ?, 0.25, 'Consumed directly from smart pantry')
            """, (f"Rescued: {row['name']}", json.dumps([row['name']])))

        conn.commit()
        return True


def get_rescue_items(days_threshold: int = 3) -> List[Dict[str, Any]]:
    """Retrieve items needing quick use (due in <= days_threshold or expired)."""
    items = get_pantry_items(status="active")
    rescue = []
    for it in items:
        urgency = it.get("urgency")
        days = it.get("days_left")
        if urgency in ("critical", "urgent", "expired"):
            rescue.append(it)
        elif days is not None and days <= days_threshold:
            rescue.append(it)
    return rescue


# ==============================================================================
# SAVED RECIPES & COOKBOOK OPERATIONS
# ==============================================================================

def get_saved_recipes(search: Optional[str] = None, favorites_only: bool = False) -> List[Dict[str, Any]]:
    """Retrieve saved recipes."""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM saved_recipes WHERE 1=1"
        params: List[Any] = []

        if favorites_only:
            query += " AND is_favorite = 1"
        if search and search.strip():
            query += " AND name LIKE ?"
            params.append(f"%{search.strip()}%")

        query += " ORDER BY is_favorite DESC, created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()

    result = []
    for r in rows:
        d = dict(r)
        try:
            d["recipe"] = json.loads(d["recipe_json"])
        except Exception:
            d["recipe"] = {}
        result.append(d)
    return result


def save_recipe(recipe: Dict[str, Any], name: Optional[str] = None) -> int:
    """Save a recipe into user's cookbook."""
    title = name or recipe.get("name", "Artisan Leftover Dish")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO saved_recipes (name, recipe_json, is_favorite, rating, notes)
            VALUES (?, ?, 0, 0, '')
        """, (title, json.dumps(recipe)))
        conn.commit()
        return cursor.lastrowid


def unsave_recipe(recipe_id: int) -> bool:
    """Remove a recipe from user's cookbook."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM saved_recipes WHERE id = ?", (recipe_id,))
        conn.commit()
        return cursor.rowcount > 0


def toggle_favorite_recipe(recipe_id: int) -> bool:
    """Toggle favorite status of a saved recipe."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE saved_recipes SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?", (recipe_id,))
        conn.commit()
        return cursor.rowcount > 0


def rate_recipe(recipe_id: int, rating: int, notes: Optional[str] = None) -> bool:
    """Update star rating and chef notes for a recipe."""
    with get_connection() as conn:
        cursor = conn.cursor()
        if notes is not None:
            cursor.execute("UPDATE saved_recipes SET rating = ?, notes = ? WHERE id = ?", (rating, notes, recipe_id))
        else:
            cursor.execute("UPDATE saved_recipes SET rating = ? WHERE id = ?", (rating, recipe_id))
        conn.commit()
        return cursor.rowcount > 0


def log_recipe_cooked(recipe_name: str, servings: int = 2, ingredients_used: Optional[List[str]] = None, notes: str = "") -> int:
    """Record that a user prepared and ate this recipe, updating sustainability metrics."""
    ing_json = json.dumps(ingredients_used or [])
    # Calculate estimated kg saved based on 150g per serving
    waste_kg = round(max(0.1, servings * 0.175), 2)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO cooking_history (recipe_name, servings, ingredients_used_json, waste_saved_kg, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (recipe_name, servings, ing_json, waste_kg, notes))

        # Also update saved_recipes counter if matching title exists
        cursor.execute("""
            UPDATE saved_recipes
            SET times_cooked = times_cooked + 1, last_cooked_at = CURRENT_TIMESTAMP
            WHERE name = ?
        """, (recipe_name,))

        conn.commit()
        return cursor.lastrowid


# ==============================================================================
# MEAL PLANNER OPERATIONS
# ==============================================================================

def get_meal_plans(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get planned meals, optionally filtered by date range."""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM meal_plans WHERE 1=1"
        params: List[Any] = []

        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)

        query += " ORDER BY date ASC, CASE meal_slot WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 ELSE 4 END"
        cursor.execute(query, params)
        rows = cursor.fetchall()

    plans = []
    for r in rows:
        d = dict(r)
        if d.get("recipe_json"):
            try:
                d["recipe"] = json.loads(d["recipe_json"])
            except Exception:
                d["recipe"] = None
        else:
            d["recipe"] = None
        plans.append(d)
    return plans


def add_meal_plan(date_str: str, meal_slot: str, recipe_name: str, recipe_dict: Optional[Dict[str, Any]] = None, servings: int = 2) -> int:
    """Schedule a meal."""
    rec_json = json.dumps(recipe_dict) if recipe_dict else None
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO meal_plans (date, meal_slot, recipe_name, recipe_json, servings)
            VALUES (?, ?, ?, ?, ?)
        """, (date_str, meal_slot.lower().strip(), recipe_name.strip(), rec_json, servings))
        conn.commit()
        return cursor.lastrowid


def delete_meal_plan(plan_id: int) -> bool:
    """Delete a scheduled meal."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM meal_plans WHERE id = ?", (plan_id,))
        conn.commit()
        return cursor.rowcount > 0


# ==============================================================================
# SHOPPING LIST OPERATIONS
# ==============================================================================

def get_shopping_items() -> List[Dict[str, Any]]:
    """Retrieve current shopping list."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM shopping_items ORDER BY is_purchased ASC, created_at DESC")
        return [dict(r) for r in cursor.fetchall()]


def add_shopping_item(name: str, quantity: float = 1.0, unit: str = "pcs", category: str = "Pantry", source: str = "manual") -> int:
    """Add item to shopping list."""
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Item name cannot be empty.")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO shopping_items (name, quantity, unit, category, is_purchased, source)
            VALUES (?, ?, ?, ?, 0, ?)
        """, (clean_name, max(0.1, float(quantity)), unit.strip(), category.strip(), source))
        conn.commit()
        return cursor.lastrowid


def update_shopping_item(item_id: int, is_purchased: Optional[bool] = None, quantity: Optional[float] = None) -> bool:
    """Update purchase status or quantity of a shopping item."""
    updates = []
    params: List[Any] = []
    if is_purchased is not None:
        updates.append("is_purchased = ?")
        params.append(1 if is_purchased else 0)
    if quantity is not None:
        updates.append("quantity = ?")
        params.append(max(0.1, float(quantity)))

    if not updates:
        return False
    params.append(item_id)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE shopping_items SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        return cursor.rowcount > 0


def delete_shopping_item(item_id: int) -> bool:
    """Delete an item from shopping list."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM shopping_items WHERE id = ?", (item_id,))
        conn.commit()
        return cursor.rowcount > 0


def clear_purchased_shopping_items() -> int:
    """Remove purchased items from shopping list."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM shopping_items WHERE is_purchased = 1")
        conn.commit()
        return cursor.rowcount


def transfer_purchased_to_pantry() -> int:
    """Move all purchased shopping items straight into active pantry!"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM shopping_items WHERE is_purchased = 1")
        purchased = cursor.fetchall()
        if not purchased:
            return 0

        today = str(date.today())
        # Default fresh shelf life of 7 days
        default_exp = str(date.today() + timedelta(days=7))
        count = 0
        for item in purchased:
            cursor.execute("""
                INSERT INTO pantry_items (name, quantity, unit, category, purchase_date, expiry_date, status)
                VALUES (?, ?, ?, ?, ?, ?, 'active')
            """, (item["name"], item["quantity"], item["unit"], item["category"], today, default_exp))
            cursor.execute("DELETE FROM shopping_items WHERE id = ?", (item["id"],))
            count += 1

        conn.commit()
        return count


# ==============================================================================
# USER PREFERENCES & SETTINGS
# ==============================================================================

DEFAULT_PREFERENCES = {
    "dietary": "Vegetarian",
    "cuisine": "Any",
    "allergies": [],            # Hard exclusions (e.g. Peanuts, Shellfish, Gluten, Dairy)
    "disliked_ingredients": [], # e.g. Cilantro, Mushrooms
    "default_servings": 2,
    "max_cooking_time": "30 minutes",
    "difficulty_preference": "Any",
    "rescue_mode_default": True,
}


def get_user_preferences() -> Dict[str, Any]:
    """Retrieve user dietary and kitchen preferences."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value_json FROM user_preferences WHERE key = 'app_preferences'")
        row = cursor.fetchone()
        if row:
            try:
                stored = json.loads(row["value_json"])
                merged = dict(DEFAULT_PREFERENCES)
                merged.update(stored)
                return merged
            except Exception:
                pass
    return dict(DEFAULT_PREFERENCES)


def save_user_preferences(prefs: Dict[str, Any]) -> bool:
    """Persist user dietary and kitchen preferences."""
    current = get_user_preferences()
    current.update(prefs)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_preferences (key, value_json, updated_at)
            VALUES ('app_preferences', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
        """, (json.dumps(current),))
        conn.commit()
        return True


# ==============================================================================
# ANALYTICS & FOOD-WASTE IMPACT DASHBOARD
# ==============================================================================

def get_analytics_summary() -> Dict[str, Any]:
    """Compute food-waste metrics and pantry statistics from REAL stored activity."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Active pantry stats
        cursor.execute("SELECT COUNT(*) FROM pantry_items WHERE status = 'active'")
        active_pantry_count = cursor.fetchone()[0]

        # 2. Expired items
        today_str = str(date.today())
        cursor.execute("""
            SELECT COUNT(*) FROM pantry_items
            WHERE status = 'active' AND expiry_date IS NOT NULL AND expiry_date < ?
        """, (today_str,))
        expired_count = cursor.fetchone()[0]

        # 3. Urgent items (expiring in <= 2 days)
        in_two_days = str(date.today() + timedelta(days=2))
        cursor.execute("""
            SELECT COUNT(*) FROM pantry_items
            WHERE status = 'active' AND expiry_date IS NOT NULL
            AND expiry_date >= ? AND expiry_date <= ?
        """, (today_str, in_two_days))
        urgent_count = cursor.fetchone()[0]

        # 4. Total meals prepared
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(servings), 0), COALESCE(SUM(waste_saved_kg), 0.0) FROM cooking_history")
        hist_row = cursor.fetchone()
        meals_prepared = hist_row[0] or 0
        total_servings_cooked = hist_row[1] or 0
        total_waste_kg = round(float(hist_row[2] or 0.0), 2)

        # 5. Saved recipes count
        cursor.execute("SELECT COUNT(*) FROM saved_recipes")
        saved_recipes_count = cursor.fetchone()[0]

        # 6. Recent activity log
        cursor.execute("SELECT * FROM cooking_history ORDER BY cooked_at DESC LIMIT 6")
        recent_cooked = [dict(r) for r in cursor.fetchall()]

    # Documented transparent savings methodology:
    # Based on average grocery food waste cost of $3.50 per home-cooked meal portion rescued
    estimated_money_saved = round(total_servings_cooked * 3.50, 2)

    return {
        "active_pantry_count": active_pantry_count,
        "urgent_expiry_count": urgent_count,
        "expired_count": expired_count,
        "total_recipes_cooked": meals_prepared,
        "total_servings_cooked": total_servings_cooked,
        "total_waste_avoided_kg": total_waste_kg,
        "estimated_money_saved": estimated_money_saved,
        "saved_recipes_count": saved_recipes_count,
        "savings_calculation_method": "Based on documented $3.50 average grocery savings per portion saved from disposal.",
        "recent_activity": recent_cooked,
    }


# Auto-initialize DB on import
init_db()
