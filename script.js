const WORLD_POPULATION = 8_100_000_000;
const ASSET_VERSION = "20240220";
const DEFAULT_SELECTION = ["en", "es", "zh"];
const MAP_COLOR_ACTIVE = "#0c7bdc";
const MAP_COLOR_BASE = "#cdd8e7";

let languages = [];
let worldFeatures = [];
let selectedLanguageCodes = new Set(DEFAULT_SELECTION);
let chartInstance = null;
let mapSvg = null;
let mapTooltip = null;

let languageListEl;
let languageSearchEl;
let summaryEl;
let chartPlaceholderEl;
let chartCanvas;
let mapContainer;
let selectAllBtn;
let clearSelectionBtn;

// Utility helpers -----------------------------------------------------------
const formatLanguageTotal = (millions) => {
  if (millions >= 1000) {
    return `${(millions / 1000).toFixed(2)}B`;
  }
  return `${Math.round(millions)}M`;
};

const formatBillions = (millions) => {
  const billions = millions / 1000;
  return `${billions.toFixed(2)}B people`;
};

const formatPercent = (value) => `${value.toFixed(1)}%`;

const getSelectedLanguages = () =>
  languages.filter((lang) => selectedLanguageCodes.has(lang.iso_code));

const buildCountryLanguageMap = (selected) => {
  const map = new Map();
  selected.forEach((lang) => {
    lang.countries_iso2.forEach((iso) => {
      const key = iso.toUpperCase();
      if (!map.has(key)) {
        map.set(key, new Set());
      }
      map.get(key).add(lang.name);
    });
  });
  return map;
};

// Initialization ------------------------------------------------------------
const init = async () => {
  languageListEl = document.getElementById("languageList");
  languageSearchEl = document.getElementById("languageSearch");
  summaryEl = document.getElementById("summary");
  chartPlaceholderEl = document.getElementById("chartPlaceholder");
  chartCanvas = document.getElementById("populationChart");
  mapContainer = document.getElementById("map");
  selectAllBtn = document.getElementById("selectAll");
  clearSelectionBtn = document.getElementById("clearSelection");

  try {
    const [languageData, worldData] = await Promise.all([
      fetch(`data/languages.json?v=${ASSET_VERSION}`).then((res) => res.json()),
      fetch(`data/world.geojson?v=${ASSET_VERSION}`).then((res) => res.json()),
    ]);

    languages = languageData;
    worldFeatures = worldData.features;

    renderLanguageList();
    initLanguageSearch();
    initLanguageButtons();
    initMap();
    initChart();
    updateVisuals();
  } catch (error) {
    console.error("Failed to load data", error);
    languageListEl.innerHTML =
      '<p class="empty-state">Unable to load data. Please refresh.</p>';
  }
};

// Language selector --------------------------------------------------------
const initLanguageSearch = () => {
  languageSearchEl.addEventListener("input", (event) => {
    renderLanguageList(event.target.value);
  });
};

const initLanguageButtons = () => {
  selectAllBtn.addEventListener("click", () => {
    languages.forEach((lang) => selectedLanguageCodes.add(lang.iso_code));
    updateVisuals();
    renderLanguageList(languageSearchEl.value);
  });

  clearSelectionBtn.addEventListener("click", () => {
    selectedLanguageCodes.clear();
    updateVisuals();
    renderLanguageList(languageSearchEl.value);
  });
};

const renderLanguageList = (filterText = "") => {
  const normalized = filterText.trim().toLowerCase();
  languageListEl.innerHTML = "";

  const filtered = languages.filter((lang) =>
    lang.name.toLowerCase().includes(normalized)
  );

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No languages match your search.";
    languageListEl.appendChild(empty);
    return;
  }

  filtered.forEach((lang) => {
    const label = document.createElement("label");
    label.className = "language-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = lang.iso_code;
    checkbox.checked = selectedLanguageCodes.has(lang.iso_code);
    checkbox.addEventListener("change", (event) => {
      if (event.target.checked) {
        selectedLanguageCodes.add(lang.iso_code);
      } else {
        selectedLanguageCodes.delete(lang.iso_code);
      }
      updateVisuals();
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "language-name";
    nameSpan.textContent = lang.name;

    const totalSpan = document.createElement("span");
    totalSpan.className = "language-total";
    totalSpan.textContent = formatLanguageTotal(
      lang.total_speakers_millions
    );

    label.appendChild(checkbox);
    label.appendChild(nameSpan);
    label.appendChild(totalSpan);
    languageListEl.appendChild(label);
  });
};

// Map rendering ------------------------------------------------------------
const initMap = () => {
  if (typeof d3 === "undefined") {
    mapContainer.innerHTML =
      '<p class="empty-state">The map library failed to load. Please refresh the page.</p>';
    return;
  }

  mapSvg = d3
    .select("#map")
    .append("svg")
    .attr("role", "presentation")
    .attr("aria-hidden", "true");

  mapTooltip = d3
    .select("body")
    .append("div")
    .attr("class", "map-tooltip")
    .text("");

  drawMap();
  window.addEventListener("resize", drawMap);
};

const drawMap = () => {
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;

  mapSvg.attr("width", width).attr("height", height);

  const projection = d3
    .geoMercator()
    .fitSize([width, height], { type: "FeatureCollection", features: worldFeatures });
  const pathGenerator = d3.geoPath().projection(projection);

  const countries = mapSvg
    .selectAll("path.country")
    .data(worldFeatures, (d) => d.properties.iso_a2 || d.properties.name);

  countries
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "country")
          .attr("d", pathGenerator)
          .on("mousemove", (event, feature) => showTooltip(event, feature))
          .on("mouseleave", hideTooltip),
      (update) => update.attr("d", pathGenerator)
    )
    .attr("d", pathGenerator);

  updateMapFill();
};

const updateMapFill = () => {
  if (!mapSvg) return;
  const selected = getSelectedLanguages();
  const countryLanguageMap = buildCountryLanguageMap(selected);

  mapSvg
    .selectAll("path.country")
    .attr("fill", (d) =>
      countryLanguageMap.has((d.properties.iso_a2 || "").toUpperCase())
        ? MAP_COLOR_ACTIVE
        : MAP_COLOR_BASE
    )
    .attr("opacity", (d) =>
      countryLanguageMap.has((d.properties.iso_a2 || "").toUpperCase()) ? 0.95 : 0.65
    );

  mapSvg
    .selectAll("path.country")
    .each(function (d) {
      this.__languages = countryLanguageMap.get(
        (d.properties.iso_a2 || "").toUpperCase()
      );
    });
};

const showTooltip = (event, feature) => {
  const languagesForCountry = event.currentTarget.__languages;
  const countryName = feature.properties.name;
  const content = languagesForCountry
    ? `<strong>${countryName}</strong><br>${Array.from(languagesForCountry).join(
        ", "
      )}`
    : `<strong>${countryName}</strong><br>No selected languages here`;

  mapTooltip.html(content);
  mapTooltip
    .style("left", `${event.pageX + 12}px`)
    .style("top", `${event.pageY - 28}px`)
    .classed("visible", true);
};

const hideTooltip = () => {
  mapTooltip.classed("visible", false);
};

// Chart rendering ----------------------------------------------------------
const initChart = () => {
  if (typeof Chart === "undefined") {
    chartCanvas.style.display = "none";
    chartPlaceholderEl.textContent =
      "The chart library could not be loaded. Please refresh to try again.";
    return;
  }

  const ctx = chartCanvas.getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw;
              const total = context.dataset.data.reduce((sum, n) => sum + n, 0);
              const share = total ? ((value / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${value.toLocaleString()}M (${share}%)`;
            },
          },
        },
      },
    },
  });
};

const updateChart = () => {
  if (!chartInstance) {
    chartPlaceholderEl.style.display = "flex";
    return;
  }

  const selected = getSelectedLanguages();
  if (!selected.length) {
    chartCanvas.style.display = "none";
    chartPlaceholderEl.style.display = "flex";
    chartInstance.data.labels = [];
    chartInstance.data.datasets[0].data = [];
    chartInstance.update();
    return;
  }

  chartCanvas.style.display = "block";
  chartPlaceholderEl.style.display = "none";

  const palette = [
    "#0c7bdc",
    "#5c8ef2",
    "#8ac4ff",
    "#ffaf87",
    "#ff6f91",
    "#7bdcb5",
    "#f9dc5c",
    "#b19cd9",
    "#ffa69e",
  ];

  chartInstance.data.labels = selected.map((lang) => lang.name);
  chartInstance.data.datasets[0].data = selected.map(
    (lang) => lang.total_speakers_millions
  );
  chartInstance.data.datasets[0].backgroundColor = selected.map(
    (_, index) => palette[index % palette.length]
  );
  chartInstance.update();
};

// Summary ------------------------------------------------------------------
const updateSummary = () => {
  const selected = getSelectedLanguages();
  if (!selected.length) {
    summaryEl.innerHTML =
      '<p class="disclaimer">Select at least one language to estimate how many people you can probably talk to.</p>';
    return;
  }

  const totalMillions = selected.reduce(
    (sum, lang) => sum + lang.total_speakers_millions,
    0
  );
  const percentWorld = (totalMillions * 1_000_000) / WORLD_POPULATION * 100;

  summaryEl.innerHTML = `
    <p class="headline">Approximate total people you can talk to</p>
    <p class="value">${formatBillions(totalMillions)}</p>
    <p class="value-secondary">${formatPercent(percentWorld)}</p>
    <p class="disclaimer">Naïve sum of L1 + L2 speakers for all selected languages. People who speak more than one of them are counted multiple times.</p>
  `;
};

// Visual refresh -----------------------------------------------------------
const updateVisuals = () => {
  updateMapFill();
  updateChart();
  updateSummary();
};

document.addEventListener("DOMContentLoaded", init);
