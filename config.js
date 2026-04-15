// ============================================================
// FICHIER DE CONFIGURATION - TABLEAU DE BORD FINANCIER
// ============================================================

const CONFIG = {

  // -- CLÉ API FINNHUB --
  finnhubKey: "d7foanhr01qqb8rh16igd7foanhr01qqb8rh16j0",

  // -- INDICES ET CRYPTO --
  indices: [
    { nom: "CAC 40",    symbole: "^FCHI",   finnhub: "^FCHI"        },
    { nom: "Dow Jones", symbole: "^DJI",    finnhub: "^DJI"         },
    { nom: "S&P 500",   symbole: "^GSPC",   finnhub: "^GSPC"        },
    { nom: "Bitcoin",   symbole: "BTC-USD", finnhub: "BINANCE:BTCUSDT" }
  ],

  // -- ACTIONS DÉTENUES --
  actionsDetenues: [
    { nom: "AXA",         symbole: "CS.PA",  finnhub: "EURONEXT:CS"   },
    { nom: "BNP Paribas", symbole: "BNP.PA", finnhub: "EURONEXT:BNP"  },
    { nom: "Engie",       symbole: "ENGI.PA",finnhub: "EURONEXT:ENGI" },
    { nom: "FDJ",         symbole: "FDJ.PA", finnhub: "EURONEXT:FDJ"  },
    { nom: "Michelin",    symbole: "ML.PA",  finnhub: "EURONEXT:ML"   },
    { nom: "Orange",      symbole: "ORA.PA", finnhub: "EURONEXT:ORA"  },
    { nom: "TF1",         symbole: "TFI.PA", finnhub: "EURONEXT:TFI"  },
    { nom: "Ubisoft",     symbole: "UBI.PA", finnhub: "EURONEXT:UBI"  }
  ],

  // -- ACTIONS À SURVEILLER --
  actionsSurveiller: [
    { nom: "Air Liquide",      symbole: "AI.PA",  finnhub: "EURONEXT:AI"   },
    { nom: "Airbus",           symbole: "AIR.PA", finnhub: "EURONEXT:AIR"  },
    { nom: "Amundi",           symbole: "AMUN.PA",finnhub: "EURONEXT:AMUN" },
    { nom: "Dassault",         symbole: "DSY.PA", finnhub: "EURONEXT:DSY"  },
    { nom: "Eiffage",          symbole: "FGR.PA", finnhub: "EURONEXT:FGR"  },
    { nom: "Pernod Ricard",    symbole: "RI.PA",  finnhub: "EURONEXT:RI"   },
    { nom: "Société Générale", symbole: "GLE.PA", finnhub: "EURONEXT:GLE"  },
    { nom: "Thales",           symbole: "HO.PA",  finnhub: "EURONEXT:HO"   },
    { nom: "TotalEnergies",    symbole: "TTE.PA", finnhub: "EURONEXT:TTE"  },
    { nom: "Vicat",            symbole: "VCT.PA", finnhub: "EURONEXT:VCT"  },
    { nom: "Vinci",            symbole: "DG.PA",  finnhub: "EURONEXT:DG"   }
  ],

  // -- FLUX RSS ACTUALITÉS --
  flux: {
    economie: [
      { nom: "Les Échos",    url: "https://feeds.lesechos.fr/rss/rss_finance.xml" },
      { nom: "BFM Bourse",   url: "https://www.bfmtv.com/rss/economie/bourse/"    },
      { nom: "Le Monde Éco", url: "https://www.lemonde.fr/economie/rss_full.xml"  }
    ],
    technologie: [
      { nom: "01net",    url: "https://www.01net.com/feed/"        },
      { nom: "Numerama", url: "https://www.numerama.com/feed/"     }
    ],
    ia: [
      { nom: "L'Usine Digitale", url: "https://www.usine-digitale.fr/rss/all.xml" },
      { nom: "Silicon.fr",       url: "https://www.silicon.fr/feed"               }
    ]
  },

  // -- PARAMÈTRES GÉNÉRAUX --
  actualisationMinutes: 15,
  echelleParDefaut: "1M"
};
