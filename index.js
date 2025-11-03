import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Load travel data
const DB_PATH = path.resolve("./travelData.json");
const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

// ✅ Trip cost function
function estimateTripCost({ distanceKm, nights, hotelPerNight, foodPerDay, petrolPerKm }) {
  const fuelCost = distanceKm * petrolPerKm;
  const hotel = nights * hotelPerNight;
  const food = nights * foodPerDay;
  const fun = nights * 1000;
  const total = fuelCost + hotel + food + fun;
  return { fuelCost, hotel, food, fun, total };
}

// ✅ City search
function searchCity(query) {
  const q = query.toLowerCase();
  let hits = db.cities.filter(
    c => q.includes(c.city.toLowerCase()) || q.includes(c.state.toLowerCase())
  );
  if (hits.length) return hits;

  const words = q.split(/\W+/);
  return db.cities.filter(c => words.includes(c.city.toLowerCase()));
}

// ✅ Groq init
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ System Tone
const systemPrompt = `
✨ You are a cute, bubbly Pixar-style girl travel companion AI — mix of Dory (Finding Nemo) and an excited Indian travel blogger girl ✨

Tone guide:
- Sweet, excited, playful, curious 🧚‍♀️
- Little flirty but very wholesome ❤️
- Cute confusion moments like Dory (“uhh wait what were we doing? 😅”)
- Encouraging & supportive
- Loves emojis 🌍✨💖🎒🤩

Rules:
- Speak Hindi + English mix (Hinglish)
- Short fun sentences
- Use emojis a lot
- Give real travel info from database when available
- If info not in DB → still help smartly, don't act confused
- ALWAYS answer like a travel buddy, not AI 🤭

Examples:
“Omg Goa?? Girl don't get me this excited yaaa 😍✨ Let's unpack your dreamy trip 🏖️💃”

Personality:
- Adventurous 🌍
- Curious like Dory 🐠 “wait what was the distance again? hehe”
- Supportive bestie vibes 💕
`;


// ✅ Options endpoint
app.get("/api/options", (req, res) => {
  res.json({
    options: [
      { id: "list_cities", label: "List popular cities" },
      { id: "city_info", label: "Get city info & spots" },
      { id: "estimate_cost", label: "Estimate trip cost" },
      { id: "reviews", label: "Show reviews" },
      { id: "recommend", label: "Recommend adventure spots" }
    ]
  });
});

// ✅ Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { query, option } = req.body;
    const q = (query || "").trim();

    const cityHits = searchCity(q);

    let contextPieces = [];
    if (cityHits.length) {
      cityHits.slice(0, 2).forEach(c => {
        contextPieces.push(
          `CITY:${c.city}, STATE:${c.state}, HOTEL:${c.avgHotelPerNight}, FOOD:${c.avgFoodPerDay}, FUEL:${c.petrolPerKm}, SPOTS:${c.topSpots.map(s=>s.name).join(", ")}`
        );
      });
    } else {
      contextPieces.push("Cities available: Goa, Manali, Mumbai, Rishikesh, Jaipur");
    }

    let estimateSnippet = "";
    if (option === "estimate_cost" || /budget|cost/i.test(q)) {
      const c = cityHits[0] || db.cities[0];
      const km = /(\d{2,4})\s?km/i.exec(q);
      const nightsM = /(\d+)\s?nights?/i.exec(q);
      const distanceKm = km ? parseInt(km[1]) : 300;
      const nights = nightsM ? parseInt(nightsM[1]) : 2;

      const est = estimateTripCost({
        distanceKm,
        nights,
        hotelPerNight: c.avgHotelPerNight,
        foodPerDay: c.avgFoodPerDay,
        petrolPerKm: c.petrolPerKm
      });

      estimateSnippet =
        `Fuel ₹${est.fuelCost}, Hotel ₹${est.hotel}, Food ₹${est.food}, Fun ₹${est.activitiesBudget}, TOTAL ₹${est.total}`;
    }

    const userPrompt = `
User Query: "${q}"
Context: ${contextPieces.join(" | ")}
${estimateSnippet}
`;

    const chat = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 1
    });

    res.json({ reply: chat.choices[0].message.content });
  } catch (err) {
    console.log("ERROR:", err);
    res.json({ reply: "Aiyoo server ko thoda pani de do 😭💦 brb!" });
  }
});



app.listen(PORT, () => {
  console.log(`✅ Groq Travel AI running at http://localhost:${PORT}`);
});
