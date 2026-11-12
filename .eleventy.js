const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");
const markdownItLinkAttributes = require("markdown-it-link-attributes");
const markdownItAnchor = require("markdown-it-anchor");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);

  // Markdown-it configuration
  const markdownOptions = {
    html: true,
    breaks: true,
    linkify: true,
  };

  const md = markdownIt(markdownOptions)
    .use(markdownItLinkAttributes, {
      pattern: /^https?:\/\//,
      attrs: {
        target: "_blank",
        rel: "noopener noreferrer"
      }
    })
    .use(markdownItAnchor, {
      permalink: false,
      slugify: (s) => s.trim().toLowerCase().replace(/[\s+]/g, "-").replace(/[^\w-]/g, ""),
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
  eleventyConfig.addPassthroughCopy({ "./src/.htaccess": "./.htaccess" });
  eleventyConfig.addPassthroughCopy({ "./src/assets/images/favicon/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "./src/maroof-lone-profile.pdf": "maroof-lone-profile.pdf" });

  // Date Filter using Luxon
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });

  // Short Date Filter for clean list view (e.g., 'AUG 6', 'APR 15')
  eleventyConfig.addFilter("postDateShort", (dateObj) => {
    if (!dateObj) return "";
    let dt;
    if (dateObj instanceof Date) {
      dt = DateTime.fromJSDate(dateObj, { zone: "utc" });
    } else if (typeof dateObj === "string") {
      dt = DateTime.fromISO(dateObj, { zone: "utc" });
    } else {
      dt = DateTime.fromJSDate(new Date(dateObj), { zone: "utc" });
    }
    return dt.isValid ? dt.toFormat("LLL d").toUpperCase() : "";
  });

  // Group collection by year
  eleventyConfig.addFilter("groupByYear", (collection) => {
    if (!collection) return [];
    const groups = {};
    for (const item of collection) {
      let dt;
      if (item.date instanceof Date) {
        dt = DateTime.fromJSDate(item.date, { zone: "utc" });
      } else if (typeof item.date === "string") {
        dt = DateTime.fromISO(item.date, { zone: "utc" });
      } else {
        dt = DateTime.fromJSDate(new Date(item.date), { zone: "utc" });
      }
      const year = dt.isValid ? dt.toFormat("yyyy") : "Other";
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(item);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((year) => ({
        year,
        posts: groups[year],
      }));
  });

  // Filter collection by tag
  eleventyConfig.addFilter("filterByTag", (collection, tag) => {
    return collection.filter((item) => {
      if (!item.data.tags) return false;
      const tags = Array.isArray(item.data.tags) ? item.data.tags : [item.data.tags];
      return tags.includes(tag);
    });
  });

  // Global Data (Site URL & Analytics)
  eleventyConfig.addGlobalData("site", {
    url: "https://www.marooflone.com",
  });


  // FILTER
  eleventyConfig.addFilter("capitalize", (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Filter to inline and minify CSS files
  eleventyConfig.addFilter("inlineAndMinifyCss", function (filePath) {
    try {
      const fs = require("fs");
      const path = require("path");
      const absolutePath = path.join(__dirname, filePath);
      const cssContent = fs.readFileSync(absolutePath, "utf8");
      
      // Simple regex-based CSS minifier
      return cssContent
        .replace(/\/\*[\s\S]*?\*\//g, "") // remove comments
        .replace(/\s*([\{\}:;,])\s*/g, "$1") // remove spaces around symbols
        .replace(/\s+/g, " ") // collapse multiple spaces
        .trim();
    } catch (e) {
      console.error(`Error inlining CSS file: ${filePath}`, e);
      return "";
    }
  });


  // Eleventy Config Return
  return {
    dir: {
      input: "src",
      output: "public",
    },
  };
};