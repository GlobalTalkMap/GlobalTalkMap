# Global Talk Map

A single-page visualization that lets you pick the languages you speak and instantly see:

- Which countries around the world have large communities of those languages.
- How the total population of those languages splits across the world (pie chart).
- A naive, high-level estimate of how many people you could probably talk to.

The project is front-end only (vanilla HTML/CSS/JS), so it can be hosted directly on GitHub Pages.

## Data sources

- Approximate (L1 + L2) speaker counts are based on the [Wikipedia list of languages by total number of speakers](https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers) and other language-specific Wikipedia pages.
- Country associations (where a language is official or widely used) follow Wikipedia country/language lists and public statistics.
- `data/world.geojson` is a simplified, hand-crafted GeoJSON where each feature is a rectangular proxy for a country's approximate location. It is designed to keep the repository lightweight while still supporting country-level highlighting.

All values are approximate and for educational visualization only.

## Running locally

You can open `index.html` directly in a modern browser. For local development with live reloads, you can also use any static file server. Example using Python:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Deploying on GitHub Pages

1. Commit everything to the `main` branch of your repository.
2. In the GitHub repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Branch: main** and **Folder: / (root)**.
4. Click **Save**. GitHub Pages will build the site from the repository root and give you a public URL.

## Customization tips

- Add or adjust languages by editing `data/languages.json`. Keep totals in millions for consistency.
- Update `data/world.geojson` if you want more detailed shapes. Any standard GeoJSON world map should work.
- `script.js` contains explanatory comments and is organized into small helper functions so you can swap out the map or charting library if needed.
