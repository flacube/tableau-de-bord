// ============================================================
// APP.JS - LOGIQUE PRINCIPALE DU TABLEAU DE BORD
// ============================================================

let graphPrix  = null;
let graphStoch = null;
let symboleActif   = null;
let echelleActuelle = CONFIG.echelleParDefaut;
let donneesActuelles = null;

// État des indicateurs
const indicateurs = {
  bollinger: false,
  mm:        false,
  stoch:     true
};

const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";

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
  if (donneesActuelles) rendreGraphiques(donneesActuelles);
}

// ============================================================
// INDICATEURS ON/OFF
// ============================================================
function toggleIndicateur(nom) {
  indicateurs[nom] = !indicateurs[nom];
  const btn = document.getElementById(
    nom === "bollinger" ? "btnBollinger" : nom === "mm" ? "btnMM" : "btnStoch"
  );
  btn.classList.toggle("active", indicateurs[nom]);

  if (nom === "stoch") {
    document.getElementById("stochPanel").style.display =
      indicateurs.stoch ? "block" : "none";
  }

  if (donneesActuelles) rendreGraphiques(donneesActuelles);
}

// ============================================================
// CHARGEMENT DES TICKERS (trié par ordre alphabétique)
// ============================================================
async function chargerTousLesTickers() {
  const indices    = [...CONFIG.indices].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const detenues   = [...CONFIG.actionsDetenues].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const surveiller = [...CONFIG.actionsSurveiller].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  // Vider les grilles avant de les remplir
  document.getElementById("indicesGrid").innerHTML    = "";
  document.getElementById("actionsDeteGrid").innerHTML = "";
  document.getElementById("actionsSurvGrid").innerHTML = "";

  // Créer les tuiles vides dans le bon ordre d'abord
  for (const ticker of [...indices, ...detenues, ...surveiller]) {
    let conteneur = null;
    if (CONFIG.indices.find(t => t.symbole === ticker.symbole))
      conteneur = document.getElementById("indicesGrid");
    else if (CONFIG.actionsDetenues.find(t => t.symbole === ticker.symbole))
      conteneur = document.getElementById("actionsDeteGrid");
    else
      conteneur = document.getElementById("actionsSurvGrid");

    const idSafe = "ticker-" + ticker.symbole.replace(/[^a-z0-9]/gi, "_");
    const el = document.createElement("div");
    el.className = "ticker-item";
    el.id = idSafe;
    el.onclick = () => ouvrirGraphique(ticker);
    el.innerHTML = `
      <div class="ticker-nom">${ticker.nom}</div>
      <div class="ticker-prix neutre">--</div>
      <div class="ticker-variation neutre">--</div>
    `;
    conteneur.appendChild(el);
  }

  // Charger les données en parallèle
  await Promise.all([
    ...indices.map(t => chargerTicker(t)),
    ...detenues.map(t => chargerTicker(t)),
    ...surveiller.map(t => chargerTicker(t))
  ]);

  const now = new Date();
  document.getElementById("lastUpdate").textContent =
    "Dernière mise à jour : " + now.toLocaleTimeString("fr-FR");
}
async function chargerTicker(ticker) {
  try {
    const url  = `${CONFIG.apiUrl}?symbol=${ticker.symbole}&interval=1d&range=1d`;
    const resp = await fetch(url);
    const data = await resp.json();

    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) {
      afficherTicker(ticker, null, null);
      return;
    }

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
  document.getElementById("stochPanel").style.display = indicateurs.stoch ? "block" : "none";
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
    const url  = `${CONFIG.apiUrl}?symbol=${ticker.symbole}&interval=${interval}&range=${range}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return;

    donneesActuelles = { result, echelle };
    rendreGraphiques({ result, echelle });
  } catch (e) {
    console.error("Erreur graphique :", e);
  }
}

function rendreGraphiques({ result, echelle }) {
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

  const isDark        = document.body.classList.contains("dark");
  const couleurGrille = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const couleurTexte  = isDark ? "#8892a4" : "#5a6478";

  // -- DATASETS PANNEAU PRINCIPAL --
  const datasets = [{
    label: "Prix",
    data: prix,
    borderColor: "#3d8ef8",
    backgroundColor: "rgba(61,142,248,0.08)",
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.3,
    fill: true,
    order: 3
  }];

  // Moyenne Mobile 20
  if (indicateurs.mm) {
    const mm20 = calculerMM(prix, 20);
    datasets.push({
      label: "MM20",
      data: mm20,
      borderColor: "#f5a623",
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      order: 2
    });
  }

  // Bandes de Bollinger
  if (indicateurs.bollinger) {
    const { upper, lower, middle } = calculerBollinger(prix, 20, 2);
    datasets.push(
      {
        label: "Bollinger Sup",
        data: upper,
        borderColor: "rgba(130,200,130,0.8)",
        borderWidth: 1,
        borderDash: [4, 3],
        pointRadius: 0,
        fill: false,
        order: 1
      },
      {
        label: "Bollinger Moy",
        data: middle,
        borderColor: "rgba(130,200,130,0.5)",
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: 1
      },
      {
        label: "Bollinger Inf",
        data: lower,
        borderColor: "rgba(130,200,130,0.8)",
        borderWidth: 1,
        borderDash: [4, 3],
        pointRadius: 0,
        backgroundColor: "rgba(130,200,130,0.05)",
        fill: "-1",
        order: 1
      }
    );
  }

  // -- GRAPHIQUE PRIX --
  if (graphPrix) { graphPrix.destroy(); graphPrix = null; }

  graphPrix = new Chart(document.getElementById("graphPrix"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: indicateurs.bollinger || indicateurs.mm,
          labels: { color: couleurTexte, boxWidth: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + " : " +
              (ctx.parsed.y !== null
                ? ctx.parsed.y.toLocaleString("fr-FR", { minimumFractionDigits: 2 })
                : "--")
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

  // -- GRAPHIQUE STOCH RSI --
  if (graphStoch) { graphStoch.destroy(); graphStoch = null; }

  if (indicateurs.stoch) {
    const { k, d } = calculerStochRSI(prix, 14, 3, 3);

    graphStoch = new Chart(document.getElementById("graphStoch"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "%K",
            data: k,
            borderColor: "#3d8ef8",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.3,
            fill: false
          },
          {
            label: "%D",
            data: d,
            borderColor: "#f5a623",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { color: couleurTexte, boxWidth: 12, font: { size: 10 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ctx.dataset.label + " : " +
                (ctx.parsed.y !== null ? ctx.parsed.y.toFixed(2) : "--")
            }
          },
          annotation: {}
        },
        scales: {
          x: {
            ticks: { color: couleurTexte, maxTicksLimit: 8, maxRotation: 0 },
            grid:  { color: couleurGrille }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: couleurTexte,
              callback: v => v,
              stepSize: 20
            },
            grid: { color: couleurGrille }
          }
        }
      }
    });
  }
}

// ============================================================
// CALCULS INDICATEURS
// ============================================================
function calculerMM(data, periode) {
  const propres = data.map(v => (v === null || isNaN(v)) ? null : v);
  return propres.map((_, i) => {
    const slice = propres.slice(Math.max(0, i - periode + 1), i + 1).filter(v => v !== null);
    if (slice.length < Math.min(periode, i + 1)) return null;
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function calculerBollinger(data, periode, ecartType) {
  const propres = data.map(v => (v === null || isNaN(v)) ? null : v);
  const middle  = calculerMM(propres, periode);
  const upper   = [];
  const lower   = [];

  propres.forEach((_, i) => {
    const slice = propres.slice(Math.max(0, i - periode + 1), i + 1).filter(v => v !== null);
    if (slice.length < 2) { upper.push(null); lower.push(null); return; }
    const moy      = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - moy, 2), 0) / slice.length;
    const std      = Math.sqrt(variance);
    upper.push(moy + ecartType * std);
    lower.push(moy - ecartType * std);
  });

  return { upper, lower, middle };
}

function calculerRSI(data, periode) {
  const propres = data.map(v => (v === null || isNaN(v)) ? null : v);
  const rsi     = new Array(propres.length).fill(null);
  if (propres.length < periode + 1) return rsi;

  let gains = 0, pertes = 0;
  let compteur = 0;
  for (let i = 1; i < propres.length && compteur < periode; i++) {
    if (propres[i] === null || propres[i-1] === null) continue;
    const diff = propres[i] - propres[i-1];
    if (diff > 0) gains += diff; else pertes -= diff;
    compteur++;
  }

  let avgGain  = gains / periode;
  let avgPerte = pertes / periode;
  let dernierIdx = periode;
  rsi[dernierIdx] = 100 - 100 / (1 + (avgPerte === 0 ? Infinity : avgGain / avgPerte));

  for (let i = dernierIdx + 1; i < propres.length; i++) {
    if (propres[i] === null || propres[i-1] === null) { rsi[i] = null; continue; }
    const diff   = propres[i] - propres[i-1];
    avgGain      = (avgGain  * (periode - 1) + Math.max(diff, 0))  / periode;
    avgPerte     = (avgPerte * (periode - 1) + Math.max(-diff, 0)) / periode;
    rsi[i]       = 100 - 100 / (1 + (avgPerte === 0 ? Infinity : avgGain / avgPerte));
  }

  return rsi;
}

function calculerStochRSI(data, periodeRSI, periodeStoch, lissage) {
  const rsi = calculerRSI(data, periodeRSI);
  const stochK = new Array(rsi.length).fill(null);

  for (let i = periodeStoch - 1; i < rsi.length; i++) {
    const slice = rsi.slice(i - periodeStoch + 1, i + 1).filter(v => v !== null);
    if (slice.length < periodeStoch) continue;
    const minRSI = Math.min(...slice);
    const maxRSI = Math.max(...slice);
    stochK[i] = maxRSI === minRSI ? 0 : ((rsi[i] - minRSI) / (maxRSI - minRSI)) * 100;
  }

  const k = calculerMM(stochK.map(v => v ?? null), lissage);
  const d = calculerMM(k.map(v => v ?? null), lissage);

  return { k, d };
}

function mettreAJourCouleurGraphique() {
  if (donneesActuelles) rendreGraphiques(donneesActuelles);
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
          articles.push({ titre: item.title, lien: item.link, date: item.pubDate, source: source.nom });
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

  conteneur.innerHTML = visibles.map(a => renderArticle(a)).join("") +
    (cachees.length > 0
      ? `<div class="news-more" id="more-${conteneurId}" style="display:none">
           ${cachees.map(a => renderArticle(a)).join("")}
         </div>
         <button class="btn-more" onclick="afficherPlus('${conteneurId}')">
           ▼ Afficher plus (${cachees.length})
         </button>`
      : "");
}

function afficherPlus(conteneurId) {
  const more = document.getElementById("more-" + conteneurId);
  const btn  = more.nextElementSibling;
  if (more.style.display === "none") {
    more.style.display = "block";
    btn.textContent = "▲ Afficher moins";
  } else {
    more.style.display = "none";
    btn.textContent = `▼ Afficher plus (${more.querySelectorAll(".news-item").length})`;
  }
}

function renderArticle(a) {
  return `
    <div class="news-item">
      <div class="news-source">${a.source}</div>
      <a class="news-titre" href="${a.lien}" target="_blank" rel="noopener">${a.titre}</a>
      <div class="news-date">${formaterDate(a.date)}</div>
    </div>`;
}

function formaterDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
