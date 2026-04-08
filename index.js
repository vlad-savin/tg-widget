const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();

app.use(cors());

// кеш
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

    // 🔥 НАЗВАНИЕ КАНАЛА
    const title =
      $(".tgme_channel_info_header_title").text().trim() || name;

    // 🔥 АВАТАР
    const avatar = $(".tgme_page_photo_image").attr("src") || null;

    const posts = [];

    // 🔥 БЕРЕМ ПОСЛЕДНИЕ 5
    const items = $(".tgme_widget_message_wrap")
      .toArray()
      .slice(-5)
      .reverse();

    items.forEach((el) => {
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

      const image = $(el).find("img").attr("src");

      posts.push({
        text,
        views,
        time,
        image: image || null,
      });
    });

    const result = {
      title,
      avatar,
      posts,
    };

    cache[name] = result;
    lastFetch = Date.now();

    res.json(result);
  } catch (e) {
    console.error("ERROR:", e.message);
    res.status(500).json({ error: "failed to fetch" });
  }
});

// 🔥 важно для Railway
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});