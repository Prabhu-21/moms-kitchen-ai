"""
Comprehensive unit and integration test suite for Mom's Kitchen AI.
Covers:
- Database operations (Pantry, Recipes, Meal Planner, Shopping List, Analytics, Preferences)
- AI Service utilities (Formula, JSON recovery, Substitution safety)
- FastAPI REST endpoints
"""

import json
import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient

import db
import ai_service
import server


class TestLeftoverChefAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()
        cls.client = TestClient(server.app)

    # ==========================================================================
    # 1. DATABASE & PANTRY TESTS (PHASE 1)
    # ==========================================================================
    def test_pantry_crud_and_expiry_urgency(self):
        today = date.today()
        # Item 1: Expires tomorrow (critical/urgent)
        id1 = db.add_pantry_item(
            name="Test Fresh Spinach",
            quantity=250,
            unit="g",
            category="Produce",
            expiry_date=str(today + timedelta(days=1)),
        )
        self.assertGreater(id1, 0)

        # Item 2: Expired 2 days ago
        id2 = db.add_pantry_item(
            name="Test Expired Yogurt",
            quantity=1,
            unit="tub",
            category="Dairy & Eggs",
            expiry_date=str(today - timedelta(days=2)),
        )
        self.assertGreater(id2, 0)

        # Verify retrieval and urgency calculation
        items = db.get_pantry_items(search="Test Fresh Spinach")
        self.assertTrue(any(it["id"] == id1 for it in items))
        spinach = next(it for it in items if it["id"] == id1)
        self.assertIn(spinach["urgency"], ("critical", "urgent"))

        expired_items = db.get_pantry_items(search="Test Expired Yogurt")
        yogurt = next(it for it in expired_items if it["id"] == id2)
        self.assertEqual(yogurt["urgency"], "expired")

        # Test Rescue Mode retrieval
        rescue_items = db.get_rescue_items(days_threshold=2)
        rescue_ids = [it["id"] for it in rescue_items]
        self.assertIn(id1, rescue_ids)
        self.assertIn(id2, rescue_ids)

        # Test update
        db.update_pantry_item(id1, quantity=300, unit="grams")
        updated = next(it for it in db.get_pantry_items(search="Test Fresh Spinach") if it["id"] == id1)
        self.assertEqual(updated["quantity"], 300)
        self.assertEqual(updated["unit"], "grams")

        # Test consume
        consumed = db.consume_pantry_item(id1)
        self.assertTrue(consumed)
        active_after = db.get_pantry_items(status="active", search="Test Fresh Spinach")
        self.assertFalse(any(it["id"] == id1 for it in active_after))

        # Cleanup
        db.delete_pantry_item(id2)

    # ==========================================================================
    # 2. AI SERVICE & FORMULA TESTS (PHASE 2 & 3)
    # ==========================================================================
    def test_utilization_formula(self):
        # 4 pantry items used, 1 missing staple -> 4 / (4 + 1) = 80%
        pct1 = ai_service.calculate_utilization(used_count=4, missing_count=1)
        self.assertEqual(pct1, 80)

        # 3 pantry items used, 0 missing -> 100%
        pct2 = ai_service.calculate_utilization(used_count=3, missing_count=0)
        self.assertEqual(pct2, 100)

        # 0 items -> defaults safely to 100%
        pct3 = ai_service.calculate_utilization(used_count=0, missing_count=0)
        self.assertEqual(pct3, 100)

    def test_json_resilience(self):
        # Test markdown wrapper removal and trailing comma fix
        raw_output = """```json
        {
            "recipes": [
                {
                    "name": "Stir Fry",
                    "time_minutes": 15,
                }
            ],
        }
        ```"""
        parsed = ai_service._extract_json(raw_output)
        self.assertIn("recipes", parsed)
        self.assertEqual(parsed["recipes"][0]["name"], "Stir Fry")

    def test_smart_substitutions_and_allergy_safety(self):
        # Normal egg substitute
        res1 = ai_service.get_ingredient_substitutions("egg", dietary="No preference")
        self.assertTrue(res1["found"])
        self.assertGreater(len(res1["substitutions"]), 0)

        # Vegan egg substitute: should contain flaxseed or banana, no animal products
        res_vegan = ai_service.get_ingredient_substitutions("egg", dietary="Vegan")
        replacements = [s["replacement"].lower() for s in res_vegan["substitutions"]]
        self.assertTrue(any("flax" in r or "banana" in r or "applesauce" in r for r in replacements))

        # Dairy allergy test for milk: should NOT recommend cow's milk + butter
        res_dairy_free = ai_service.get_ingredient_substitutions("milk", allergies=["Dairy"])
        for sub in res_dairy_free["substitutions"]:
            self.assertNotIn("butter", sub["replacement"].lower())

    # ==========================================================================
    # 3. SAVED RECIPES & COOKBOOK (PHASE 7)
    # ==========================================================================
    def test_saved_recipes_and_cooking_history(self):
        test_recipe = {
            "name": "Test Roasted Vegetable Medley",
            "time_minutes": 25,
            "ingredients_used": ["carrots", "potatoes"],
            "steps": ["Chop veggies", "Roast at 200C"],
        }
        rec_id = db.save_recipe(test_recipe)
        self.assertGreater(rec_id, 0)

        saved = db.get_saved_recipes(search="Test Roasted")
        self.assertTrue(any(r["id"] == rec_id for r in saved))

        # Toggle favorite
        db.toggle_favorite_recipe(rec_id)
        saved_fav = next(r for r in db.get_saved_recipes(search="Test Roasted") if r["id"] == rec_id)
        self.assertEqual(saved_fav["is_favorite"], 1)

        # Rate recipe
        db.rate_recipe(rec_id, rating=5, notes="Loved the crisp edges!")
        saved_rated = next(r for r in db.get_saved_recipes(search="Test Roasted") if r["id"] == rec_id)
        self.assertEqual(saved_rated["rating"], 5)
        self.assertEqual(saved_rated["notes"], "Loved the crisp edges!")

        # Log cooked
        hist_id = db.log_recipe_cooked(
            recipe_name="Test Roasted Vegetable Medley",
            servings=3,
            ingredients_used=["carrots", "potatoes"],
        )
        self.assertGreater(hist_id, 0)

        # Verify analytics reflect cooked meal
        stats = db.get_analytics_summary()
        self.assertGreaterEqual(stats["total_recipes_cooked"], 1)
        self.assertGreaterEqual(stats["total_servings_cooked"], 3)
        self.assertGreaterEqual(stats["estimated_money_saved"], 10.50)

        # Cleanup
        db.unsave_recipe(rec_id)

    # ==========================================================================
    # 4. MEAL PLANNER & SHOPPING LIST (PHASE 6)
    # ==========================================================================
    def test_meal_planner_and_shopping_list(self):
        today_str = str(date.today())
        plan_id = db.add_meal_plan(
            date_str=today_str,
            meal_slot="dinner",
            recipe_name="Test Friday Pasta",
            recipe_dict={"missing_ingredients": ["parmesan cheese", "fresh basil"]},
            servings=2,
        )
        self.assertGreater(plan_id, 0)

        plans = db.get_meal_plans(start_date=today_str, end_date=today_str)
        self.assertTrue(any(p["id"] == plan_id for p in plans))

        # Add shopping item manually
        shop_id = db.add_shopping_item(name="Test Olive Oil", quantity=1, unit="bottle")
        self.assertGreater(shop_id, 0)

        # Mark as purchased
        db.update_shopping_item(shop_id, is_purchased=True)
        items = db.get_shopping_items()
        item = next(i for i in items if i["id"] == shop_id)
        self.assertEqual(item["is_purchased"], 1)

        # Transfer purchased to pantry
        transferred = db.transfer_purchased_to_pantry()
        self.assertGreaterEqual(transferred, 1)

        # Verify item was added to active pantry
        pantry_matches = db.get_pantry_items(search="Test Olive Oil")
        self.assertTrue(len(pantry_matches) > 0)

        # Cleanup
        for m in pantry_matches:
            db.delete_pantry_item(m["id"])
        db.delete_meal_plan(plan_id)

    # ==========================================================================
    # 5. FASTAPI REST ENDPOINTS (PHASE 1-8 INTEGRATION)
    # ==========================================================================
    def test_api_endpoints(self):
        # 1. /api/config
        cfg = self.client.get("/api/config").json()
        self.assertEqual(cfg["status"], "online")
        self.assertIn("active_model", cfg)

        # 2. /api/preferences
        prefs = self.client.get("/api/preferences").json()
        self.assertIn("dietary", prefs)
        self.assertIn("allergies", prefs)

        save_res = self.client.post("/api/preferences", json={
            "dietary": "Vegetarian",
            "allergies": ["Peanuts"],
            "max_cooking_time": "30 minutes"
        }).json()
        self.assertTrue(save_res["success"])

        # 3. /api/substitutions
        sub_res = self.client.post("/api/substitutions", json={
            "ingredient": "butter",
            "dietary": "Vegan"
        }).json()
        self.assertTrue(sub_res["found"])

        # 4. /api/analytics
        analytics = self.client.get("/api/analytics").json()
        self.assertIn("active_pantry_count", analytics)
        self.assertIn("savings_calculation_method", analytics)


if __name__ == "__main__":
    unittest.main()
