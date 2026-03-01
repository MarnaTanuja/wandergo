const express = require("express");
const https = require("https");
const router = express.Router();

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "WanderGo/2.0" } }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

// Curated location database with real Unsplash images
const LOCATIONS = {
  paris: {
    description: "Paris, the City of Light, stands as one of Europe's most iconic destinations, celebrated for its art, haute cuisine, and the timeless Eiffel Tower rising above its elegant boulevards. The city has shaped global culture for centuries, housing masterpieces at the Louvre and setting the tone for fashion worldwide.",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
    hotels: [
      { name: "Le Meurice", address: "228 Rue de Rivoli, Paris", rating: 5, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80" },
      { name: "Hotel Plaza Athenee", address: "25 Avenue Montaigne, Paris", rating: 5, image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80" },
      { name: "Hotel des Grands Boulevards", address: "17 Boulevard Poissonniere, Paris", rating: 4, image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80" },
    ],
    attractions: [
      { name: "Eiffel Tower", address: "Champ de Mars, Paris", image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&q=80" },
      { name: "Louvre Museum", address: "Rue de Rivoli, Paris", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80" },
      { name: "Notre-Dame Cathedral", address: "Ile de la Cite, Paris", image: "https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400&q=80" },
      { name: "Montmartre", address: "18th arrondissement, Paris", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80" },
    ],
  },
  bali: {
    description: "Bali is a living postcard — an Indonesian island of forested volcanic mountains, emerald rice terraces, and world-class surf beaches. Its deeply spiritual Hindu culture infuses daily life, from the offering-strewn temple ceremonies to the rhythmic gamelan music that drifts through the tropical air.",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80",
    hotels: [
      { name: "Four Seasons Bali at Sayan", address: "Sayan, Ubud, Bali", rating: 5, image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80" },
      { name: "The Mulia Bali", address: "Nusa Dua, Bali", rating: 5, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80" },
      { name: "Alaya Resort Ubud", address: "Jl. Hanoman, Ubud, Bali", rating: 4, image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&q=80" },
    ],
    attractions: [
      { name: "Tanah Lot Temple", address: "Beraban, Tabanan, Bali", image: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=400&q=80" },
      { name: "Tegallalang Rice Terraces", address: "Tegallalang, Gianyar, Bali", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
      { name: "Sacred Monkey Forest", address: "Ubud, Bali", image: "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=400&q=80" },
      { name: "Uluwatu Temple", address: "Pecatu, South Kuta, Bali", image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400&q=80" },
    ],
  },
  tokyo: {
    description: "Tokyo is a city of breathtaking contrasts, where ancient Shinto shrines sit in the shadow of neon-lit skyscrapers and bullet trains streak past traditional wooden tea houses. Japan's capital is simultaneously the world's largest metropolis and one of its most efficient, courteous, and culturally rich urban environments.",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
    hotels: [
      { name: "Aman Tokyo", address: "1-5-6 Otemachi, Chiyoda, Tokyo", rating: 5, image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&q=80" },
      { name: "Park Hyatt Tokyo", address: "3-7-1-2 Nishi Shinjuku, Tokyo", rating: 5, image: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&q=80" },
      { name: "Trunk Hotel", address: "5-31 Jingumae, Shibuya, Tokyo", rating: 4, image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80" },
    ],
    attractions: [
      { name: "Senso-ji Temple", address: "2-3-1 Asakusa, Taito, Tokyo", image: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&q=80" },
      { name: "Shibuya Crossing", address: "Shibuya, Tokyo", image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&q=80" },
      { name: "Shinjuku Gyoen Garden", address: "11 Naitomachi, Shinjuku, Tokyo", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80" },
      { name: "teamLab Planets", address: "6-1-16 Toyosu, Koto, Tokyo", image: "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=400&q=80" },
    ],
  },
  santorini: {
    description: "Santorini is the jewel of the Cyclades, a crescent-shaped Greek island formed by one of history's largest volcanic eruptions. Its cliff-draped villages of Oia and Fira, whitewashed against the vivid blue Aegean, produce some of the world's most photographed sunsets.",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80",
    hotels: [
      { name: "Canaves Oia Epitome", address: "Oia, Santorini", rating: 5, image: "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=400&q=80" },
      { name: "Grace Hotel Santorini", address: "Imerovigli, Santorini", rating: 5, image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&q=80" },
      { name: "Andronis Boutique Hotel", address: "Oia, Santorini", rating: 4, image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80" },
    ],
    attractions: [
      { name: "Oia Village Sunset", address: "Oia, Santorini", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&q=80" },
      { name: "Red Beach", address: "Akrotiri, Santorini", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" },
      { name: "Ancient Akrotiri", address: "Akrotiri, Santorini", image: "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=400&q=80" },
      { name: "Fira Town", address: "Fira, Santorini", image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&q=80" },
    ],
  },
  "new york": {
    description: "New York City is the world's most iconic urban landscape — a perpetually energized metropolis of soaring skyscrapers, world-class museums, and neighborhoods that feel like entirely different countries. From the theatre of Broadway to the tranquility of Central Park, it delivers infinite experiences within a single city.",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80",
    hotels: [
      { name: "The Plaza Hotel", address: "768 Fifth Avenue, New York", rating: 5, image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80" },
      { name: "1 Hotel Brooklyn Bridge", address: "60 Furman St, Brooklyn", rating: 5, image: "https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=400&q=80" },
      { name: "NoMo SoHo", address: "9 Crosby Street, New York", rating: 4, image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&q=80" },
    ],
    attractions: [
      { name: "Central Park", address: "59th to 110th St, Manhattan", image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=80" },
      { name: "Statue of Liberty", address: "Liberty Island, New York", image: "https://images.unsplash.com/photo-1503440779462-09c7bd36daa9?w=400&q=80" },
      { name: "The High Line", address: "Gansevoort St to 34th St, Manhattan", image: "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=400&q=80" },
      { name: "Brooklyn Bridge", address: "Brooklyn Bridge, New York", image: "https://images.unsplash.com/photo-1564999555765-8f8bbb03dbff?w=400&q=80" },
    ],
  },
  rajasthan: {
    description: "Rajasthan, the Land of Kings, is India's most spectacular state — a vast canvas of ochre deserts, ornate maharaja palaces, and medieval fortresses that rise from rocky hilltops. Its vibrant folk culture, vivid textiles, and world-renowned hospitality make it one of Asia's most compelling travel destinations.",
    image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80",
    hotels: [
      { name: "Taj Lake Palace", address: "Lake Pichola, Udaipur", rating: 5, image: "https://images.unsplash.com/photo-1578898887167-b6e0e68e9a55?w=400&q=80" },
      { name: "Umaid Bhawan Palace", address: "Circuit House Rd, Jodhpur", rating: 5, image: "https://images.unsplash.com/photo-1585543805890-6051f7829f98?w=400&q=80" },
      { name: "Samode Haveli", address: "Gangapole, Jaipur", rating: 4, image: "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=400&q=80" },
    ],
    attractions: [
      { name: "Amber Fort", address: "Devisinghpura, Jaipur", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&q=80" },
      { name: "Mehrangarh Fort", address: "Jodhpur, Rajasthan", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=80" },
      { name: "Thar Desert", address: "Jaisalmer, Rajasthan", image: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=400&q=80" },
      { name: "City Palace Udaipur", address: "City Palace Rd, Udaipur", image: "https://images.unsplash.com/photo-1580502304784-8985b7eb7260?w=400&q=80" },
    ],
  },
};

router.get("/info", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "query is required." });

  const key = query.toLowerCase().trim();
  let data = null;

  // Check curated DB first
  for (const [k, v] of Object.entries(LOCATIONS)) {
    if (key.includes(k) || k.includes(key)) {
      data = { ...v, location: query };
      break;
    }
  }

  // Fallback: try Wikipedia
  if (!data) {
    let description = "";
    let coords = null;
    try {
      const wiki = await httpsGet(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      if (wiki.extract) {
        const sentences = wiki.extract.match(/[^.!?]+[.!?]+/g) || [];
        description = sentences.slice(0, 3).join(" ").trim();
      }
      if (wiki.coordinates) coords = { lat: wiki.coordinates.lat, lon: wiki.coordinates.lon };
    } catch (_) {}

    data = {
      location: query,
      description: description || `${query} is a captivating destination with rich history, unique culture, and memorable experiences waiting to be discovered.`,
      image: `https://source.unsplash.com/1200x800/?${encodeURIComponent(query)},travel`,
      hotels: [
        { name: `${query} Grand Hotel`, address: `Central ${query}`, rating: 4, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80" },
        { name: `${query} Boutique Stay`, address: `Old Town, ${query}`, rating: 4, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80" },
      ],
      attractions: [
        { name: `${query} City Centre`, address: `Downtown ${query}`, image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=400&q=80" },
        { name: `${query} Local Market`, address: `${query} Bazaar`, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80" },
      ],
      coords,
    };
  }

  res.json(data);
});

module.exports = router;
