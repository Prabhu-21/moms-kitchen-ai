import html
import re
import streamlit as st
from ai_service import (
    generate_recipes,
    get_active_model,
    get_api_key,
    RecipeGenerationError,
)

st.set_page_config(
    page_title="Mom's Kitchen AI | Don't Waste It, Taste It",
    page_icon="🥘",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Foodie Theme CSS
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .stApp {
        background-color: #FAF7F2;
        background-image: radial-gradient(#EFE6D8 1px, transparent 1px);
        background-size: 24px 24px;
    }

    /* Foodie Hero Banner */
    .food-hero {
        background: linear-gradient(135deg, #183C32 0%, #245244 55%, #2E6353 100%);
        border-radius: 24px;
        padding: 2.2rem 2.4rem;
        color: #FFFDF9;
        margin-bottom: 1.6rem;
        box-shadow: 0 14px 34px rgba(24, 60, 50, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.08);
        position: relative;
        overflow: hidden;
    }
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(8px);
        padding: 5px 14px;
        border-radius: 100px;
        font-size: 0.82rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: #F8E7D1;
        margin-bottom: 0.8rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .food-hero h1 {
        font-family: 'Playfair Display', serif;
        font-size: 2.5rem;
        font-weight: 700;
        color: #FFFDF9;
        margin: 0 0 0.5rem 0;
        line-height: 1.2;
    }
    .food-hero p {
        font-size: 1.1rem;
        color: #E2ECE5;
        max-width: 720px;
        margin: 0 0 1.2rem 0;
        line-height: 1.5;
    }
    .hero-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .hero-pill {
        background: rgba(0, 0, 0, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        color: #F7EFE4;
    }

    /* Section Subheadings */
    .section-title {
        font-family: 'Playfair Display', serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: #27211D;
        margin: 1.2rem 0 0.3rem 0;
    }
    .section-sub {
        color: #6D635B;
        font-size: 0.95rem;
        margin-bottom: 1rem;
    }

    /* Primary and Secondary Buttons */
    div.stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #E76F51 0%, #D84A38 100%) !important;
        color: #FFFFFF !important;
        border: none !important;
        border-radius: 14px !important;
        font-weight: 700 !important;
        font-size: 1.05rem !important;
        padding: 0.65rem 1.4rem !important;
        box-shadow: 0 6px 18px rgba(216, 74, 56, 0.28) !important;
        transition: all 0.2s ease !important;
    }
    div.stButton > button[kind="primary"]:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(216, 74, 56, 0.38) !important;
    }

    div.stButton > button[kind="secondary"] {
        background: #FFFFFF !important;
        border: 1.5px solid #E8DDD0 !important;
        border-radius: 14px !important;
        color: #3C332E !important;
        font-weight: 600 !important;
        font-size: 0.88rem !important;
        transition: all 0.15s ease !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03) !important;
    }
    div.stButton > button[kind="secondary"]:hover {
        border-color: #E76F51 !important;
        color: #E76F51 !important;
        background: #FFF9F5 !important;
        transform: translateY(-1px) !important;
    }

    /* Textarea Clean Styling & High Contrast */
    div[data-baseweb="textarea"] {
        border-radius: 16px !important;
        border: 1.5px solid #E6DCD1 !important;
        background-color: #FFFFFF !important;
        box-shadow: 0 3px 10px rgba(0,0,0,0.02) !important;
    }
    div[data-baseweb="textarea"] textarea {
        background-color: #FFFFFF !important;
        color: #27211D !important;
        font-size: 1rem !important;
        line-height: 1.5 !important;
    }
    div[data-baseweb="textarea"]:focus-within {
        border-color: #E76F51 !important;
        box-shadow: 0 0 0 3px rgba(231, 111, 81, 0.15) !important;
    }

    /* Status Box Styling & Dark Readable Text */
    div[data-testid="stStatusWidget"] {
        background-color: #FFFFFF !important;
        border: 1.5px solid #EADDCF !important;
        border-radius: 14px !important;
        box-shadow: 0 4px 14px rgba(0,0,0,0.04) !important;
    }
    div[data-testid="stStatusWidget"] * {
        color: #27211D !important;
    }

    /* Sidebar Styling & High Contrast Culinary Palette */
    section[data-testid="stSidebar"] {
        background-color: #F7F1E7 !important;
        border-right: 1.5px solid #E5D8C7 !important;
    }

    /* All text inside sidebar: headings, markdown, labels, spans, paragraphs */
    section[data-testid="stSidebar"] h1,
    section[data-testid="stSidebar"] h2,
    section[data-testid="stSidebar"] h3,
    section[data-testid="stSidebar"] h4,
    section[data-testid="stSidebar"] p,
    section[data-testid="stSidebar"] span,
    section[data-testid="stSidebar"] label,
    section[data-testid="stSidebar"] div,
    section[data-testid="stSidebar"] [data-testid="stWidgetLabel"] p,
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p,
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {
        color: #27211D !important;
        font-weight: 500;
    }

    /* Sidebar Headings */
    section[data-testid="stSidebar"] h3 {
        color: #183C32 !important;
        font-weight: 700 !important;
        letter-spacing: -0.3px;
        margin-top: 0.5rem !important;
    }

    /* Sidebar Captions and Helper Notes */
    section[data-testid="stSidebar"] .stCaption,
    section[data-testid="stSidebar"] [data-testid="stCaptionContainer"],
    section[data-testid="stSidebar"] small {
        color: #6C5E55 !important;
        font-size: 0.88rem !important;
    }

    /* Selectbox Inputs: Crisp white container with dark text */
    div[data-baseweb="select"] {
        background-color: #FFFFFF !important;
        border: 1.5px solid #E2D6C7 !important;
        border-radius: 12px !important;
    }
    div[data-baseweb="select"] div {
        background-color: #FFFFFF !important;
        color: #27211D !important;
    }
    div[data-baseweb="select"] span {
        color: #27211D !important;
        font-weight: 600 !important;
    }
    div[data-baseweb="select"] svg {
        fill: #27211D !important;
    }
    /* Dropdown popover list items */
    ul[data-baseweb="menu"] {
        background-color: #FFFFFF !important;
        border: 1px solid #E2D6C7 !important;
        border-radius: 12px !important;
    }
    ul[data-baseweb="menu"] li {
        background-color: #FFFFFF !important;
        color: #27211D !important;
    }
    ul[data-baseweb="menu"] li:hover {
        background-color: #FFF5EE !important;
        color: #E76F51 !important;
    }

    /* Radio Buttons & Checkboxes */
    section[data-testid="stSidebar"] [data-testid="stRadio"] label,
    section[data-testid="stSidebar"] [data-testid="stCheckbox"] label {
        color: #27211D !important;
    }
    section[data-testid="stSidebar"] [data-testid="stRadio"] [data-testid="stMarkdownContainer"] p,
    section[data-testid="stSidebar"] [data-testid="stCheckbox"] [data-testid="stMarkdownContainer"] p {
        color: #27211D !important;
        font-weight: 600 !important;
        font-size: 0.92rem !important;
    }

    /* Slider track, value display, and tick styling */
    section[data-testid="stSidebar"] [data-testid="stSlider"] div[data-testid="stWidgetLabel"] p {
        color: #27211D !important;
        font-weight: 700 !important;
    }
    div[data-testid="stSliderTickBar"] {
        color: #6C5E55 !important;
    }
    div[data-testid="stSliderTickBarMax"], div[data-testid="stSliderTickBarMin"] {
        color: #6C5E55 !important;
    }
    /* Slider value label */
    div[data-testid="stSlider"] div[data-testid="stMarkdownContainer"] p {
        color: #B54F1D !important;
        font-weight: 700 !important;
    }
    div[data-testid="stSlider"] div[role="slider"] {
        background-color: #E76F51 !important;
        border-color: #E76F51 !important;
    }

    /* Sidebar Dividers */
    section[data-testid="stSidebar"] hr {
        border-color: #E5D8C7 !important;
        margin: 1.2rem 0 !important;
    }

    /* Recipe Cards */
    .recipe-card {
        background: #FFFFFF;
        border-radius: 20px;
        padding: 1.8rem 2rem;
        margin-bottom: 1.8rem;
        border: 1px solid #EDE3D5;
        box-shadow: 0 8px 26px rgba(80, 50, 30, 0.05);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .recipe-card:hover {
        box-shadow: 0 12px 32px rgba(80, 50, 30, 0.08);
    }
    .recipe-title-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.6rem;
        flex-wrap: wrap;
        gap: 10px;
    }
    .recipe-title {
        font-family: 'Playfair Display', serif;
        font-size: 1.55rem;
        font-weight: 700;
        color: #1F1916;
        margin: 0;
    }
    .recipe-desc {
        color: #5D534C;
        font-size: 1rem;
        font-style: italic;
        line-height: 1.5;
        margin-bottom: 1.2rem;
    }
    .badge-bar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    .badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        border-radius: 100px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    .badge-time {
        background: #FFF1E6;
        color: #B54F1D;
        border: 1px solid #FCD7BE;
    }
    .badge-difficulty {
        background: #F0F7F4;
        color: #2D6A4F;
        border: 1px solid #D1E7DD;
    }

    /* Ingredient Tags */
    .ing-tag-used {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #EAF7EE;
        color: #1D5428;
        border: 1px solid #C4E8CD;
        padding: 5px 13px;
        border-radius: 100px;
        font-size: 0.85rem;
        font-weight: 600;
        margin: 3px 4px 3px 0;
    }
    .ing-tag-missing {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #FFF5E8;
        color: #9E4A1D;
        border: 1px solid #FCE1BE;
        padding: 5px 13px;
        border-radius: 100px;
        font-size: 0.85rem;
        font-weight: 600;
        margin: 3px 4px 3px 0;
    }

    /* Cooking Steps */
    .step-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 12px;
    }
    .step-circle {
        background: #E76F51;
        color: #FFFFFF;
        font-weight: 700;
        font-size: 0.82rem;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        flex-shrink: 0;
        margin-top: 2px;
    }
    .step-text {
        color: #332B27;
        font-size: 0.96rem;
        line-height: 1.55;
    }

    /* Chef Tip Banner */
    .chef-tip-card {
        background: linear-gradient(135deg, #F4FBF7 0%, #E9F7F1 100%);
        border-left: 4px solid #2A9D8F;
        border-radius: 12px;
        padding: 12px 18px;
        margin-top: 14px;
        color: #16473A;
        font-size: 0.92rem;
        line-height: 1.5;
    }

    /* Surplus Box */
    .surplus-box {
        background: #FFFFFF;
        border-radius: 16px;
        padding: 1.2rem 1.6rem;
        border: 1px solid #EDE3D5;
        margin-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# State initialization
if "recipes" not in st.session_state:
    st.session_state.recipes = None
if "last_inputs" not in st.session_state:
    st.session_state.last_inputs = None
if "ingredients_input" not in st.session_state:
    st.session_state.ingredients_input = ""

# Foodie Hero Section
st.markdown("""
<div class="food-hero">
  <div class="hero-badge">🥘 CHEF'S ZERO-WASTE KITCHEN</div>
  <h1>Transform Leftovers Into Culinary Delights</h1>
  <p>Don't waste it. Taste it. Tell Gemma 4 what you have in your fridge, and let it craft restaurant-worthy, budget-friendly recipes in seconds.</p>
  <div class="hero-pills">
    <span class="hero-pill">🌿 Zero-Waste Cooking</span>
    <span class="hero-pill">⏱️ Fast & Concise Steps</span>
    <span class="hero-pill">🧂 Smart Pantry Staples</span>
    <span class="hero-pill">🤖 Gemma 4 Intelligence</span>
  </div>
</div>
""", unsafe_allow_html=True)

# Sidebar: Kitchen Prep Station
with st.sidebar:
    st.markdown("### 🍳 Kitchen Prep Station")
    st.caption("Customize your dietary preferences and available time.")

    dietary = st.selectbox(
        "🥗 Dietary Preference",
        ["Vegetarian", "Vegan", "No preference", "Gluten-free"],
        index=0,
    )
    cooking_time = st.select_slider(
        "⏱️ Time Available",
        options=["15 minutes", "30 minutes", "45 minutes", "60+ minutes"],
        value="30 minutes",
    )
    servings = st.selectbox(
        "🍽️ Servings",
        [1, 2, 3, 4, 5, 6],
        index=1,
        format_func=lambda x: f"{x} {'serving' if x == 1 else 'servings'}",
    )
    prioritize = st.checkbox(
        "🔥 Prioritize items that spoil quickly",
        value=True,
        help="Highlights and uses produce or cooked items needing immediate use.",
    )

    st.divider()
    st.markdown("### ⚡ Generation Speed")
    model_mode = st.radio(
        "AI Engine Mode",
        ["✨ Gemma 4 (Hackathon Preferred)", "🚀 Turbo Flash Mode (Fastest)"],
        index=0,
        help="Gemma 4 is the competition model. Turbo Flash generates recipes in ~6-8 seconds if Gemma servers are busy."
    )
    selected_model = "gemma-4-26b-a4b-it" if "Gemma 4" in model_mode else "gemini-3.5-flash-lite"
    auto_fallback = st.checkbox(
        "🔄 Auto-fallback if Gemma servers queue",
        value=True,
        help="If Gemma 4 cloud servers encounter peak traffic or timeout, Chef AI seamlessly falls back to Flash to avoid delays."
    )

    st.divider()

    # Active model and API status
    has_api_key = bool(get_api_key())
    st.markdown(f"**Target Model:** `{selected_model}`")
    if has_api_key:
        st.success("API Connected", icon="🟢")
    else:
        st.error("API Key Missing in `.env`", icon="🔴")

    st.divider()
    st.caption("🛡️ **Food Safety First:** Always inspect leftovers for freshness, mold, or safe storage before cooking.")

# Quick Sample Inspirations
st.markdown('<div class="section-title">What’s in your kitchen today?</div>', unsafe_allow_html=True)
st.markdown('<div class="section-sub">Pick a chef’s quick-fill inspiration or list your ingredients separated by commas:</div>', unsafe_allow_html=True)


def select_sample(sample_text: str) -> None:
    st.session_state.ingredients_input = sample_text


def parse_ingredient_input(text: str) -> list[str]:
    """Cleanly parse ingredient text with support for commas, newlines, and 'and'."""
    cleaned = text.replace("\n", ",").replace(";", ",")
    cleaned = re.sub(r"\b(and|&)\b", ",", cleaned, flags=re.IGNORECASE)
    items = [x.strip().strip("-*•") for x in cleaned.split(",") if x.strip()]
    return [x for x in items if len(x) > 1]


samples = {
    "🍚 Leftover Rice Bowl": "leftover cooked rice, potatoes, tomatoes, onion, peas",
    "🥔 Rustic Spiced Curry": "potatoes, tomatoes, onion, garlic, cooking oil",
    "🥕 Golden Garden Sauté": "carrots, peas, potatoes, onion, leftover cooked rice",
}

sample_cols = st.columns(len(samples))
for col, (label, value) in zip(sample_cols, samples.items()):
    col.button(
        label,
        use_container_width=True,
        on_click=select_sample,
        args=(value,),
    )

ingredients = st.text_area(
    "Available ingredients",
    key="ingredients_input",
    placeholder="e.g. leftover rice, boiled potatoes, tomatoes, red onion, frozen peas",
    height=95,
    label_visibility="collapsed",
    help="Be specific! Mentioning 'cooked rice' or 'stale bread' helps Gemma provide exact cooking tips.",
)

col_btn, col_hint = st.columns([1, 2])
with col_btn:
    generate = st.button("✨ Craft Recipes", type="primary", use_container_width=True)
with col_hint:
    st.markdown(
        "<div style='color: #7A6F66; font-size: 0.92rem; padding-top: 10px;'>"
        "🍲 Gemma 4 will suggest 3 unique recipes, highlight pantry staples, and share food-saving tips."
        "</div>",
        unsafe_allow_html=True,
    )

if generate:
    parsed_ingredients = parse_ingredient_input(ingredients)
    if not parsed_ingredients:
        st.warning("👩‍🍳 Please add at least one ingredient to start cooking!")
    else:
        st.session_state.recipes = None
        st.session_state.last_inputs = {
            "ingredients": parsed_ingredients,
            "dietary": dietary,
            "cooking_time": cooking_time,
            "servings": servings,
            "prioritize": prioritize,
            "model_mode": model_mode,
        }
        with st.status("🍳 Chef AI is creating your menu...", expanded=True) as status_box:
            status_box.write("🥗 Reviewing ingredients and dietary preferences...")
            engine_label = "Gemma 4" if "Gemma 4" in model_mode else "Turbo Flash"
            status_box.write(f"🤖 Generating 3 balanced recipes with {engine_label}...")
            try:
                st.session_state.recipes = generate_recipes(
                    ingredients=parsed_ingredients,
                    dietary=dietary,
                    cooking_time=cooking_time,
                    servings=servings,
                    prioritize_soon=prioritize,
                    model_override=selected_model,
                    allow_fallback=auto_fallback,
                )
                status_box.update(label="✨ Your delicious leftover menu is ready!", state="complete", expanded=False)
            except Exception as exc:
                status_box.update(label="❌ Generation issue", state="error", expanded=True)
                st.error(f"👨‍🍳 {exc}")
                st.info("💡 **Tip:** If Gemma 4 cloud servers are slow or experiencing spikes, switch to **🚀 Turbo Flash Mode** in the sidebar for instant ~6-second recipe generation.")

# Display Results
if st.session_state.recipes:
    result = st.session_state.recipes
    inputs = st.session_state.last_inputs or {}
    recipes = result.get("recipes", [])
    meta = result.get("_metadata", {})

    st.markdown("---")
    st.markdown('<div class="section-title">🌱 Your Custom Leftover Menu</div>', unsafe_allow_html=True)

    # Show fallback notice if applied
    if meta.get("fallback_used"):
        st.info(
            "⚡ **Chef's Speed Notice:** Gemma 4 servers were temporarily experiencing heavy cloud traffic, "
            "so Chef AI automatically generated your recipes via high-speed mode so you didn't have to wait!",
            icon="ℹ️",
        )

    model_label = meta.get("model_used", "Gemma 4")
    st.caption(f"Generated via **{model_label}**. AI-generated culinary suggestions — always inspect food freshness before cooking.")

    if not recipes:
        st.warning("No recipe cards were generated. Try re-generating with a clearer ingredient list.")

    for idx, recipe in enumerate(recipes, start=1):
        name = html.escape(str(recipe.get("name", f"Recipe {idx}")))
        desc = html.escape(str(recipe.get("description", "")))
        raw_time = recipe.get("time_minutes", "—")
        time_display = f"{raw_time} mins" if str(raw_time).isdigit() else str(raw_time)
        diff = html.escape(str(recipe.get("difficulty", "Easy")))

        used_ings = recipe.get("ingredients_used", [])
        missing_ings = recipe.get("missing_ingredients", [])
        steps = recipe.get("steps", [])
        tip = html.escape(str(recipe.get("waste_reduction_tip", "")))

        # Build recipe card HTML
        used_tags_html = "".join(f'<span class="ing-tag-used">✅ {html.escape(str(i))}</span>' for i in used_ings) or '<span style="color:#777;">None specified</span>'
        missing_tags_html = "".join(f'<span class="ing-tag-missing">🛒 {html.escape(str(i))}</span>' for i in missing_ings) or '<span style="color:#777;">No extra pantry items needed</span>'

        steps_html = "".join(
            f'<div class="step-item"><span class="step-circle">{n}</span><span class="step-text">{html.escape(str(s))}</span></div>'
            for n, s in enumerate(steps, start=1)
        ) or '<div style="color:#777;">No steps provided.</div>'

        tip_html = f'<div class="chef-tip-card">🌿 <strong>Chef’s Waste-Saving Tip:</strong> {tip}</div>' if tip else ''

        card_html = f"""
        <div class="recipe-card">
            <div class="recipe-title-row">
                <h3 class="recipe-title">{idx}. {name}</h3>
                <div class="badge-bar">
                    <span class="badge-pill badge-time">⏱️ {time_display}</span>
                    <span class="badge-pill badge-difficulty">🔥 {diff}</span>
                </div>
            </div>
            <div class="recipe-desc">{desc}</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.2rem;">
                <div>
                    <div style="font-weight: 700; color: #1D5428; margin-bottom: 0.5rem; font-size: 0.92rem;">
                        🥗 INGREDIENTS FROM YOUR KITCHEN
                    </div>
                    {used_tags_html}
                </div>
                <div>
                    <div style="font-weight: 700; color: #9E4A1D; margin-bottom: 0.5rem; font-size: 0.92rem;">
                        🧂 PANTRY STAPLES / OPTIONAL
                    </div>
                    {missing_tags_html}
                </div>
            </div>
            <div style="font-weight: 700; color: #27211D; margin-bottom: 0.8rem; font-size: 0.95rem;">
                👨‍🍳 COOKING METHOD
            </div>
            <div>{steps_html}</div>
            {tip_html}
        </div>
        """
        st.markdown(card_html, unsafe_allow_html=True)

    # Surplus & Eco Impact Section
    leftovers = result.get("leftover_ingredients", [])
    general_tip = result.get("food_waste_tip", "")

    c_left, c_right = st.columns(2)
    with c_left:
        if leftovers:
            leftover_tags = "".join(f'<span class="ing-tag-used" style="background:#F5EFE6; color:#5D4037; border-color:#E0D4C5;">📦 {html.escape(str(item))}</span>' for item in leftovers)
            st.markdown(
                f"""
                <div class="surplus-box">
                    <div style="font-weight: 700; color: #5D4037; margin-bottom: 0.5rem;">🧺 STILL IN YOUR LARDER</div>
                    <div style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #75685F;">These listed ingredients are saved for another meal:</div>
                    {leftover_tags}
                </div>
                """,
                unsafe_allow_html=True,
            )
    with c_right:
        if general_tip:
            st.markdown(
                f"""
                <div class="surplus-box" style="border-left: 4px solid #E76F51;">
                    <div style="font-weight: 700; color: #D84A38; margin-bottom: 0.4rem;">🌍 CHEF'S ZERO-WASTE WISDOM</div>
                    <div style="color: #4A3E38; font-size: 0.94rem; line-height: 1.5;">{html.escape(str(general_tip))}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # Text Export Action
    text_export = []
    for i, recipe in enumerate(recipes, start=1):
        raw_time = recipe.get("time_minutes", "—")
        time_display = f"{raw_time} minutes" if str(raw_time).isdigit() else str(raw_time)
        text_export.append(f"{i}. {recipe.get('name', 'Recipe')}")
        text_export.append(recipe.get("description", ""))
        text_export.append(f"Time: {time_display} | Difficulty: {recipe.get('difficulty', '—')}")
        text_export.append("Ingredients Used: " + ", ".join(recipe.get("ingredients_used", [])))
        text_export.append("Missing / Staples: " + ", ".join(recipe.get("missing_ingredients", [])))
        text_export.append("Steps:")
        text_export.extend(f"  {n}. {step}" for n, step in enumerate(recipe.get("steps", []), start=1))
        text_export.append("Waste-saving Tip: " + recipe.get("waste_reduction_tip", ""))
        text_export.append("-" * 40)

    st.markdown("<div style='height: 15px;'></div>", unsafe_allow_html=True)
    st.download_button(
        "⬇️ Download Chef's Menu (TXT)",
        data="\n".join(text_export),
        file_name="leftover-chef-recipes.txt",
        mime="text/plain",
        use_container_width=True,
    )

st.markdown("<div style='height: 30px;'></div>", unsafe_allow_html=True)
st.markdown(
    "<div style='text-align: center; color: #8F8377; font-size: 0.88rem; padding: 20px 0; border-top: 1px solid #ECE2D5;'>"
    "🍳 <strong>Mom's Kitchen AI</strong> · Built for the Hacktoberfest Hack Day × WikiClub Tech UIT Gemma 4 Challenge<br>"
    "Recipe suggestions are AI-generated estimates. Always verify food freshness and follow safe food-handling practices."
    "</div>",
    unsafe_allow_html=True,
)
