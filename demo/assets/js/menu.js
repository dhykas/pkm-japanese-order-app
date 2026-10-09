/* Dummy menu data — this is the "JSON file" of the demo.
 *
 * It is wrapped in a JS variable instead of a raw .json file so that the demo works when you
 * simply double-click the HTML files. Browsers block fetch() of local .json files over file://,
 * but a <script src="menu.js"> loads fine. The content itself is plain JSON.
 *
 * Two menus:
 *   items      — the regular à-la-carte menu ordered from a table
 *   bulk.items — bento boxes and party platters, ordered ahead with tiered discounts
 */
window.MENU_DATA = {
  "restaurant": {
    "name": "Japanese Ramen & Sushi",
    "jp": "一番 ラーメン・寿司",
    "tagline": "Ramen, sushi and izakaya small plates, ordered from your phone.",
    "tables": 8
  },
  "categories": ["Ramen", "Sushi", "Sides", "Drinks", "Dessert"],
  "categoryJp": { "Ramen": "ラーメン", "Sushi": "寿司", "Sides": "小皿", "Drinks": "飲み物", "Dessert": "デザート" },
  "items": [
    { "id": "r1", "name": "Shoyu Ramen",            "jp": "醤油ラーメン",     "category": "Ramen",   "price": 48000, "emoji": "🍜", "desc": "Clear soy broth, chicken chashu, ajitama egg, menma, nori.", "popular": true },
    { "id": "r2", "name": "Tori Paitan Ramen",      "jp": "鶏白湯ラーメン",   "category": "Ramen",   "price": 55000, "emoji": "🍜", "desc": "Creamy 8-hour chicken bone broth, chashu, black garlic oil.", "popular": true },
    { "id": "r3", "name": "Miso Ramen",             "jp": "味噌ラーメン",     "category": "Ramen",   "price": 52000, "emoji": "🍜", "desc": "Hokkaido-style miso broth, sweet corn, butter, bean sprouts." },
    { "id": "r4", "name": "Spicy Tantanmen",        "jp": "担々麺",           "category": "Ramen",   "price": 55000, "emoji": "🌶️", "desc": "Sesame-chili broth, minced chicken, bok choy. Pick your heat level." },
    { "id": "r5", "name": "Seafood Shio Ramen",     "jp": "海鮮塩ラーメン",   "category": "Ramen",   "price": 62000, "emoji": "🦐", "desc": "Light salt broth with prawns, squid and clams." },
    { "id": "s1", "name": "Salmon Nigiri (2 pcs)",  "jp": "サーモン握り",     "category": "Sushi",   "price": 28000, "emoji": "🍣", "desc": "Norwegian salmon on seasoned rice.", "popular": true },
    { "id": "s2", "name": "Tuna Nigiri (2 pcs)",    "jp": "マグロ握り",       "category": "Sushi",   "price": 32000, "emoji": "🍣", "desc": "Fresh yellowfin tuna, a touch of wasabi." },
    { "id": "s3", "name": "California Roll (8 pcs)","jp": "カリフォルニア巻き","category": "Sushi",   "price": 45000, "emoji": "🍣", "desc": "Crab stick, avocado, cucumber, tobiko." },
    { "id": "s4", "name": "Spicy Salmon Roll (8 pcs)","jp": "スパイシーサーモン巻き","category": "Sushi","price": 42000, "emoji": "🔥", "desc": "Salmon, spicy mayo, cucumber, sesame." },
    { "id": "s5", "name": "Ebi Tempura Roll (8 pcs)","jp": "海老天巻き",      "category": "Sushi",   "price": 48000, "emoji": "🍤", "desc": "Crispy prawn tempura, avocado, unagi sauce." },
    { "id": "s6", "name": "Sashimi Mix (9 pcs)",    "jp": "刺身盛り合わせ",   "category": "Sushi",   "price": 85000, "emoji": "🐟", "desc": "Salmon, tuna and white fish, sliced to order." },
    { "id": "k1", "name": "Chicken Gyoza (5 pcs)",  "jp": "餃子",             "category": "Sides",   "price": 25000, "emoji": "🥟", "desc": "Pan-fried dumplings with ponzu dip.", "popular": true },
    { "id": "k2", "name": "Edamame",                "jp": "枝豆",             "category": "Sides",   "price": 15000, "emoji": "🫛", "desc": "Steamed soybeans with sea salt." },
    { "id": "k3", "name": "Chicken Karaage",        "jp": "唐揚げ",           "category": "Sides",   "price": 28000, "emoji": "🍗", "desc": "Japanese fried chicken with lemon and yuzu mayo." },
    { "id": "k4", "name": "Takoyaki (6 pcs)",       "jp": "たこ焼き",         "category": "Sides",   "price": 25000, "emoji": "🐙", "desc": "Octopus balls, bonito flakes, takoyaki sauce." },
    { "id": "k5", "name": "Agedashi Tofu",          "jp": "揚げ出し豆腐",     "category": "Sides",   "price": 22000, "emoji": "🍲", "desc": "Fried tofu in warm dashi with grated daikon." },
    { "id": "d1", "name": "Ocha (hot or iced)",     "jp": "お茶",             "category": "Drinks",  "price": 10000, "emoji": "🍵", "desc": "Japanese green tea, free refill.", "popular": true },
    { "id": "d2", "name": "Ramune",                 "jp": "ラムネ",           "category": "Drinks",  "price": 18000, "emoji": "🥤", "desc": "Classic marble soda. Original, melon or strawberry." },
    { "id": "d3", "name": "Matcha Latte",           "jp": "抹茶ラテ",         "category": "Drinks",  "price": 28000, "emoji": "🧋", "desc": "Uji matcha with milk, hot or iced." },
    { "id": "d4", "name": "Mineral Water",          "jp": "水",               "category": "Drinks",  "price": 8000,  "emoji": "💧", "desc": "Bottled water 600 ml." },
    { "id": "x1", "name": "Mochi Ice Cream (3 pcs)","jp": "餅アイス",         "category": "Dessert", "price": 25000, "emoji": "🍡", "desc": "Matcha, strawberry and black sesame." },
    { "id": "x2", "name": "Matcha Cheesecake",      "jp": "抹茶チーズケーキ", "category": "Dessert", "price": 32000, "emoji": "🍰", "desc": "Baked cheesecake with a matcha swirl." },
    { "id": "x3", "name": "Dorayaki",               "jp": "どら焼き",         "category": "Dessert", "price": 18000, "emoji": "🥞", "desc": "Pancake sandwich with sweet red bean." }
  ],

  "bulk": {
    "leadTimeDays": 1,
    "tiers": [
      { "minSubtotal": 500000,  "pct": 5 },
      { "minSubtotal": 1000000, "pct": 10 },
      { "minSubtotal": 2500000, "pct": 15 }
    ],
    "categories": ["Bento", "Sushi platter", "Party tray", "Drinks"],
    "categoryJp": { "Bento": "弁当", "Sushi platter": "寿司盛り", "Party tray": "大皿", "Drinks": "飲み物" },
    "items": [
      { "id": "b1",  "name": "Chicken Teriyaki Bento", "jp": "照り焼きチキン弁当", "category": "Bento",         "unit": "box",     "min": 10, "price": 55000,  "emoji": "🍱", "desc": "Teriyaki chicken, rice, tamagoyaki, pickles, edamame. Chopsticks included.", "popular": true },
      { "id": "b2",  "name": "Salmon Bento",           "jp": "鮭弁当",             "category": "Bento",         "unit": "box",     "min": 10, "price": 65000,  "emoji": "🍱", "desc": "Grilled salmon, rice, potato salad, pickles, seaweed salad." },
      { "id": "b3",  "name": "Chicken Katsu Bento",    "jp": "チキンカツ弁当",     "category": "Bento",         "unit": "box",     "min": 10, "price": 50000,  "emoji": "🍱", "desc": "Crispy chicken katsu, cabbage slaw, rice, katsu sauce." },
      { "id": "b4",  "name": "Sushi Platter (40 pcs)", "jp": "寿司盛り合わせ 40貫","category": "Sushi platter", "unit": "platter", "min": 1,  "price": 380000, "emoji": "🍣", "desc": "Salmon, tuna and tamago nigiri plus California and spicy salmon rolls. Serves 6–8.", "popular": true },
      { "id": "b5",  "name": "Sushi Platter (80 pcs)", "jp": "寿司盛り合わせ 80貫","category": "Sushi platter", "unit": "platter", "min": 1,  "price": 720000, "emoji": "🍣", "desc": "Twice the mix, with ebi tempura rolls added. Serves 12–15." },
      { "id": "b6",  "name": "Gyoza Party Tray (50 pcs)","jp": "餃子 大皿",        "category": "Party tray",    "unit": "tray",    "min": 1,  "price": 220000, "emoji": "🥟", "desc": "Pan-fried chicken gyoza with ponzu dip." },
      { "id": "b7",  "name": "Karaage Party Tray (60 pcs)","jp": "唐揚げ 大皿",    "category": "Party tray",    "unit": "tray",    "min": 1,  "price": 260000, "emoji": "🍗", "desc": "Japanese fried chicken with lemon and yuzu mayo." },
      { "id": "b8",  "name": "Onigiri Set (12 pcs)",   "jp": "おにぎりセット",     "category": "Party tray",    "unit": "set",     "min": 1,  "price": 120000, "emoji": "🍙", "desc": "Salmon, tuna mayo and umeboshi rice balls." },
      { "id": "b9",  "name": "Ocha Jug (5 L)",         "jp": "お茶ジャグ",         "category": "Drinks",        "unit": "jug",     "min": 1,  "price": 75000,  "emoji": "🍵", "desc": "Iced green tea, about 25 cups." },
      { "id": "b10", "name": "Ramune Case (24 btl)",   "jp": "ラムネ 1ケース",     "category": "Drinks",        "unit": "case",    "min": 1,  "price": 380000, "emoji": "🥤", "desc": "Mixed original, melon and strawberry." }
    ]
  }
};
