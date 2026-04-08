const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

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

    // 🔥 НАЗВАНИЕ
    const title =
      $(".tgme_channel_info_header_title").text().trim() || name;

    // 🔥 ПОДПИСЧИКИ
    const subscribers =
      $(".tgme_channel_info_counter")
        .first()
        .text()
        .trim() || null;

    // 🔥 АВАТАР
    let avatar = $(".tgme_page_photo_image").attr("style");
    if (avatar) {
      const match = avatar.match(/url\(['"]?(.*?)['"]?\)/);
      avatar = match ? match[1] : null;
    }

    const posts = [];

    const items = $(".tgme_widget_message_wrap")
      .toArray()
      .slice(-5); // 🔥 БЕЗ reverse — новые будут внизу

    items.forEach((el) => {
      // 🔥 ВАЖНО: сохраняем HTML → эмодзи не ломаются
      const text = $(el)
        .find(".tgme_widget_message_text")
        .html();

      const views = $(el)
        .find(".tgme_widget_message_views")
        .text()
        .trim();

      const time = $(el)
        .find("time")
        .attr("datetime");

      let image = $(el).find("img").attr("src");

      if (!image) {
        const bg = $(el)
          .find(".tgme_widget_message_photo_wrap")
          .attr("style");

        if (bg) {
          const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
          image = match ? match[1] : null;
        }
      }

      posts.push({
        text,
        views,
        time,
        image: image || null,
      });
    });

    const result = {
      title,
      subscribers,
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});