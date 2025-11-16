// Global constants
const WORLD_POPULATION = 8_100_000_000; // Approximate 2023 world population
const MAP_WIDTH = 900;
const MAP_HEIGHT = 480;

// State containers
let languageData = [];
let worldFeatures = [];
let languageSelect;
let chart;
let tooltip;
let currentCountryLanguageMap = new Map();

// DOM references
const languageSearchInput = document.getElementById('languageSearch');
const totalPeopleEl = document.getElementById('totalPeople');
const percentPeopleEl = document.getElementById('percentPeople');
const chartPlaceholder = document.getElementById('chartPlaceholder');

// Initialize once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  languageSelect = document.getElementById('languageSelect');
  initApp();
});

async function initApp() {
  try {
    const [languageResponse, worldResponse] = await Promise.all([
      fetch('data/languages.json'),
      fetch('data/world.geojson')
    ]);

    languageData = await languageResponse.json();
    const worldJson = await worldResponse.json();
    worldFeatures = worldJson.features;

    populateLanguageSelect();
    initMap();
    initChart();
    attachEventListeners();
    updateVisuals();
  } catch (error) {
    console.error('Failed to load data', error);
  }
}

function populateLanguageSelect() {
  const sorted = [...languageData].sort(
    (a, b) => b.total_speakers_millions - a.total_speakers_millions
  );

  sorted.forEach((language) => {
    const option = document.createElement('option');
    option.value = language.iso_code;
    option.textContent = `${language.name} (${(language.total_speakers_millions / 1000).toFixed(2)}B)`;
    languageSelect.appendChild(option);
  });

  if (languageSelect.options.length) {
    languageSelect.options[0].selected = true;
  }
}

function attachEventListeners() {
  languageSelect.addEventListener('change', updateVisuals);
  languageSearchInput.addEventListener('input', handleLanguageSearch);
}

function handleLanguageSearch(event) {
  const query = event.target.value.toLowerCase().trim();
  Array.from(languageSelect.options).forEach((option) => {
    const matches = option.textContent.toLowerCase().includes(query);
    option.hidden = !matches;
  });
}

function initMap() {
  const mapContainer = document.getElementById('map');
  const svg = d3
    .select(mapContainer)
    .append('svg')
    .attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const projection = d3
    .geoNaturalEarth1()
    .fitSize([MAP_WIDTH, MAP_HEIGHT], { type: 'FeatureCollection', features: worldFeatures });

  const path = d3.geoPath(projection);

  tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip');

  svg
    .selectAll('path')
    .data(worldFeatures)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', path)
    .on('mousemove', (event, feature) => {
      const { iso_a2, name } = feature.properties;
      const spokenLanguages = currentCountryLanguageMap.get(iso_a2) || [];
      const tooltipText = [name, spokenLanguages.length ? `Languages: ${spokenLanguages.join(', ')}` : 'No selected language']
        .join('<br/>');
      tooltip
        .html(tooltipText)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`)
        .style('opacity', 1);
    })
    .on('mouseout', () => {
      tooltip.style('opacity', 0);
    });
}

function initChart() {
  const ctx = document.getElementById('populationChart');
  const colorPalette = [
    '#2563eb',
    '#f97316',
    '#10b981',
    '#ef4444',
    '#8b5cf6',
    '#14b8a6',
    '#f59e0b',
    '#ec4899',
    '#3b82f6',
    '#a3e635',
    '#0ea5e9',
    '#9333ea',
    '#e11d48',
    '#22c55e',
    '#6366f1'
  ];
  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Share of selected languages',
          data: [],
          backgroundColor: colorPalette,
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((sum, item) => sum + item, 0);
              const share = total ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value.toFixed(0)}M (${share}%)`;
            }
          }
        }
      }
    }
  });
}

function getSelectedLanguages() {
  const selectedCodes = Array.from(languageSelect.selectedOptions).map((option) => option.value);
  return languageData.filter((language) => selectedCodes.includes(language.iso_code));
}

function buildCountryLanguageMap(selectedLanguages) {
  const map = new Map();
  selectedLanguages.forEach((language) => {
    language.countries_iso2.forEach((countryCode) => {
      if (!map.has(countryCode)) {
        map.set(countryCode, []);
      }
      map.get(countryCode).push(language.name);
    });
  });
  return map;
}

function updateVisuals() {
  const selectedLanguages = getSelectedLanguages();
  updateMap(selectedLanguages);
  updateChart(selectedLanguages);
  updateSummary(selectedLanguages);
}

function updateMap(selectedLanguages) {
  currentCountryLanguageMap = buildCountryLanguageMap(selectedLanguages);
  d3.selectAll('.country').classed('highlighted', (feature) => {
    const code = feature.properties.iso_a2;
    return currentCountryLanguageMap.has(code);
  });
}

function updateChart(selectedLanguages) {
  const totals = selectedLanguages.map((language) => language.total_speakers_millions);
  chart.data.labels = selectedLanguages.map((language) => language.name);
  chart.data.datasets[0].data = totals;
  chart.update();

  if (selectedLanguages.length === 0) {
    chartPlaceholder.classList.remove('hidden');
  } else {
    chartPlaceholder.classList.add('hidden');
  }
}

function updateSummary(selectedLanguages) {
  const totalMillions = selectedLanguages.reduce(
    (sum, language) => sum + language.total_speakers_millions,
    0
  );
  const totalPeople = totalMillions * 1_000_000;
  const percent = totalPeople ? (totalPeople / WORLD_POPULATION) * 100 : 0;

  const totalBillionsFormatter = new Intl.NumberFormat('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  totalPeopleEl.textContent = `${totalBillionsFormatter.format(totalPeople / 1_000_000_000)}B people`;
  percentPeopleEl.textContent = `${percent.toFixed(1)}% of world population`;
}
