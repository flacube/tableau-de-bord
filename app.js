// ============================================================
// APP.JS - LOGIQUE PRINCIPALE DU TABLEAU DE BORD
// ============================================================

let monGraphique = null;
let symboleActif = null;
let echelleActuelle = CONFIG.echelleParDefaut;

const FINNHUB_BASE  = "https://finnhub.io/api/v1";
const RSS_PROXY     = "https://api.rss2json.com/v1/api.json?rss_url=";

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
// CHARGEMENT DES TICKERS
// ============================================================
async function chargerTousLesTickers() {
  const toutes = [
    ...CONFIG.indices,
    ...CONFIG.actionsDetenues,
    ...CONFIG.actionsSurveiller
  ];

  // Finnhub limite à 60 req/min - on espace légèrement les appels
  for (const t of toutes) {
    await chargerTicker(t);
    await pause(300);
  }

  const now = new Date();
  document.getElementById("lastUpdate").textContent =
    "Dernière mise à jour : " + now.toLocaleTimeString("fr-FR");
}

function pause(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function chargerTicker(ticker) {
  try {
    const url  = `${FINNHUB_BASE}/quote?symbol=${ticker.finnhub}&token=${CONFIG.finnhubKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    // Finnhub retourne : c = prix actuel, pc = clôture précédente
    if (!data || data.c === 0) {
      afficherTicker(ticker, null, null);
      return;
    }

    const prix      = data.c;
    const precedent = data.pc;
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
// GRAPHIQUE - utilise Finnhub candles
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
  const now  = Math.floor(Date.now() / 1000);
  const map  = {
    "1J":  { resolution: "5",  from: now - 86400        },
    "1S":  { resolution: "60", from: now - 7 * 86400    },
    "1M":  { resolution: "D",  from: now - 30 * 86400   },
    "3M":  { resolution: "D",  from: now - 90 * 86400   },
    "6M":  { resolution: "W",  from: now - 180 * 86400  },
    "1A":  { resolution: "W",  from: now - 365 * 86400  },
    "5A":  { resolution: "M",  from: now - 5*365*86400  },
    "10A": { resolution: "M",  from: now - 10*365*86400 },
    "MAX": { resolution: "M",  from: now - 20*365*86400 }
  };
  return { ...map[echelle], to: now };
}

async function dessinerGraphique(ticker, echelle) {
  try {
    const { resolution, from, to } = echelleVersParams(echelle);
    const url  = `${FINNHUB_BASE}/stock/candle?symbol=${ticker.finnhub}&resolution=${resolution}&from=${from}&to=${to}&token=${CONFIG.finnhubKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || data.s === "no_data" || !data.t) {
      console.warn("Pas de données graphique pour", ticker.nom);
      return;
    }

    const labels = data.t.map(ts => {
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

    if (monGraphique) { monGraphique.destroy(); monGraphique = null; }

    monGraphique = new Chart(document.getElementById("monGraphique"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: ticker.nom,
          data: data.c,
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
                ? ctx.parsed.y.toLocaleString("fr-FR", { minimumFractionDigits: 2 })
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
