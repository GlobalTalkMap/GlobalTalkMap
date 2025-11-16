# Global Talk Map

A lightweight, single-page visualization that helps estimate how many people you can potentially talk to based on the languages you speak. Pick languages, and the site highlights countries, draws a pie chart of the selected languages, and summarizes the approximate population reach.

## Live/hosting instructions
All files live at the repository root, so you can enable GitHub Pages via **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` → Folder: `/ (root)`**. The published site will then be available at `https://<username>.github.io/<repo>/`.

To preview locally without GitHub Pages, use any static HTTP server (for example `python -m http.server` from the project root) and open `http://localhost:8000`.

## Tech stack
- Plain HTML, CSS, and JavaScript (no build step).
- [D3.js](https://d3js.org/) for drawing the simplified world map.
- [Chart.js](https://www.chartjs.org/) for the responsive pie chart.

## Data
- `data/languages.json` contains approximate total speakers for the top 25 global languages, drawing on Wikipedia's *List of languages by total number of speakers* (L1 + L2). Each language also lists a small set of representative ISO-3166 alpha-2 country codes where it is official or widely spoken.
- `data/world.geojson` is a simplified custom GeoJSON containing bounding-box polygons for the countries referenced in the language dataset. It is intentionally lightweight so it can be served statically; highlighted shapes are approximate, not authoritative boundaries.
- All population percentage calculations assume an approximate world population of 8.1 billion people (2023).

## Features
- Searchable multi-select list of languages showing the number of total speakers in billions.
- World map that highlights the union of countries tied to the selected languages and shows hover tooltips listing which languages apply.
- Pie chart visualizing the share of the selected languages' speaker totals.
- Textual summary showing the naive total number of people you could potentially talk to (in billions) and what percentage of the global population that represents.
- Prominent disclaimers that overlapping multilingual speakers mean the total is an overestimate and the figures are approximate.

## Data & methodology notes
- Speaker totals combine native and second-language speakers; the site simply sums these totals and therefore overestimates how many *unique* people you can reach.
- Country highlighting is based on whether the selected language list includes that ISO code. This is a qualitative view of where a language is official or widely used, not an exact distribution of speakers.
- Because the GeoJSON uses bounding boxes, country outlines are schematic. The goal is to provide geographic context suitable for a fast-loading static page.

## Development
No build tools are required. Update the JSON data to refresh numbers or add languages/countries, and tweak `script.js` if you need to change how the visualization behaves.
