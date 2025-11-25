const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // Markdown-it configuration
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
  });

  // Add this missing date filter
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy-MM-dd") => {
    return DateTime.fromJSDate(dateObj).toFormat(format);
  });

  eleventyConfig.addCollection("tagList", function (collectionApi) {
    let tagSet = new Set();
    collectionApi.getAll().forEach(item => {
      if ("tags" in item.data) {
        let tags = item.data.tags;
        tags = tags.filter(tag => tag !== "post"); // Exclude unwanted tags
        for (const tag of tags) {
          tagSet.add(tag);
        }
      }
    });

    return [...tagSet];
  });


  // Custom Image Renderer (with captions)
  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const src = token.attrGet("src");
    const alt = token.content;
    const title = token.attrGet("title");

    return `
      <figure class="inline-image">
        <img src="${src}" alt="${alt}" loading="lazy">
        ${title ? `<figcaption>${title}</figcaption>` : alt ? `<figcaption>${alt}</figcaption>` : ""}
      </figure>
    `;
  };

  eleventyConfig.setLibrary("md", md);

  // Static Assets Copy
  eleventyConfig.addPassthroughCopy("./src/style.css");
  eleventyConfig.addPassthroughCopy("./src/assets");
  eleventyConfig.addPassthroughCopy("./src/admin");
  eleventyConfig.addPassthroughCopy({ "./src/_headers": "./_headers" });

  // Date Filter using Luxon
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });

  // Filter collection by tag
  eleventyConfig.addFilter("filterByTag", (collection, tag) => {
    return collection.filter((item) => {
      if (!item.data.tags) return false;
      const tags = Array.isArray(item.data.tags) ? item.data.tags : [item.data.tags];
      return tags.includes(tag);
    });
  });

  // Slugify filter for clean URLs
  eleventyConfig.addFilter("slug", (input) => {
    return slugify(input || "");
  });

  // Global Data (Site URL & Analytics)
  eleventyConfig.addGlobalData("site", {
    url: "https://www.marooflone.com",
  });


  // FILTER
  eleventyConfig.addFilter("capitalize", (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  });


  // Eleventy Config Return
  return {
    dir: {
      input: "src",
      output: "public",
    },
  };
};