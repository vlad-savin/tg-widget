const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();

app.use(cors());

// кеш (1 минута)
let cache = {};
let lastFetch = 0;

app.get("/channel/:name", async (req, res) => {
  const { name } = req.params;

  try {
    if (Date.now() - lastFetch < 60000 && cache[name]) {
      return res.json(cache[name]);
    }

    const url = `https://t.me/s/${name}`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const posts = [];

    $(".tgme_widget_message_wrap").each((i, el) => {
      if (i >= 5) return;

      const text = $(el)
        .find(".tgme_widget_message_text")
        .text()
        .trim();

      const views = $(el)
        .find(".tgme_widget_message_views")
        .text()
        .trim();

      const time = $(el)
        .find("time")
        .attr("datetime");

      const img = $(el).find("img").attr("src");

      posts.push({
        text,
        views,
        time,
        image: img || null
      });
    });

    const result = {
      title: name,
      subscribers: "—",
      last_post: "recent",
      posts
    };

    cache[name] = result;
    lastFetch = Date.now();

    res.json(result);

  } catch (e) {
    console.error("ERROR:", e.message);
    res.status(500).json({ error: "failed to fetch" });
  }
});

// 🔥 ВАЖНО ДЛЯ RAILWAY
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});

