# 🥘 Mom's Kitchen AI — Zero-Waste Culinary Assistant

**Don't waste it. Taste it.** Mom's Kitchen AI is an intelligent, feature-rich cooking assistant powered by Google **Gemma 4** (`gemma-4-26b-a4b-it`) and Gemini via the Google Gen AI SDK. It transforms leftover ingredients, tracks pantry expiration dates, plans weekly meals, suggests allergy-safe ingredient substitutions, and guides home cooks through interactive, timer-assisted cooking sessions.

Built for the **Hacktoberfest Hack Day × WikiClub Tech UIT — Best Use of Gemma 4** challenge.

---

## ✨ Features by Phase

### 🥫 Phase 1: Smart Pantry & Expiry Tracking ("Rescue Mode")
- **Full Inventory Tracking**: Add, edit, delete, and view pantry items with quantity, unit, storage category, purchase date, and expiration date.
- **Visual Urgency Badges**: Automatically categorizes items as **Critical** (expires today/tomorrow), **Urgent** (≤3 days), **Approaching** (≤7 days), or **Fresh**.
- **Rescue Mode ("Use It First")**: Instantly filters and loads at-risk perishables into the Recipe Engine to maximize rescued food.
- **One-Click Consumption**: Mark pantry items as cooked or consumed to log verified waste-prevention metrics.
- **Food Safety Advisories**: Visible guidance cautioning users that printed dates are guidelines and reminding them to inspect food before eating.

### 🧠 Phase 2: Intelligent Zero-Waste Recipe Engine
- **Ingredient Utilization Percentage**: Uses the documented transparent formula:
  $$\text{Utilization \%} = \text{round}\left(\frac{\text{pantry ingredients used}}{\text{pantry ingredients used} + \text{missing staples}} \times 100\right)$$
- **Why Recommended Highlights**: Explains the exact culinary reason why each dish was selected to rescue user ingredients.
- **Accurate Quantities & Units**: Every ingredient lists specific measurements tailored to the user's portion size.
- **Robust Multi-Tier JSON Recovery**: Cleans markdown wrappers, trailing commas, unescaped characters, and repairs incomplete schemas.

### 🔄 Phase 3: Smart Ingredient Substitutions
- **Curated Culinary Knowledge Base + AI Fallback**: Instant culinary alternatives for missing ingredients (egg, buttermilk, heavy cream, butter, soy sauce, cornstarch, etc.).
- **Detailed Guidance**: Displays substitution ratio, expected flavor/texture differences, and important limitations.
- **Strict Allergy Safety**: Enforces hard allergy constraints (e.g. excludes dairy derivatives like butter from dairy-free alternatives).

### 👨‍🍳 Phase 4: Interactive Cooking Mode
- **Prominent Step-by-Step Display**: Designed for cooking in the kitchen with large, easy-to-read instructions.
- **Drift-Free Step Timers**: Browser-side timing logic with Start, Pause, Reset, +1m, and sound alerts. Automatically detects cooking times mentioned in step instructions.
- **Dynamic Serving Scaler**: Seamlessly adjusts portions (1 to 12 servings) and dynamically recalculates ingredient quantities.
- **Completion Logging**: Once a dish is completed, the user can log it to their verified Food-Waste & Savings Dashboard.

### 🛡️ Phase 5: Dietary Preferences & Allergy Hard Constraints
- **Lifestyle Baselines**: Vegetarian, Vegan, Gluten-free, Dairy-free, Pescatarian, No preference.
- **Hard Allergy Exclusions**: Peanuts, Tree nuts, Dairy, Eggs, Gluten, Soy, Fish, Shellfish, Sesame, and custom ingredient bans.
- **Cuisine & Difficulty Customization**: Italian, Mexican, Indian, Asian, Mediterranean, American Bistro, etc.

### 📅 Phase 6: Weekly Meal Planner & Smart Shopping List
- **7-Day Interactive Schedule**: Organize dishes across Breakfast, Lunch, Dinner, and Snack slots.
- **Automated Shopping List Consolidation**: Aggregates ingredients required across all planned meals and **subtracts items already present in the active pantry**.
- **One-Click Transfer to Pantry**: Check off items while grocery shopping and transfer them directly into your active pantry inventory!

### 📖 Phase 7: Saved Cookbook & Personalization
- **Cookbook Bookmarks**: Save favorite leftover recipes for quick access.
- **Personalized Star Ratings & Chef Notes**: Record family reactions, spice tweaks, and cooking history.
- **Cook Again Action**: Launch interactive cooking mode directly from any bookmarked recipe.

### 📊 Phase 8: Food Waste & Savings Analytics
- **Verified Activity Metrics**: Tracks real home-cooked meals, pantry items consumed, and total food waste avoided (in kilograms and pounds).
- **Transparent Savings Methodology**: Clearly documented estimated grocery savings based on a $3.50 average grocery cost per home-cooked meal portion rescued from disposal.
- **Pantry Freshness Distribution**: Visual health progress breakdown across fresh, urgent, and expired stock.

### 📷 Phase 9: Multimodal Pantry Image Scanner
- **Powered by Gemini Flash Vision**: Take or upload a photo of your fridge, countertop, or groceries to detect items automatically.
- **Confidence Ratings**: Displays detected items with confidence scores (`High`, `Medium`).
- **Confirmation Step**: Users review, edit quantities, and confirm before items enter the pantry or recipe generator.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Lucide Icons, Custom Culinary CSS | Responsive, accessible desktop/tablet/mobile culinary interface |
| **Backend API** | FastAPI, Uvicorn, Pydantic | REST API with input validation and CORS middleware |
| **Persistence** | SQLite (`leftover_chef.db`) | Thread-safe, zero-dependency relational database |
| **AI Engine** | Google Gen AI SDK (`google-genai`), Gemma 4 (`gemma-4-26b-a4b-it`) | Primary culinary model with cascading fallback to Gemini Flash |

---

## 🚀 Quick Start & Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://python.org/) (v3.10 or higher)
- A Google AI Studio API key with access to Gemma models: [Get API Key](https://aistudio.google.com/api-keys)

### 2. Backend Setup

Windows PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS/Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the project root:
```dotenv
GEMINI_API_KEY=your_gemini_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
```

### 4. Run Development Servers

**Terminal 1 — Backend (FastAPI):**
```bash
.\.venv\Scripts\python server.py
```
*Backend runs on http://localhost:8000 (Interactive API docs at http://localhost:8000/docs)*

**Terminal 2 — Frontend (Vite):**
```bash
npm.cmd run dev
```
*Frontend dev server runs on http://localhost:5173* (proxies `/api` to port 8000).

---

## 🧪 Running Automated Tests

Run the backend unit and integration test suite:

```bash
.\.venv\Scripts\python -m unittest tests/test_backend.py
```

Tests cover:
- Pantry CRUD, expiry calculations, and urgency classification
- Utilization formula calculations
- AI JSON recovery resilience
- Smart substitutions and strict allergy derivative filtering
- Saved recipes, ratings, chef notes, and cooking history
- Meal planner scheduling and shopping list consolidation
- FastAPI REST endpoints

---

## 📦 Production Single-Port Deployment

You can build the React frontend and let FastAPI serve both the API and static bundle:

```bash
npm.cmd run build
python server.py
```
Open **http://localhost:8000** in your browser.

---

## 🛡️ Food Safety & Legal Terms

- **Food Safety Advisory:** Mom's Kitchen AI provides creative culinary suggestions and cannot verify food freshness or pathogen safety. Always inspect ingredients before cooking and follow safe cooking temperatures.
- **Model Terms:** Gemma 4 is subject to Google's applicable model terms and Google AI Studio usage guidelines.

## 📄 License

Released under the MIT License.
