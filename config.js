// ============================================================
// FICHIER DE CONFIGURATION - TABLEAU DE BORD FINANCIER
// ============================================================

const CONFIG = {

  // -- URL DU SERVEUR RELAIS --
  apiUrl: "https://dashboard-api-pi-six.vercel.app/api/yahoo",

  // -- INDICES ET CRYPTO --
  indices: [
    { nom: "CAC 40",    symbole: "^FCHI"    },
    { nom: "Dow Jones", symbole: "^DJI"     },
    { nom: "S&P 500",   symbole: "^GSPC"    },
    { nom: "Bitcoin",   symbole: "BTC-USD"  }
  ],

  // -- ACTIONS DÉTENUES --
  actionsDetenues: [
    { nom: "AXA",         symbole: "CS.PA"   },
    { nom: "BNP Paribas", symbole: "BNP.PA"  },
    { nom: "Engie",       symbole: "ENGI.PA" },
    { nom: "FDJ",         symbole: "FDJU.PA"  },
    { nom: "Michelin",    symbole: "ML.PA"   },
    { nom: "Orange",      symbole: "ORA.PA"  },
    { nom: "TF1",         symbole: "TFI.PA"  },
    { nom: "Ubisoft",     symbole: "UBI.PA"  }
  ],

  // -- ACTIONS À SURVEILLER --
  actionsSurveiller: [
    { nom: "Air Liquide",      symbole: "AI.PA"   },
    { nom: "Airbus",           symbole: "AIR.PA"  },
    { nom: "Amundi",           symbole: "AMUN.PA" },
    { nom: "Dassault",         symbole: "DSY.PA"  },
    { nom: "Eiffage",          symbole: "FGR.PA"  },
    { nom: "Pernod Ricard",    symbole: "RI.PA"   },
    { nom: "Société Générale", symbole: "GLE.PA"  },
    { nom: "Thales",           symbole: "HO.PA"   },
    { nom: "TotalEnergies",    symbole: "TTE.PA"  },
    { nom: "Vicat",            symbole: "VCT.PA"  },
    { nom: "Vinci",            symbole: "DG.PA"   }
  ],

  // -- FLUX RSS ACTUALITÉS --
  flux: {
    economie: [
      { nom: "Les Échos",    url: "https://feeds.lesechos.fr/rss/rss_finance.xml" },
      { nom: "BFM Bourse",   url: "https://www.bfmtv.com/rss/economie/bourse/"    },
      { nom: "Le Monde Éco", url: "https://www.lemonde.fr/economie/rss_full.xml"  }
    ],
    technologie: [
      { nom: "01net",    url: "https://www.01net.com/feed/"    },
      { nom: "Numerama", url: "https://www.numerama.com/feed/" }
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
