// ============================================================
// APP.JS - LOGIQUE PRINCIPALE DU TABLEAU DE BORD
// ============================================================

let monGraphique = null;
let symboleActif = null;
let echelleActuelle = CONFIG.echelleParDefaut;

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const RSS_PROXY  = "https://api.rss2json.com/v1/api.json?rss_url=";
const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`
];

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  chargerTousLesTickers();
  chargerToutesLesActualites();
  setInterval(chargerTousLesTickers, CONFIG.actualisationMinutes * 60 * 1000);
  setInterval(chargerToutesLesActualites, 30 * 60 * 1000);
});

// ============================================================
// MODE CLAIR / SOMBRE
// ============================================================
function toggleMode() {
  const body = document.body;
  const btn  = document.getElementById("toggleMode");
  if (body.classList.contains("dark")) {
    body.classList.replace("dark", "light");
    btn.textContent = "🌙 Mode sombre";
  } else {
    body.classList.replace("light", "dark");
    btn.textContent = "☀️ Mode clair";
  }
  if (monGraphique) mettreAJourCouleurGraphique();
}

// ============================================================
// FETCH AVEC FALLBACK MULTI-PROXY
// ============================================================
async function fetchAvecProxy(yahooUrl) {
  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy(yahooUrl), { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data?.chart?.result) return data;
    } catch (e) {
      continue;
    }
  }
  return null;
}

// ============================================================
// CHARGEMENT DES TICKERS
// ============================================================
async function chargerTousLesTickers() {
  const toutes = [
    ...CONFIG.indices,
    ...CONFIG.actionsDetenues,
    ...CONFIG.actionsSurveiller
  ];

  await Promise.all(toutes.map(t => chargerTicker(t)));

  const now = new Date();
  document.getElementById("lastUpdate").textContent =
    "Dernière mise à jour : " + now.toLocaleTimeString("fr-FR");
}

async function chargerTicker(ticker) {
  try {
    const yahooUrl = YAHOO_BASE + ticker.symbole + "?interval=1d&range=5d";
    const data     = await fetchAvecProxy(yahooUrl);
    if (!data) { afficherTicker(ticker, null, null); return; }

    const meta      = data.chart.result[0].meta;
    const prix      = meta.regularMarketPrice;
    const precedent = meta.chartPreviousClose;
    const variation = ((prix - precedent) / precedent) * 100;

    afficherTicker(ticker, prix, variation);
  } catch (e) {
    afficherTicker(ticker, null, null);
  }
}

function afficherTicker(ticker, prix, variation) {
  let conteneur = null;
  if (CONFIG.indices.find(t => t.symbole === ticker.symbole))
    conteneur = document.getElementById("indicesGrid");
  else if (CONFIG.actionsDetenues.find(t => t.symbole === ticker.symbole))
    conteneur = document.getElementById("actionsDeteGrid");
  else
    conteneur = document.getElementById("actionsSurvGrid");

  const idSafe = "ticker-" + ticker.symbole.replace(/[^a-z0-9]/gi, "_");
  let el = document.getElementById(idSafe);
  if (!el) {
    el = document.createElement("div");
    el.className = "ticker-item";
    el.id = idSafe;
    el.onclick = () => ouvrirGraphique(ticker);
    conteneur.appendChild(el);
  }

  const classeVar = variation === null ? "neutre" : variation >= 0 ? "positif" : "negatif";
  const fleche    = variation === null ? "" : variation >= 0 ? "▲" : "▼";
  const prixAff   = prix !== null
    ? prix.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "--";
  const varAff    = variation !== null
    ? fleche + " " + Math.abs(variation).toFixed(2) + "%"
    : "--";

  el.innerHTML = `
    <div class="ticker-nom">${ticker.nom}</div>
    <div class="ticker-prix ${classeVar}">${prixAff}</div>
    <div class="ticker-variation ${classeVar}">${varAff}</div>
  `;
}

// ============================================================
// GRAPHIQUE
// ============================================================
async function ouvrirGraphique(ticker) {
  symboleActif = ticker;
  document.getElementById("graphSection").style.display = "block";
  document.getElementById("graphTitle").textContent = ticker.nom;
  document.getElementById("graphSection").scrollIntoView({ behavior: "smooth" });

  document.querySelectorAll(".ticker-item").forEach(el => el.classList.remove("selected"));
  const el = document.getElementById("ticker-" + ticker.symbole.replace(/[^a-z0-9]/gi, "_"));
  if (el) el.classList.add("selected");

  await dessinerGraphique(ticker, echelleActuelle);
}

async function changerEchelle(echelle) {
  echelleActuelle = echelle;
  document.querySelectorAll(".echelles button").forEach(b => {
    b.classList.toggle("active", b.textContent === echelle);
  });
  if (symboleActif) await dessinerGraphique(symboleActif, echelle);
}

function echelleVersParams(echelle) {
  const map = {
    "1J":  { interval: "5m",  range: "1d"  },
    "1S":  { interval: "1h",  range: "5d"  },
    "1M":  { interval: "1d",  range: "1mo" },
    "3M":  { interval: "1d",  range: "3mo" },
    "6M":  { interval: "1wk", range: "6mo" },
    "1A":  { interval: "1wk", range: "1y"  },
    "5A":  { interval: "1mo", range: "5y"  },
    "10A": { interval: "1mo", range: "10y" },
    "MAX": { interval: "3mo", range: "max" }
  };
  return map[echelle] || map["1M"];
}

async function dessinerGraphique(ticker, echelle) {
  try {
    const { interval, range } = echelleVersParams(echelle);
    const yahooUrl = YAHOO_BASE + ticker.symbole + `?interval=${interval}&range=${range}`;
    const data     = await fetchAvecProxy(yahooUrl);
    if (!data) return;

    const result     = data.chart.result[0];
    const timestamps = result.timestamp;
    const prix       = result.indicators.quote[0].close;

    const labels = timestamps.map(ts => {
      const d = new Date(ts * 1000);
      if (echelle === "1J")
        return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (["1S", "1M", "3M"].includes(echelle))
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    });

    const isDark       = document.body.classList.contains("dark");
    const couleurGrille = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const couleurTexte  = isDark ? "#8892a4" : "#5a6478";

    if (monGraphique) { monGraphique.destroy(); monGraphique = null; }

    monGraphique = new Chart(document.getElementById("monGraphique"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: ticker.nom,
          data: prix,
          borderColor: "#3d8ef8",
          backgroundColor: "rgba(61,142,248,0.08)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.parsed.y !== null
                ? ctx.parsed.y.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €"
                : ""
            }
          }
        },
        scales: {
          x: {
            ticks: { color: couleurTexte, maxTicksLimit: 8, maxRotation: 0 },
            grid:  { color: couleurGrille }
          },
          y: {
            ticks: { color: couleurTexte, callback: v => v.toLocaleString("fr-FR") },
            grid:  { color: couleurGrille }
          }
        }
      }
    });
  } catch (e) {
    console.error("Erreur graphique :", e);
  }
}

function mettreAJourCouleurGraphique() {
  if (symboleActif) dessinerGraphique(symboleActif, echelleActuelle);
}

// ============================================================
// ACTUALITÉS RSS
// ============================================================
async function chargerToutesLesActualites() {
  await chargerFlux(CONFIG.flux.economie,    "newsEconomie");
  await chargerFlux(CONFIG.flux.technologie, "newsTech");
  await chargerFlux(CONFIG.flux.ia,          "newsIA");
}

async function chargerFlux(sources, conteneurId) {
  const conteneur = document.getElementById(conteneurId);
  conteneur.innerHTML = "Chargement...";

  let articles = [];

  for (const source of sources) {
    try {
      const resp = await fetch(RSS_PROXY + encodeURIComponent(source.url));
      const data = await resp.json();
      if (data.items) {
        data.items.slice(0, 8).forEach(item => {
          articles.push({
            titre:  item.title,
            lien:   item.link,
            date:   item.pubDate,
            source: source.nom
          });
        });
      }
    } catch (e) {
      console.warn("Erreur flux RSS :", source.nom, e);
    }
  }

  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (articles.length === 0) {
    conteneur.innerHTML = "<p style='color:var(--text-secondary);font-size:0.85rem'>Aucun article disponible.</p>";
    return;
  }

  const visibles = articles.slice(0, 5);
  const cachees  = articles.slice(5);

  const htmlVisibles = visibles.map(a => renderArticle(a)).join("");
  const htmlCachees  = cachees.length > 0
    ? `<div class="news-more" id="more-${conteneurId}" style="display:none">
        ${cachees.map(a => renderArticle(a)).join("")}
       </div>
       <button class="btn-more" onclick="afficherPlus('${conteneurId}')">
         ▼ Afficher plus (${cachees.length})
       </button>`
    : "";

  conteneur.innerHTML = htmlVisibles + htmlCachees;
}

function afficherPlus(conteneurId) {
  const more = document.getElementById("more-" + conteneurId);
  const btn  = more.nextElementSibling;
  if (more.style.display === "none") {
    more.style.display = "block";
    btn.textContent = "▲ Afficher moins";
  } else {
    more.style.display = "none";
    const total = more.querySelectorAll(".news-item").length;
    btn.textContent = `▼ Afficher plus (${total})`;
  }
}

function renderArticle(a) {
  return `
    <div class="news-item">
      <div class="news-source">${a.source}</div>
      <a class="news-titre" href="${a.lien}" target="_blank" rel="noopener">${a.titre}</a>
      <div class="news-date">${formaterDate(a.date)}</div>
    </div>
  `;
}

function formaterDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
