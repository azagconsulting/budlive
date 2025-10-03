
// Cannabis Idle Farm - reworked gameplay
(function(){
  'use strict';
 
  let __RESETTING = false;

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = n => (n >= 1e12 ? (n/1e12).toFixed(2)+'T' :
                    n >= 1e9  ? (n/1e9 ).toFixed(2)+'B' :
                    n >= 1e6  ? (n/1e6 ).toFixed(2)+'M' :
                    n >= 1e3  ? (n/1e3 ).toFixed(2)+'k' :
                    n.toFixed(2));
  const fmtMoney = (amount, { showPlus=false } = {}) => {
    const value = Number(amount) || 0;
    const sign = value < 0 ? '-' : (showPlus && value > 0 ? '+' : '');
    const abs = Math.abs(value);
    return `<span class="coin-text">${sign}<img src="assets/coin.png" alt="" class="coin-icon"> ${fmt(abs)}</span>`;
  };
  const formatTimer = sec => {
    if(!isFinite(sec)) return '--:--';
    if(sec <= 0) return 'bereit';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2,'0')}`;
  };

  const STAGE_LABELS = ['Keimphase', 'Vegetativ', 'VorBluete', 'Bluete', 'Finish'];

  // Spielzeit-Kalibrierung: 6 Wochen (42 Tage) -> 120s
  // 1 Spieltag ~ 2.857s Echtzeit bei 1x Tempo
  const GAME_DAY_REAL_SECONDS = 120/42;
  const DAYS_PER_YEAR = 365;

  const STRAINS = [
    { id:'gelato',  name:'Green Gelato',  tag:'GG', cost:50,  yield:50,  grow:120, quality:1.0, yieldBonus:0, offerBonus:1.0, desc:'Schnell und aromatisch', base:'assets/plants/greengelato', stages:['wachstum0','wachstum1','wachstum2','wachstum3','wachstum4','ende'] },
    { id:'zushi',   name:'Blue Zushi',    tag:'BZ', cost:320, yield:90,  grow:180, quality:1.1, yieldBonus:0.05, offerBonus:1.1, desc:'Frischer Hybrid' },
    { id:'honey',   name:'Honey Cream',   tag:'HC', cost:540, yield:150, grow:210, quality:1.0, yieldBonus:0.1, offerBonus:1.0, desc:'Cremige Indica' },
    { id:'amnesia', name:'Amnesia Haze',  tag:'AH', cost:900, yield:240, grow:260, quality:1.2, yieldBonus:0, offerBonus:1.2, desc:'Klassische Sativa' },
    { id:'gorilla', name:'Gorilla Glue',  tag:'GL', cost:1500,yield:360, grow:320, quality:1.1, yieldBonus:0.15, offerBonus:1.1, desc:'Harzige Power' },
    { id:'zkittle', name:'Zkittlez',      tag:'ZK', cost:2300,yield:520, grow:360, quality:1.3, yieldBonus:0.1, offerBonus:1.3, desc:'Suesser Regenbogen' },
    { id:'purpleHaze', name: 'Purple Haze', tag: 'PH', cost: 2800, yield: 600, grow: 400, quality: 1.4, yieldBonus: 0.2, offerBonus: 1.4, desc: 'Legendäre Sativa mit zerebraler Wirkung'},
    { id:'whiteWidow', name: 'White Widow', tag: 'WW', cost: 3500, yield: 750, grow: 420, quality: 1.3, yieldBonus: 0.25, offerBonus: 1.3, desc: 'Ein Klassiker, bekannt für hohen Harzbesatz'},
    { id:'northernLights', name: 'Northern Lights', tag: 'NL', cost: 4200, yield: 850, grow: 380, quality: 1.2, yieldBonus: 0.3, offerBonus: 1.2, desc: 'Robuste Indica mit schnellem Finish'},
    { id:'sourDiesel', name: 'Sour Diesel', tag: 'SD', cost: 4800, yield: 920, grow: 420, quality: 1.4, yieldBonus: 0.35, offerBonus: 1.4, desc: 'Energische Sativa mit Zitrusaroma'},
    { id:'blueDream', name: 'Blue Dream', tag: 'BD', cost: 5200, yield: 1000, grow: 450, quality: 1.3, yieldBonus: 0.4, offerBonus: 1.3, desc: 'Beliebter Hybrid für Entspannung'},
    { id:'girlScoutCookies', name: 'Girl Scout Cookies', tag: 'GSC', cost: 5800, yield: 1100, grow: 480, quality: 1.5, yieldBonus: 0.45, offerBonus: 1.5, desc: 'Süßer Indica-Dominanter Hybrid'},
    { id:'cheese', name: 'Cheese', tag: 'CH', cost: 6200, yield: 1150, grow: 500, quality: 1.4, yieldBonus: 0.5, offerBonus: 1.4, desc: 'Klassischer Cheese-Geschmack'},
    { id:'amnesiaLemon', name: 'Amnesia Lemon', tag: 'AL', cost: 6500, yield: 1200, grow: 520, quality: 1.6, yieldBonus: 0.55, offerBonus: 1.6, desc: 'Zitronige Amnesia-Variante'},
    { id:'bubbleGum', name: 'Bubble Gum', tag: 'BG', cost: 6800, yield: 1250, grow: 540, quality: 1.5, yieldBonus: 0.6, offerBonus: 1.5, desc: 'Süß wie Kaugummi'},
    { id:'superSilverHaze', name: 'Super Silver Haze', tag: 'SSH', cost: 7200, yield: 1300, grow: 560, quality: 1.7, yieldBonus: 0.65, offerBonus: 1.7, desc: 'Premium Haze-Sorte'},
    { id:'northernLights', name: 'Northern Lights', tag: 'NL', cost: 7500, yield: 1350, grow: 580, quality: 1.6, yieldBonus: 0.7, offerBonus: 1.6, desc: 'Robuste Indica mit schnellem Finish'},
    { id:'blueDream', name: 'Blue Dream', tag: 'BD', cost: 7800, yield: 1400, grow: 600, quality: 1.5, yieldBonus: 0.75, offerBonus: 1.5, desc: 'Beliebter Hybrid für Entspannung'},
    { id:'sourDiesel', name: 'Sour Diesel', tag: 'SD', cost: 8100, yield: 1450, grow: 620, quality: 1.7, yieldBonus: 0.8, offerBonus: 1.7, desc: 'Energische Sativa mit Zitrusaroma'},
    { id:'purpleHaze', name: 'Purple Haze', tag: 'PH', cost: 8400, yield: 1500, grow: 640, quality: 1.8, yieldBonus: 0.85, offerBonus: 1.8, desc: 'Legendäre Sativa mit zerebraler Wirkung'},
    { id:'whiteWidow', name: 'White Widow', tag: 'WW', cost: 8700, yield: 1550, grow: 660, quality: 1.6, yieldBonus: 0.9, offerBonus: 1.6, desc: 'Ein Klassiker, bekannt für hohen Harzbesatz'},
    { id:'gorillaGlue', name: 'Gorilla Glue #4', tag: 'GG4', cost: 9000, yield: 1600, grow: 680, quality: 1.9, yieldBonus: 0.95, offerBonus: 1.9, desc: 'Harzige Power mit hohem THC'},
    { id:'zkittlez', name: 'Zkittlez', tag: 'ZK', cost: 9300, yield: 1650, grow: 700, quality: 1.7, yieldBonus: 1.0, offerBonus: 1.7, desc: 'Süßer Regenbogen mit tropischen Aromen'},
    { id:'amnesiaHaze', name: 'Amnesia Haze', tag: 'AH', cost: 9600, yield: 1700, grow: 720, quality: 1.8, yieldBonus: 1.05, offerBonus: 1.8, desc: 'Klassische Sativa mit euphorischer Wirkung'},
    { id:'blueZushi', name: 'Blue Zushi', tag: 'BZ', cost: 9900, yield: 1750, grow: 740, quality: 1.6, yieldBonus: 1.1, offerBonus: 1.6, desc: 'Frischer Hybrid mit blauer Färbung'},
    { id:'honeyCream', name: 'Honey Cream', tag: 'HC', cost: 10200, yield: 1800, grow: 760, quality: 1.7, yieldBonus: 1.15, offerBonus: 1.7, desc: 'Cremige Indica mit honigartigem Geschmack'},
    { id:'jackHerer', name: 'Jack Herer', tag: 'JH', cost: 10500, yield: 1850, grow: 780, quality: 1.8, yieldBonus: 1.2, offerBonus: 1.8, desc: 'Klassische Sativa mit klarer Wirkung'},
    { id:'ogKush', name: 'OG Kush', tag: 'OG', cost: 10800, yield: 1900, grow: 800, quality: 1.9, yieldBonus: 1.25, offerBonus: 1.9, desc: 'Legendäre Kush mit Erdbeer-Aroma'},
    { id:'trainwreck', name: 'Trainwreck', tag: 'TW', cost: 11100, yield: 1950, grow: 820, quality: 1.7, yieldBonus: 1.3, offerBonus: 1.7, desc: 'Energetische Sativa mit Zitrusgeschmack'},
    { id:'criticalMass', name: 'Critical Mass', tag: 'CM', cost: 11400, yield: 2000, grow: 840, quality: 1.6, yieldBonus: 1.35, offerBonus: 1.6, desc: 'Schwere Indica mit hohem Ertrag'},
    { id:'bigBud', name: 'Big Bud', tag: 'BB', cost: 11700, yield: 2050, grow: 860, quality: 1.8, yieldBonus: 1.4, offerBonus: 1.8, desc: 'Riesige Buds mit süßem Geschmack'},
    { id:'masterKush', name: 'Master Kush', tag: 'MK', cost: 12000, yield: 2100, grow: 880, quality: 1.9, yieldBonus: 1.45, offerBonus: 1.9, desc: 'Pure Indica mit entspannender Wirkung'},
    { id:'lemonHaze', name: 'Lemon Haze', tag: 'LH', cost: 12300, yield: 2150, grow: 900, quality: 1.7, yieldBonus: 1.5, offerBonus: 1.7, desc: 'Zitronige Haze mit euphorischer Wirkung'},
    { id:'afghanKush', name: 'Afghan Kush', tag: 'AK', cost: 12600, yield: 2200, grow: 920, quality: 1.8, yieldBonus: 1.55, offerBonus: 1.8, desc: 'Klassische Afghan Kush mit Haschgeschmack'},
    { id:'durbanPoison', name: 'Durban Poison', tag: 'DP', cost: 12900, yield: 2250, grow: 940, quality: 1.9, yieldBonus: 1.6, offerBonus: 1.9, desc: 'Pure Sativa mit medizinischen Eigenschaften'},
    { id:'hinduKush', name: 'Hindu Kush', tag: 'HK', cost: 13200, yield: 2300, grow: 960, quality: 1.7, yieldBonus: 1.65, offerBonus: 1.7, desc: 'Himalaya-Indica mit erdigen Aromen'},
    { id:'nepaleseJam', name: 'Nepalese Jam', tag: 'NJ', cost: 13500, yield: 2350, grow: 980, quality: 1.8, yieldBonus: 1.7, offerBonus: 1.8, desc: 'Süße Indica mit Beerengeschmack'},
    { id:'pakistaniChitral', name: 'Pakistani Chitral', tag: 'PC', cost: 13800, yield: 2400, grow: 1000, quality: 1.9, yieldBonus: 1.75, offerBonus: 1.9, desc: 'Seltene Chitral Kush mit hohem THC'},
    { id:'thaiStick', name: 'Thai Stick', tag: 'TS', cost: 14100, yield: 2450, grow: 1020, quality: 1.8, yieldBonus: 1.8, offerBonus: 1.8, desc: 'Legendäre Thai Sativa mit Mango-Aroma'},
    { id:'malawiGold', name: 'Malawi Gold', tag: 'MG', cost: 14400, yield: 2500, grow: 1040, quality: 2.0, yieldBonus: 1.85, offerBonus: 2.0, desc: 'Goldene Malawi Sativa mit Premium-Qualität'}
  ];

  const GLOBAL_UPGRADES = [
    { id:'lights', name:'LED-Growlights', baseCost:100, inc:0.15, desc:'Alle Pflanzen +15% Ertrag je Stufe' },
    { id:'nutrients', name:'Naehrstoff-Booster', baseCost:250, inc:0.20, desc:'Alle Pflanzen +20% je Stufe' },
    { id:'climate', name:'Klimasteuerung', baseCost:800, inc:0.35, desc:'Alle Pflanzen +35% je Stufe' },
    { id:'automation', name:'Automatisierung', baseCost:2500, inc:0.50, desc:'Alle Pflanzen +50% je Stufe' },
    { id:'resonance', name:'Resonanz-Soundscapes', baseCost:4200, inc:0.28, desc:'Frequenz-Tuning beschleunigt Wachstum (+28% je Stufe)' },
    { id:'biophotonics', name:'Biophotonik-Kuppeln', baseCost:6400, inc:0.40, desc:'Spektrale Lichtkuppeln +40% je Stufe' },
    { id:'hydroponics', name:'Hydroponik-System', baseCost:10000, inc:0.45, desc:'Wasserreduktion +45% je Stufe' },
    { id:'genetics', name:'Genetische Optimierung', baseCost:15000, inc:0.30, desc:'Qualitätsboost +30% je Stufe' },
    { id:'pest_control', name:'Schädlingsbekämpfung', baseCost:22000, inc:0.25, desc:'Schädlingsrisiko -25% je Stufe' },
    { id:'yield_enhancer', name:'Ertragsverstärker', baseCost:35000, inc:0.55, desc:'Ertrag +55% je Stufe' },
    { id:'growth_accelerator', name:'Wachstumsbeschleuniger', baseCost:50000, inc:0.35, desc:'Wachstum +35% je Stufe' },
    { id:'premium_lights', name:'Premium-Beleuchtung', baseCost:75000, inc:0.40, desc:'Ertrag +40% je Stufe' },
    { id:'ai_optimization', name:'KI-Optimierung', baseCost:100000, inc:0.50, desc:'Alle Effekte +50% je Stufe' },
    { id:'quantum_tech', name:'Quanten-Technologie', baseCost:150000, inc:0.60, desc:'Ertrag +60% je Stufe' },
    { id:'ultimate_boost', name:'Ultimativer Boost', baseCost:250000, inc:0.70, desc:'Alle Boni +70% je Stufe' },
  ];

  const ITEMS = [
    // Werkzeuge
    { id:'shears', name:'Schere', icon:'SC', cost:80, desc:'Zum Ernten erforderlich', category:'tools', effects:{} },
    { id:'watering_can', name:'Giesskanne', icon:'WC', cost:60, desc:'Zum Waessern erforderlich', category:'tools', effects:{} },
    { id:'nutrients', name:'Duenger-Set', icon:'DN', cost:110, desc:'Zum Fuettern erforderlich', category:'tools', effects:{} },
    // Handel & Preis
    { id:'scale', name:'Praezisionswaage', icon:'SW', cost:150, desc:'+5% Verkaufspreis', category:'commerce', effects:{ priceMult:1.05 } },
    { id:'jars', name:'Curing-Glaeser', icon:'JG', cost:300, desc:'+10% Verkaufspreis', category:'commerce', effects:{ priceMult:1.10 } },
    { id:'van', name:'Lieferwagen', icon:'LV', cost:600, desc:'+1 Anfrage, -10s Spawn', category:'commerce', effects:{ offerSlot:1, spawnDelta:10 } },
    // Ausstattung
    { id:'trimmer', name:'Trimmer', icon:'TR', cost:500, desc:'+5% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.05 } },
    { id:'filter', name:'Carbon-Filter', icon:'CF', cost:350, desc:'+5% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.05 } },
    { id:'fan', name:'Ventilator', icon:'VF', cost:220, desc:'Reduziert Schimmelrisiko', category:'equipment', effects:{ pestReduce:{ mold:0.6 } } },
    { id:'dehumidifier', name:'Entfeuchter', icon:'DH', cost:280, desc:'Reduziert Feuchte & Schimmel', category:'equipment', effects:{ pestReduce:{ mold:0.5 } } },
    // Pflanzenschutz
    { id:'sticky_traps', name:'Gelbtafeln', icon:'GT', cost:120, desc:'Reduziert Thripse', category:'pest', effects:{ pestReduce:{ thrips:0.5 } } },
    // Neue Gegenstaende
    { id:'humidifier', name:'Luftbefeuchter', icon:'HB', cost:260, desc:'Stabilisiert Klima, weniger Schimmel', category:'equipment', effects:{ pestReduce:{ mold:0.8 } } },
    { id:'irrigation', name:'Bewaesserungssystem', icon:'IR', cost:700, desc:'+5% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.05 } },
    { id:'ph_meter', name:'pH-Meter', icon:'PH', cost:180, desc:'+5% Pflanzenertrag', category:'tools', effects:{ yieldMult:1.05 } },
    { id:'thermometer', name:'Thermometer', icon:'TM', cost:90, desc:'Leicht besseres Klima', category:'equipment', effects:{ pestReduce:{ mold:0.95, thrips:0.95 } } },
    { id:'soundscape', name:'Soundscape-System', icon:'SS', cost:620, desc:'Beruhigt Pflanzen, +4% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.04 } },
    { id:'aero_drone', name:'Aero-Drone', icon:'AD', cost:820, desc:'Autonomes Pflegen, +5% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.05 } },
    { id:'brand_wall', name:'Markengalerie', icon:'HW', cost:1100, desc:'+12% Verkaufspreis', category:'commerce', effects:{ priceMult:1.12 } },
    { id:'genetic_analyzer', name:'Genetischer Analyzer', icon:'GA', cost:1500, desc:'Verbessert Kreuzungserfolge', category:'tools', effects:{} },
    { id:'hydro_system', name:'Hydroponik-System', icon:'HS', cost:2000, desc:'+10% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.1 } },
    { id:'led_panel', name:'LED-Panel', icon:'LP', cost:1800, desc:'Beschleunigt Wachstum', category:'equipment', effects:{ growthMult:1.15 } },
    { id:'co2_generator', name:'CO2-Generator', icon:'CO2', cost:2500, desc:'+15% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.15 } },
    { id:'auto_waterer', name:'Automatische Bewässerung', icon:'AW', cost:2200, desc:'Reduziert Wasserverbrauch', category:'equipment', effects:{ waterReduce:0.2 } },
    { id:'pest_trap', name:'Schädlingsfalle', icon:'PT', cost:1600, desc:'Reduziert Schädlinge', category:'equipment', effects:{ pestReduce:{ mites:0.3, thrips:0.3 } } },
    { id:'soil_tester', name:'Boden-Tester', icon:'ST', cost:1300, desc:'Verbessert Nährstoffaufnahme', category:'tools', effects:{ nutrientBoost:0.1 } },
    { id:'grow_tent', name:'Grow-Zelt', icon:'GT', cost:3000, desc:'+20% Pflanzenertrag', category:'equipment', effects:{ yieldMult:1.2 } },
    { id:'extraction_machine', name:'Extraktionsmaschine', icon:'EM', cost:4000, desc:'+25% Verkaufspreis', category:'equipment', effects:{ priceMult:1.25 } },
    { id:'plasma_lantern', name:'Plasma-Lantern', icon:'PL', cost:5200, desc:'Pulslicht +12% Wachstum', category:'equipment', effects:{ growthMult:1.12 } },
    { id:'nano_reservoir', name:'Nano-Reservoir', icon:'NR', cost:3600, desc:'Speichert Giesswasser, -30% Verbrauch', category:'equipment', effects:{ waterReduce:0.30 } },
    { id:'quantum_rootnet', name:'Quantum Rootnet', icon:'QR', cost:4400, desc:'Sensorwurzelnetz +12% Ertrag, +5% Qualitaet', category:'equipment', effects:{ yieldMult:1.12, qualityMult:1.05 } },
    { id:'ion_shower', name:'Ionendusche', icon:'IS', cost:4800, desc:'Erlebnisverkauf +18% Preis', category:'equipment', effects:{ priceMult:1.18 } },
    { id:'lunar_timer', name:'Lunar-Timer', icon:'LT', cost:950, desc:'Mondphasen-Timing +8% Wachstum', category:'tools', effects:{ growthMult:1.08 } },
    { id:'bio_sentry', name:'Bio-Sentry', icon:'BS', cost:2900, desc:'Bio-Scanner -40% Schaedlinge', category:'equipment', effects:{ pestReduce:{ mites:0.4, thrips:0.4, mold:0.35 } } }
  ];



  // Pests
  const PESTS = [
    { id:'mites', name:'Spinnmilben', icon:'???', base: 0.02, effect:{ growth:0.6, health:-2, quality:-0.01 }, prefers:'dry' },
    { id:'mold',  name:'Schimmel',    icon:'??', base: 0.015, effect:{ growth:0.3, health:-3, quality:-0.03 }, prefers:'wet' },
    { id:'thrips',name:'Thripse',     icon:'??', base: 0.018, effect:{ growth:0.8, health:-1, quality:-0.008 }, prefers:'any' },
  ];

  // Neues Forschungsmodell: 4 Branches mit Kacheln
  const RESEARCH_TREE = {
    botany: {
      name: 'Botanik',
      icon: '🌿',
      nodes: {
        'start_botany': { name: 'Grundlagen der Botanik', desc: 'Schaltet den Botanik-Zweig frei.', cost: 0, requires: [], position: { x: 50, y: 0 } },
        'yield_1': { name: 'Ertragssteigerung I', desc: '+10% Ertrag für alle Pflanzen.', cost: 1, effects: { yield: 0.1 }, requires: ['start_botany'], position: { x: 50, y: 100 } },
        'quality_1': { name: 'Qualitätsverbesserung I', desc: '+5% Qualität für alle Pflanzen.', cost: 1, effects: { quality: 0.05 }, requires: ['start_botany'], position: { x: 150, y: 100 } },
        'yield_2': { name: 'Ertragssteigerung II', desc: '+15% Ertrag für alle Pflanzen.', cost: 3, effects: { yield: 0.15 }, requires: ['yield_1'], position: { x: 50, y: 200 } },
        'quality_2': { name: 'Qualitätsverbesserung II', desc: '+10% Qualität für alle Pflanzen.', cost: 3, effects: { quality: 0.1 }, requires: ['quality_1'], position: { x: 150, y: 200 } },
        'genetics': { name: 'Genetische Optimierung', desc: 'Schaltet die Möglichkeit frei, Samen zu verbessern.', cost: 5, effects: { unlock_genetics: true }, requires: ['yield_2', 'quality_2'], position: { x: 100, y: 300 } },
      }
    },
    training: {
      name: 'Training',
      icon: '✂️',
      nodes: {
        'start_training': { name: 'Pflanzentraining', desc: 'Schaltet den Trainings-Zweig frei.', cost: 1, requires: [], position: { x: 350, y: 0 } },
        'lst': { name: 'Low Stress Training (LST)', desc: 'Biege deine Pflanzen für mehr Ertrag. +15% Ertrag, +5% Wachstumszeit.', cost: 2, effects: { yield: 0.15, growthTime: 0.05 }, requires: ['start_training'], position: { x: 300, y: 100 } },
        'hst': { name: 'High Stress Training (HST)', desc: 'Beschneide deine Pflanzen für höhere Qualität. +15% Qualität, +10% Wachstumszeit.', cost: 2, effects: { quality: 0.15, growthTime: 0.10 }, requires: ['start_training'], position: { x: 400, y: 100 } },
        'scrog': { name: 'Screen of Green (SCROG)', desc: 'Optimiere die Lichtverteilung. +20% Ertrag.', cost: 4, effects: { yield: 0.20 }, requires: ['lst'], position: { x: 300, y: 200 } },
        'supercropping': { name: 'Supercropping', desc: 'Kontrollierter Stress für maximale Potenz. +20% Qualität.', cost: 4, effects: { quality: 0.20 }, requires: ['hst'], position: { x: 400, y: 200 } },
        'mainlining': { name: 'Main-Lining', desc: 'Extreme Form des HST für gleichmäßige, große Colas. +25% Ertrag und +15% Qualität, +20% Wachstumszeit.', cost: 6, effects: { yield: 0.25, quality: 0.15, growthTime: 0.20 }, requires: ['scrog', 'supercropping'], position: { x: 350, y: 300 } },
      }
    },
    equipment: {
      name: 'Ausrüstung',
      icon: '💡',
      nodes: {
          'start_equipment': { name: 'Ausrüstungs-Upgrades', desc: 'Schaltet den Ausrüstungs-Zweig frei.', cost: 1, requires: [], position: { x: 600, y: 0 } },
          'lights_1': { name: 'Bessere Lampen', desc: '+10% Wachstum.', cost: 2, effects: { growth: 0.1 }, requires: ['start_equipment'], position: { x: 550, y: 100 } },
          'ventilation_1': { name: 'Bessere Lüftung', desc: '-15% Schädlingsrisiko.', cost: 2, effects: { pest: 0.15 }, requires: ['start_equipment'], position: { x: 650, y: 100 } },
          'hydroponics': { name: 'Hydroponik', desc: 'Pflanzen wachsen in Nährlösung. +30% Wachstum, -100% Wasserverbrauch, aber +50% Düngekosten.', cost: 5, effects: { growth: 0.3, water: 1.0, nutrientCost: 0.5 }, requires: ['lights_1', 'ventilation_1'], position: { x: 600, y: 200 } },
      }
    },
    economy: {
      name: 'Wirtschaft',
      icon: '💰',
      nodes: {
          'start_economy': { name: 'Wirtschafts-Wissen', desc: 'Schaltet den Wirtschafts-Zweig frei.', cost: 1, requires: [], position: { x: 850, y: 0 } },
          'prices_1': { name: 'Bessere Preise I', desc: '+10% auf alle Verkäufe.', cost: 2, effects: { priceMult: 0.1 }, requires: ['start_economy'], position: { x: 800, y: 100 } },
          'costs_1': { name: 'Kosten senken I', desc: '-15% auf alle Einkäufe im Shop.', cost: 2, effects: { cost: 0.15 }, requires: ['start_economy'], position: { x: 900, y: 100 } },
          'dealer': { name: 'Dealer-Netzwerk', desc: 'Schaltet neue, lukrativere Aufträge frei.', cost: 5, effects: { unlock_dealer: true }, requires: ['prices_1', 'costs_1'], position: { x: 850, y: 200 } },
      }
    }
  };

  // Grow-Raeume (Immobilien)
  const GROW_ROOMS = [
    { id:'closet', name:'Abstellkammer', slots:2, cost:0, exhaust:false, moldRisk:1.6, desc:'Kleiner Raum für Anfänger, keine Abluft.' },
    { id:'room', name:'Zimmer (Fenster)', slots:4, cost:1200, exhaust:true, moldRisk:1.2, desc:'Gemütliches Zimmer mit natürlicher Belüftung.' },
    { id:'basement', name:'Kellerraeume', slots:6, cost:3500, exhaust:true, moldRisk:1.0, desc:'Kühle Kellerraeume mit guter Isolierung.' },
    { id:'garage', name:'Garage', slots:8, cost:8000, exhaust:true, moldRisk:0.95, desc:'Große Garage für mittlere Operationen.' },
    { id:'warehouse', name:'Lagerhalle', slots:12, cost:20000, exhaust:true, moldRisk:0.9, desc:'Professionelle Lagerhalle mit Abluftsystem.' },
    { id:'bigwarehouse', name:'Großlager', slots:16, cost:45000, exhaust:true, moldRisk:0.85, desc:'Erweiterte Lagerhalle für mehr Pflanzen.' },
    { id:'factory', name:'Fabrik', slots:20, cost:80000, exhaust:true, moldRisk:0.8, desc:'Industrielle Fabrik mit automatischer Klimakontrolle.' },
    { id:'megafarm', name:'Mega-Farm', slots:30, cost:150000, exhaust:true, moldRisk:0.75, desc:'Massive Farm für Großproduktion.' },
    { id:'hyperfarm', name:'Hyper-Farm', slots:50, cost:300000, exhaust:true, moldRisk:0.7, desc:'Hochtechnologische Hyper-Farm.' },
    { id:'ultrafarm', name:'Ultra-Farm', slots:75, cost:600000, exhaust:true, moldRisk:0.65, desc:'Ultimative Farm mit maximaler Effizienz.' },
    { id:'supremefarm', name:'Supreme-Farm', slots:100, cost:1000000, exhaust:true, moldRisk:0.6, desc:'Die Supreme Farm für unbegrenzte Möglichkeiten.' },
  ];

  const MAX_SLOTS = 100;
  const SAVE_KEY = 'cannabis_idle_farm_v2';
  const BASE_PRICE_PER_G = 2;
  const OFFER_SPAWN_MIN = 45;
  const OFFER_SPAWN_MAX = 90;
  const MAX_ACTIVE_OFFERS_BASE = 3;

  // Employees
  const EMPLOYEES = [
    { id:'grower', name:'Grower', desc:'Automatisiert Wässern und Düngen', salary:200, tasks:['water', 'feed'], reqLevel:2, image:'https://via.placeholder.com/80x80/00c16a/ffffff?text=GROWER' },
    { id:'caretaker', name:'Caretaker', desc:'Behandelt Schädlinge automatisch', salary:250, tasks:['treat'], reqLevel:5, image:'https://via.placeholder.com/80x80/00c16a/ffffff?text=CARETAKER' },
    { id:'harvester', name:'Harvester', desc:'Automatisiert Ernten', salary:300, tasks:['harvest'], reqLevel:8, image:'https://via.placeholder.com/80x80/00c16a/ffffff?text=HARVESTER' },
  ];

  // Apotheken Verträge
  const APOTHEKEN_VERTRAEGE = [
    { id:'small_pharmacy', name:'Kleine Apotheke', desc:'Liefert 50g pro Monat für 500 Münzen', monthlyGrams:50, monthlyCash:500, costToHire:2000, reqLevel:6 },
    { id:'medium_pharmacy', name:'Mittlere Apotheke', desc:'Liefert 100g pro Monat für 1000 Münzen', monthlyGrams:100, monthlyCash:1000, costToHire:4000, reqLevel:8 },
    { id:'large_pharmacy', name:'Große Apotheke', desc:'Liefert 200g pro Monat für 2000 Münzen', monthlyGrams:200, monthlyCash:2000, costToHire:8000, reqLevel:10 },
    { id:'chain_pharmacy', name:'Apothekenkette', desc:'Liefert 500g pro Monat für 5000 Münzen', monthlyGrams:500, monthlyCash:5000, costToHire:20000, reqLevel:12 },
  ];

  const WATER_MAX = 100;
  const WATER_START = 55;
  const WATER_DRAIN_PER_SEC = 0.6;
  const WATER_ADD_AMOUNT = 55;

  const NUTRIENT_MAX = 100;
  const NUTRIENT_START = 60;
  const NUTRIENT_DRAIN_PER_SEC = 0.35;
  const NUTRIENT_ADD_AMOUNT = 45;
  const PGR_BOOST_SEC = 60; // Dauer PGR-Boost in Weltsekunden

  const HEALTH_DECAY_DRY = 6;
  const HEALTH_DECAY_HUNGRY = 4;
  const HEALTH_RECOVER_RATE = 2;
  const QUALITY_GAIN_GOOD = 0.03;
  const QUALITY_LOSS_BAD = 0.06;
  const READY_DECAY_DELAY = 45;

  const WATER_CONSUMABLE_PRICE = 5;
  const NUTRIENT_CONSUMABLE_PRICE = 7;

  // Difficulties
  const DIFFICULTIES = {
    easy:   { name:'Leicht', growth: 1.35, pest: 0.7 },
    normal: { name:'Normal', growth: 1.15, pest: 1.0 },
    hard:   { name:'Schwer', growth: 0.95, pest: 1.4 },
  };
  // Globaler Drossel-Faktor fuer Schädlings-Spawns (z. B. 0.25 = 25% der bisherigen Haeufigkeit)
  const PEST_GLOBAL_RATE = 0.25;
  // Zusaetzliche, konditionsbasierte Krankheiten/Probleme
  const EXTRA_PESTS = {
    root_rot: { id:'root_rot', name:'Wurzelfaeule', icon:'RR', base:0.006, effect:{ growth:0.4, health:-2.5, quality:-0.02 } },
    leaf_rot: { id:'leaf_rot', name:'Faule Blaetter', icon:'FB', base:0.008, effect:{ growth:0.7, health:-1.8, quality:-0.015 } },
  };
  function pestDefById(id){
    const p = (PESTS.find(p=>p.id===id));
    if(p) return p; return EXTRA_PESTS[id] || null;
  }

  let state = {
    grams:0,
    totalEarned:0,
    bestPerSec:0,
    hazePoints:0,
    resets:0,
    playtimeSec:0,
    // Spielzeit / Kalender
    timeSpeed:0,
    gameDaysTotal:0,
    lastYearProcessed:1,
    lastTime: Date.now(),
    growTierIndex:0,
    slotsUnlocked:2,
    plants:[],
    purchasedCount:{},
    upgrades:{},
    theme:'dark',
    cash:0,
    level:1,
    xp:0,
    totalCashEarned:0,
    tradesDone:0,
    offers:[],
    nextOfferIn:10,
    itemsOwned:{},
    seeds:{},
    cart:[],
    consumables:{ water:0, nutrient:0, spray:0, fungicide:0, beneficials:0 },
    difficulty:'normal',
    marketMult:1,
    marketTimer:0,
    marketEventName:'',
    // Research + Orders + Quality pool
    research:{},
    reputation:0,
    orders:[],
    nextOrderIn:60,
    qualityPool:{ grams:0, weighted:0 },
    // Jobs & Nachrichten
    jobId:null,
    applications:[],
    messages:[],
    nextMsgId:1,
    unreadMessages:0,
    maintenance:{ filterPenaltyActive:false, filterNextDueAtDays:0 },
    lastMonthProcessed:1,
    nextMarketEventIn:90,
    welcomeRewarded:false,
    sidebarCollapsed:false,
    customStrains:[],
    employees:{},
    apothekenVertraege:{},
    activeEvents:[]
  };

  function getStrain(id){
    const custom = (state.customStrains || []).find(s => s.id === id);
    if(custom) return custom;
    return STRAINS.find(s => s.id === id) || STRAINS[0];
  }

  function createPlant(strainId, slot){
    return {
      slot,
      strainId,
      level:1,
      growProg:0,
      water:WATER_START,
      nutrients:NUTRIENT_START,
      health:100,
      quality:1,
      readyTime:0
    };
  }

  function ensurePlantDefaults(plant){
    if(!plant) return;
    if(typeof plant.level !== 'number') plant.level = 1;
    if(typeof plant.growProg !== 'number' || Number.isNaN(plant.growProg)) plant.growProg = 0;
    plant.growProg = clamp(plant.growProg, 0, 1);
    if(typeof plant.water !== 'number' || Number.isNaN(plant.water)) plant.water = WATER_START;
    plant.water = clamp(plant.water, 0, WATER_MAX);
    if(typeof plant.nutrients !== 'number' || Number.isNaN(plant.nutrients)) plant.nutrients = NUTRIENT_START;
    plant.nutrients = clamp(plant.nutrients, 0, NUTRIENT_MAX);
    if(typeof plant.health !== 'number' || Number.isNaN(plant.health)) plant.health = 100;
    plant.health = clamp(plant.health, 0, 100);
    if(typeof plant.quality !== 'number' || Number.isNaN(plant.quality)) plant.quality = 1;
    plant.quality = clamp(plant.quality, 0.4, 1.5);
    if(typeof plant.readyTime !== 'number' || Number.isNaN(plant.readyTime)) plant.readyTime = 0;
    if(!plant.pest) plant.pest = null;
  }

  function ensureConsumables(){
    if(!state.consumables) state.consumables = { water:0, nutrient:0, spray:0, fungicide:0, beneficials:0, pgr:0 };
    if(typeof state.consumables.water !== 'number' || Number.isNaN(state.consumables.water)) state.consumables.water = 0;
    if(typeof state.consumables.nutrient !== 'number' || Number.isNaN(state.consumables.nutrient)) state.consumables.nutrient = 0;
    if(typeof state.consumables.spray !== 'number' || Number.isNaN(state.consumables.spray)) state.consumables.spray = 0;
    if(typeof state.consumables.fungicide !== 'number' || Number.isNaN(state.consumables.fungicide)) state.consumables.fungicide = 0;
    if(typeof state.consumables.beneficials !== 'number' || Number.isNaN(state.consumables.beneficials)) state.consumables.beneficials = 0;
    if(typeof state.consumables.pgr !== 'number' || Number.isNaN(state.consumables.pgr)) state.consumables.pgr = 0;
    state.consumables.water = Math.max(0, Math.floor(state.consumables.water));
    state.consumables.nutrient = Math.max(0, Math.floor(state.consumables.nutrient));
    state.consumables.spray = Math.max(0, Math.floor(state.consumables.spray));
    state.consumables.fungicide = Math.max(0, Math.floor(state.consumables.fungicide));
    state.consumables.beneficials = Math.max(0, Math.floor(state.consumables.beneficials));
    state.consumables.pgr = Math.max(0, Math.floor(state.consumables.pgr));
  }

  function slotUnlockCost(current){
    return Math.round(100 * Math.pow(1.75, Math.max(0, current - 1)));
  }

  function itemPriceMultiplier(){
    let mult = 1;
    for(const it of ITEMS){
      const owned = state.itemsOwned[it.id] || 0;
      if(!owned) continue;
      if(it.effects.priceMult) mult *= Math.pow(it.effects.priceMult, owned);
    }
    return mult;
  }

  function itemYieldMultiplier(){
    let mult = 1;
    for(const it of ITEMS){
      const owned = state.itemsOwned[it.id] || 0;
      if(!owned) continue;
      if(it.effects.yieldMult) mult *= Math.pow(it.effects.yieldMult, owned);
    }
    return mult;
  }

  function currentMaxOffers(){
    const extra = state.itemsOwned['van'] || 0;
    return MAX_ACTIVE_OFFERS_BASE + extra;
  }

  function currentSpawnWindow(){
    const delta = (state.itemsOwned['van'] || 0) * 10;
    return [Math.max(20, OFFER_SPAWN_MIN - delta), Math.max(25, OFFER_SPAWN_MAX - delta)];
  }

  function globalMultiplier(){
    let mult = 1;
    for(const up of GLOBAL_UPGRADES){
      const lvl = state.upgrades[up.id] || 0;
      if(lvl > 0) mult *= Math.pow(1 + up.inc, lvl);
    }
    mult *= itemYieldMultiplier();
    mult *= 1 + 0.05 * Math.sqrt(state.hazePoints || 0);
    return mult;
  }

  function harvestYieldFor(plant){
    const strain = getStrain(plant.strainId);
    const base = strain.yield || 10;
    const levelMult = Math.pow(1.12, Math.max(0, plant.level - 1));
    const res = researchEffects();
    const bonus = state.harvestBonus || 1;
    return base * levelMult * (1 + (res.yield||0)) * globalMultiplier() * bonus;
  }

  function growTimeFor(plant){
    const strain = getStrain(plant.strainId);
    // Blue Zushi: 7 Wochen in Spielzeit -> ca. 140s Basisdauer
    if(strain.id === 'zushi') return 140;
    return strain.grow || 180;
  }

  function strainWeeks(strain){
    if(!strain) return 6;
    if(strain.id === 'gelato') return 6;
    if(strain.id === 'zushi') return 7;
    const days = (strain.grow || 180) / GAME_DAY_REAL_SECONDS;
    return Math.max(4, Math.round(days / 7));
  }

  function qualityMultiplier(plant){
    const q = clamp(plant.quality || 1, 0.4, 1.5);
    const healthFactor = clamp((plant.health || 100)/100, 0.4, 1.1);
    const res = researchEffects();
    return q * (1 + (res.quality||0)) * healthFactor * globalQualityPenalty();
  }

  function globalQualityPenalty(){
    if(state?.maintenance?.filterPenaltyActive) return 0.95;
    return 1;
  }

  function timerForPlant(plant){
    if(plant.growProg >= 1) return 0;
    return Math.max(0, growTimeFor(plant) * (1 - plant.growProg));
  }

  function stageImagesFor(strain){
    if(strain && strain.id === 'gelato') return ['1','2','3'];
    if(strain && Array.isArray(strain.stages) && strain.stages.length > 0) return strain.stages;
    return ['phase-1','phase-2','phase-3','phase-4','phase-5','phase-6'];
  }

  function stageIndexFor(plant, stages){
    if(plant.growProg >= 1) return stages.length - 1;
    return Math.min(stages.length - 2, Math.floor(plant.growProg * (stages.length - 1)));
  }

  function statusForPlant(plant){
    const statuses = [];
    if(plant.growProg >= 1){
      statuses.push('Erntebereit');
    }else{
      const idx = Math.min(STAGE_LABELS.length - 1, Math.floor(plant.growProg * STAGE_LABELS.length));
      statuses.push(STAGE_LABELS[idx]);
    }
    if(plant.water < 25) statuses.push('Durstig');
    else if(plant.water > 90) statuses.push('Zu nass');
    if(plant.nutrients < 25) statuses.push('Braucht Duenger');
    if(plant.health < 45) statuses.push('Stress');
    if(statuses.length === 0) statuses.push('Stabil');
    return statuses.join(' Â· ');
  }

  function qualityLabel(value){
    const q = clamp(value || 1, 0, 2);
    if(q >= 1.35) return 'Top Shelf';
    if(q >= 1.15) return 'Premium';
    if(q >= 0.95) return 'Standard';
    if(q >= 0.75) return 'Mittel';
    return 'Schwach';
  }

  function setPlantMedia(card, plant){
    const img = card.querySelector('[data-phase-img]');
    const fallback = card.querySelector('[data-media-fallback]');
    if(!img || !fallback) return;
    const strain = getStrain(plant.strainId);
    const stages = stageImagesFor(strain);
    const idx = stageIndexFor(plant, stages);
    let base = strain.base || `assets/strains/${strain.id}`;
    if(strain.id === 'gelato') base = 'assets/plants/greengelato';
    let path = `${base}/${stages[idx]}.png`;
    let triedJpg = false;
    img.onload = () => {
      img.style.display = 'block';
      fallback.style.display = 'none';
    };
    img.onerror = () => {
      if(!triedJpg){ triedJpg = true; img.src = path.replace('.png','.jpg'); return; }
      img.style.display = 'none';
      fallback.style.display = 'grid';
    };
    img.src = path;
  }

    function updatePlantCard(card, plant){
    if(!card) return;
    const timerEl = card.querySelector('[data-timer]');
    if(timerEl) timerEl.textContent = formatTimer(timerForPlant(plant));
    const healthEl = card.querySelector('[data-health]');
    if(healthEl) {
      healthEl.textContent = `${Math.round(plant.health)}%`;
      const healthWrapper = healthEl.parentElement;
      healthWrapper.classList.remove('health-high', 'health-medium', 'health-low');
      if (plant.health > 70) {
        healthWrapper.classList.add('health-high');
      } else if (plant.health > 30) {
        healthWrapper.classList.add('health-medium');
      } else {
        healthWrapper.classList.add('health-low');
      }
    }
    const statusEl = card.querySelector('[data-status]');
    if(statusEl) statusEl.textContent = statusForPlant(plant);
    const qualityEl = card.querySelector('[data-quality]');
    if(qualityEl) qualityEl.textContent = qualityLabel(plant.quality);
    const yieldEl = card.querySelector('[data-yield]');
    if(yieldEl) yieldEl.textContent = Math.round(harvestYieldFor(plant) * qualityMultiplier(plant));
    const levelEl = card.querySelector('[data-level]');
    if(levelEl) levelEl.textContent = plant.level;
    const upgCostEl = card.querySelector('[data-upgrade-cost]');
    if(upgCostEl) upgCostEl.textContent = fmt(plantUpgradeCost(plant));
    const growthBar = card.querySelector('[data-progress]');
    if(growthBar) growthBar.style.width = `${(plant.growProg * 100).toFixed(1)}%`;
    const waterBar = card.querySelector('[data-water]');
    if(waterBar) waterBar.style.width = `${Math.round((plant.water / WATER_MAX) * 100)}%`;
    const nutrientBar = card.querySelector('[data-nutrient]');
    if(nutrientBar) nutrientBar.style.width = `${Math.round((plant.nutrients / NUTRIENT_MAX) * 100)}%`;
    const pestBadge = card.querySelector('[data-pest]');
    if(plant.pest){
      const pest = PESTS.find(p => p.id === plant.pest.id) || {icon:'??', name:'SchÃ¤dlinge'};
      const sev = Math.round((plant.pest.sev || 1) * 100);
      if(pestBadge){ pestBadge.textContent = pest.icon + ' ' + pest.name + ' (' + sev + '%)'; pestBadge.title = 'Befallen'; }
      card.classList.add('card-alert');
    } else {
      if(pestBadge){ pestBadge.textContent = ''; pestBadge.title = 'Gesund'; }
      card.classList.remove('card-alert');
    }
    setPlantMedia(card, plant);
    setActionStates(card, plant);
  }function plantUpgradeCost(plant){
    const strain = getStrain(plant.strainId);
    return Math.round(strain.cost * Math.pow(1.15, plant.level));
  }

  function strainPurchaseCost(strainId){
    const strain = getStrain(strainId);
    const count = state.purchasedCount[strainId] || 0;
    return Math.round(strain.cost * Math.pow(1.18, count));
  }

  function getTimeSpeed(){
    const t = Number(state.timeSpeed);
    return isFinite(t) ? t : 0;
  }

  function computePerSec(){
    const base = state.plants.reduce((sum, plant) => {
      ensurePlantDefaults(plant);
      if(plant.growProg >= 1 || plant.health <= 0) return sum;
      const slow = (plant.water <= 0 || plant.nutrients <= 0) ? 0.25 : 1;
      const d = DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
      const effTime = growTimeFor(plant) / (d.growth || 1);
      return sum + (harvestYieldFor(plant) * qualityMultiplier(plant) / effTime) * slow;
    }, 0);
    return base * getTimeSpeed();
  }

  function save(){
    if(__RESETTING) return;
    state.lastTime = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function load(){
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    try{
      const loaded = JSON.parse(raw);
      state = Object.assign({}, state, loaded);
      if(typeof state.lastTime !== 'number' || !isFinite(state.lastTime)) state.lastTime = Date.now();
      state.plants = Array.isArray(loaded.plants) ? loaded.plants : [];
      state.purchasedCount = loaded.purchasedCount || {};
      state.upgrades = loaded.upgrades || {};
      state.offers = Array.isArray(loaded.offers) ? loaded.offers : [];
      state.itemsOwned = loaded.itemsOwned || {};
      state.seeds = loaded.seeds || {};
      state.cart = Array.isArray(loaded.cart) ? loaded.cart : [];
      state.level = loaded.level || 1;
      state.xp = loaded.xp || 0;
      state.jobId = (typeof loaded.jobId !== 'undefined') ? loaded.jobId : null;
      state.applications = Array.isArray(loaded.applications) ? loaded.applications : [];
      state.messages = Array.isArray(loaded.messages) ? loaded.messages : [];
      state.nextMsgId = loaded.nextMsgId || 1;
      state.unreadMessages = typeof loaded.unreadMessages === 'number' ? loaded.unreadMessages : (state.unreadMessages||0);
      state.theme = loaded.theme || 'dark';
      state.consumables = loaded.consumables || { water:0, nutrient:0, spray:0, fungicide:0, beneficials:0 };
      state.difficulty = loaded.difficulty || state.difficulty || 'normal';
      state.research = loaded.research || {};
      state.reputation = loaded.reputation || 0;
      state.orders = Array.isArray(loaded.orders) ? loaded.orders : [];
      state.nextOrderIn = typeof loaded.nextOrderIn === 'number' ? loaded.nextOrderIn : 60;
      state.qualityPool = loaded.qualityPool || { grams:0, weighted:0 };
      // New fields defaults
      state.maintenance = loaded.maintenance || { filterPenaltyActive:false, filterNextDueAtDays:0 };
      if(typeof loaded.lastMonthProcessed === 'number') state.lastMonthProcessed = loaded.lastMonthProcessed; else state.lastMonthProcessed = state.lastMonthProcessed || 1;
      if(typeof loaded.nextMarketEventIn === 'number') state.nextMarketEventIn = loaded.nextMarketEventIn; else state.nextMarketEventIn = state.nextMarketEventIn || 90;
      state.marketEventName = loaded.marketEventName || '';
      if(typeof state.lastYearProcessed !== 'number' || state.lastYearProcessed < 1) state.lastYearProcessed = 1;
      if(typeof state.timeSpeed !== 'number' || !isFinite(state.timeSpeed)) state.timeSpeed = 0;
      if(typeof state.gameDaysTotal !== 'number' || !isFinite(state.gameDaysTotal)) state.gameDaysTotal = 0;
      if(typeof loaded.growTierIndex === 'number') state.growTierIndex = loaded.growTierIndex; else state.growTierIndex = state.growTierIndex || 0;
      if(typeof loaded.slotsUnlocked === 'number') state.slotsUnlocked = loaded.slotsUnlocked; else state.slotsUnlocked = Math.min(2, state.slotsUnlocked||2);
      state.customStrains = Array.isArray(loaded.customStrains) ? loaded.customStrains : [];
      state.employees = loaded.employees || {};
      state.apothekenVertraege = loaded.apothekenVertraege || {};
      ensureConsumables();
      ensureCart();
      state.plants.forEach(ensurePlantDefaults);
    }catch(err){
      console.warn('Save konnte nicht gelesen werden', err);
    }
  }

  function advancePlant(plant, delta){
    ensurePlantDefaults(plant);
    let remaining = delta;
    const growTime = growTimeFor(plant);
    while(remaining > 0){
      const step = Math.min(remaining, 1);
      const res = researchEffects();
      plant.water = clamp(plant.water - WATER_DRAIN_PER_SEC * (1 - (res.water||0)) * step, 0, WATER_MAX);
      plant.nutrients = clamp(plant.nutrients - NUTRIENT_DRAIN_PER_SEC * step, 0, NUTRIENT_MAX);

      const waterRatio = plant.water / WATER_MAX;
      const nutrientRatio = plant.nutrients / NUTRIENT_MAX;
      const goodWater = waterRatio >= 0.4 && waterRatio <= 0.85;
      const goodNutrient = nutrientRatio >= 0.4 && nutrientRatio <= 0.8;

      const d = DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
      let growthFactor = d.growth * (state.growthBonus || 1);
      let healthDelta = 0;
      let qualityDelta = 0;
      // PGR-Boost: schnelleres Wachstum, kleine Qualitaetskosten
      if(plant.pgrBoostSec && plant.pgrBoostSec > 0){
        growthFactor *= 1.25;
        qualityDelta -= 0.002 * step;
        plant.pgrBoostSec = Math.max(0, plant.pgrBoostSec - step);
      }

      if(plant.water <= 0){
        healthDelta -= HEALTH_DECAY_DRY * step;
        qualityDelta -= QUALITY_LOSS_BAD * step;
        growthFactor *= 0.05;
      }else if(waterRatio < 0.25){
        healthDelta -= (HEALTH_DECAY_DRY/2) * step;
        qualityDelta -= (QUALITY_LOSS_BAD/2) * step;
        growthFactor *= 0.35;
      }else if(waterRatio > 0.9){
        qualityDelta -= 0.02 * step;
        growthFactor *= 0.8;
      }else if(goodWater){
        qualityDelta += QUALITY_GAIN_GOOD * step;
        healthDelta += HEALTH_RECOVER_RATE * 0.3 * step;
      }

      if(plant.nutrients <= 0){
        healthDelta -= HEALTH_DECAY_HUNGRY * step;
        qualityDelta -= QUALITY_LOSS_BAD * step;
        growthFactor *= 0.25;
      }else if(nutrientRatio < 0.3){
        healthDelta -= (HEALTH_DECAY_HUNGRY/2) * step;
        qualityDelta -= (QUALITY_LOSS_BAD/2) * step;
        growthFactor *= 0.5;
      }else if(nutrientRatio > 0.9){
        qualityDelta -= 0.015 * step;
      }else if(goodNutrient){
        qualityDelta += QUALITY_GAIN_GOOD * 0.8 * step;
      }

      if(plant.health < 40) growthFactor *= 0.6;

      // Seasonal effects
      const doy = currentDayOfYear();
      if(isWinter(doy) && !((state.upgrades?.['climate']||0) > 0)){
        growthFactor *= 0.9; // Winter -10% Wachstum ohne Klima
      }

      // Pests: increase severity over time and apply penalties
      if(!plant.pest){
        maybeSpawnPestFor(plant, step, waterRatio, nutrientRatio);
      } else {
        const pestDef = pestDefById(plant.pest.id) || (PESTS[0]||{effect:{growth:0.8, health:-1, quality:-0.01}});
        const sev = plant.pest.sev || 1; // 1..3 scale
        growthFactor *= Math.max(0.2, (pestDef.effect.growth || 1));
        healthDelta += (pestDef.effect.health || 0) * (0.5 + 0.5*sev) * step;
        qualityDelta += (pestDef.effect.quality || 0) * (0.5 + 0.5*sev) * step;
        plant.pest.sev = Math.min(3, sev + 0.04 * step);
      }
      if(plant.health > 85 && goodWater && goodNutrient) growthFactor *= 1.1;

      if(plant.growProg < 1){
        plant.growProg = clamp(plant.growProg + (step / growTime) * growthFactor, 0, 1);
        if(plant.growProg >= 1) plant.readyTime = 0;
      }else{
        plant.readyTime = (plant.readyTime || 0) + step;
        if(plant.readyTime > READY_DECAY_DELAY){
          qualityDelta -= (QUALITY_LOSS_BAD/2) * step;
        }
      }

      if(goodWater && goodNutrient && plant.growProg < 1 && plant.health > 50){
        healthDelta += HEALTH_RECOVER_RATE * step;
      }

      plant.health = clamp(plant.health + healthDelta, 0, 100);
      plant.quality = clamp(plant.quality + qualityDelta, 0.4, 1.5);

      if(plant.health <= 0){
        plant.health = 0;
        plant.growProg = Math.min(plant.growProg, 0.1);
        break;
      }

      remaining -= step;
    }
  }

  function maybeSpawnPestFor(plant, dt, waterRatio, nutrientRatio){
    // base risk modified by conditions and owned items
    const d = DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
    const mods = pestRiskModifiers();
    // Phase ermitteln: Bluete nur fuer bestimmte SchÃ¤dlinge
    const inFlower = (function(){
      if(plant.growProg >= 1) return false;
      const idx = Math.min(STAGE_LABELS.length - 1, Math.floor(plant.growProg * STAGE_LABELS.length));
      return STAGE_LABELS[idx] === 'Bluete';
    })();
    for(const pest of PESTS){
      let risk = pest.base * dt * (d.pest || 1) * (PEST_GLOBAL_RATE || 1); // per second base (gedrosselt)
      // Schimmel & Spinnmilben nur in Bluetephase zulassen
      if((pest.id === 'mold' || pest.id === 'mites') && !inFlower){
        continue;
      }
      if(pest.prefers === 'dry' && waterRatio < 0.35) risk *= 3;
      if(pest.prefers === 'wet' && waterRatio > 0.85) risk *= 3.5;
      if(pest.prefers === 'wetroot') risk *= (waterRatio > 0.9 ? 6 : 0.2);
      if(pest.prefers === 'overfeed') risk *= (nutrientRatio > 0.9 ? 5 : 0.2);
      if(nutrientRatio < 0.25) risk *= 1.3;
      // Summer increases mold risk
      const doy = currentDayOfYear();
      if(isSummer(doy) && pest.id === 'mold') risk *= 1.8;
      if(mods[pest.id]) risk *= mods[pest.id];
      if(Math.random() < risk){
        plant.pest = { id: pest.id, sev: 1 };
        break;
      }
    }
    // Zusaetzliche, konditionsbasierte Spawns (falls aus obiger Schleife nichts gesetzt)
    if(!plant.pest){
      // Wurzelfaeule bei ÃœberwÃ¤sserung wahrscheinlicher
      let r1 = (EXTRA_PESTS.root_rot.base || 0.006) * dt * (PEST_GLOBAL_RATE || 1);
      r1 *= (waterRatio > 0.9 ? 6 : 0.1);
      if(Math.random() < r1){ plant.pest = { id:'root_rot', sev:1 }; return; }
      // Faule Blaetter bei ÃœberdÃ¼ngung wahrscheinlicher
      let r2 = (EXTRA_PESTS.leaf_rot.base || 0.008) * dt * (PEST_GLOBAL_RATE || 1);
      r2 *= (nutrientRatio > 0.9 ? 5 : 0.1);
      if(Math.random() < r2){ plant.pest = { id:'leaf_rot', sev:1 }; return; }
    }
  }

  function pestRiskModifiers(){
    const m = { mites:1, mold:1, thrips:1 };
    // Research effects reduce risks globally
    const eff = researchEffects();
    const general = Math.max(0, 1 - (eff.pest||0));
    m.mites *= general; m.mold *= general; m.thrips *= general;
    if(eff.pest_mold) m.mold *= Math.max(0, 1 - eff.pest_mold);
    // Room effects
    try{
      const room = currentGrowRoom();
      if(room && room.moldRisk) m.mold *= room.moldRisk;
    }catch(_e){}
    for(const it of ITEMS){
      const own = state.itemsOwned[it.id] || 0;
      if(!own || !it.effects || !it.effects.pestReduce) continue;
      for(const key of Object.keys(it.effects.pestReduce)){
        m[key] = m[key] * Math.pow(it.effects.pestReduce[key], own);
      }
    }
    return m;
  }

  function applyOfflineProgress(){
    const now = Date.now();
    const elapsed = Math.max(0, (now - state.lastTime) / 1000);
    if(elapsed < 1) return;
    const worldDt = elapsed * getTimeSpeed();
    for(const plant of state.plants){
      advancePlant(plant, worldDt);
    }
    advanceGameTime(worldDt);
  }

  const slotsEl = $('#slots');
  const unlockBtn = $('#unlockSlotBtn');
  const unlockCostEl = $('#unlockCost');
  const slotCountEl = $('#slotCount');
  const slotMaxEl = $('#slotMax');
  const gramsEls = [$('#grams'), $('#gramsBig')];
  const perSecEls = [$('#perSec'), $('#perSecBig')];
  const cashEl = $('#cash');
  const levelEl = $('#level');
  const prestigeEls = {
    points: $('#prestigePoints'),
    owned: $('#prestigeOwned'),
    gain: $('#prestigeGain'),
    bonus: $('#prestigeBonus')
  };
  const lifetimeEl = $('#lifetimeTotal');
  const bestPerSecEl = $('#bestPerSec');
  const plantCountEl = $('#plantCount');
  const playtimeEl = $('#playtime');
  const resetCountEl = $('#resetCount');
  const shopEl = $('#shop');
  const cartListEl = $('#cartList');
  const cartTotalEl = $('#cartTotal');
  const cartCheckoutBtn = $('#cartCheckout');
  const cartClearBtn = $('#cartClear');
  const rightPanelToggleBtn = $('#rightPanelToggle');
  const cartToggleBtn = $('#cartToggle');
  const cartCountEl = $('#cartCount');
  const cartModal = $('#cartModal');
  const cartCloseBtn = $('#cartClose');
  const upgListEl = $('#globalUpgrades');
  const themeToggle = $('#themeToggle');
  // Sidebar
  const sidebarEl = $('#sidebar');
  const sidebarToggle = $('#sidebarToggle');
  const toastEl = $('#toast');
  // Modal elements for seeds and confirmations
  const seedModal = document.getElementById('seedModal');
  const seedListEl = document.getElementById('seedList');
  const seedCancelBtn = document.getElementById('seedCancel');
  const seedConfirmBtn = document.getElementById('seedConfirm');
  const confirmModal = document.getElementById('confirmModal');
  const confirmTitleEl = document.getElementById('confirmTitle');
  const confirmTextEl = document.getElementById('confirmText');
  const confirmCancelBtn = document.getElementById('confirmCancel');
  const confirmOkBtn = document.getElementById('confirmOk');
  const basePriceEl = $('#basePrice');
  const saleMultEl = $('#saleMult');
  const effectivePriceEl = $('#effectivePrice');
  const sell10Btn = $('#sell10');
  const sell100Btn = $('#sell100');
  const sellMaxBtn = $('#sellMax');
  const offerListEl = $('#offerList');
  const itemShopEl = $('#itemShop');
  const inventoryEl = $('#inventoryList');
  const waterChargesEl = $('#waterCharges');
  const nutrientChargesEl = $('#nutrientCharges');
  const buyWaterBtn = $('#buyWater');
  const buyNutrientBtn = $('#buyNutrient');
  const sprayChargesEl = $('#sprayCharges');
  const fungicideChargesEl = $('#fungicideCharges');
  const beneficialChargesEl = $('#beneficialCharges');
  const buySprayBtn = $('#buySpray');
  const buyFungicideBtn = $('#buyFungicide');
  const buyBeneficialBtn = $('#buyBeneficial');
  const welcomeModal = $('#welcomeModal');
  const welcomeOk = $('#welcomeOk');
  // Settings
  const diffEasy = $('#diffEasy');
  const diffNormal = $('#diffNormal');
  const diffHard = $('#diffHard');
  const diffGrowth = $('#diffGrowth');
  const diffPest = $('#diffPest');
  // Time UI
  const gameClockEl = $('#gameClock');
  const timeIssuesEl = $('#timeIssues');
  const speedSelect = $('#speedSelect');

  // --- Quests ---
  function ensureQuestState(){
    if(typeof state.questStep !== 'number' || !isFinite(state.questStep)) state.questStep = 0;
  }
  function questConditions(){
    ensureQuestState(); ensureConsumables();
    const hasJob = !!state.jobId;
    const hasSeed = hasAnySeeds();
    const hasCan = (state.itemsOwned?.['watering_can']||0) > 0;
    const hasShears = (state.itemsOwned?.['shears']||0) > 0;
    const hasNutrient = (state.consumables?.nutrient||0) > 0;
    const hasFungicide = (state.consumables?.fungicide||0) > 0;
    const hasSpray = (state.consumables?.spray||0) > 0;
    const hasPlant = Array.isArray(state.plants) && state.plants.length > 0;
    const timeRunning = getTimeSpeed() > 0;
    return { hasJob, hasSeed, hasCan, hasShears, hasNutrient, hasFungicide, hasSpray, hasPlant, timeRunning };
  }
  function checkQuestProgress(){
    ensureQuestState();
    const c = questConditions();
    if(state.questStep === 0){
      if(c.hasJob){ state.questStep = 1; renderQuests(); save(); }
    } else if(state.questStep === 1){
      if(c.hasSeed && c.hasCan && c.hasShears && c.hasNutrient && c.hasFungicide && c.hasSpray){ state.questStep = 2; renderQuests(); save(); }
    } else if(state.questStep === 2){
      if(c.hasPlant && c.timeRunning){ state.questStep = 3; renderQuests(); save(); showAnnouncement('Starter-Quests abgeschlossen!'); }
    }
  }
  function renderQuests(){
    ensureQuestState();
    const wrap = document.getElementById('questListRight') || document.getElementById('questList');
    if(!wrap) return;
    const c = questConditions();
    wrap.innerHTML = '';
    const mkCheck = (ok) => `<span class="quest-check ${ok?'done':''}">${ok?'✓':''}</span>`;
    if(state.questStep <= 0){
      const row = document.createElement('div');
      row.className = 'quest-step';
      row.innerHTML = `<div class="label">${mkCheck(c.hasJob)} <div><div><strong>Quest 1:</strong> Finde einen Job</div><div class="quest-muted">Wechsle zum Tab Jobs und bewirb dich.</div></div></div><div class="actions"><button class="secondary" data-quest-action="goto-jobs">Zu Jobs</button></div>`;
      wrap.appendChild(row);
    } else if(state.questStep === 1){
      const row = document.createElement('div');
      row.className = 'quest-step';
      const items = [
        `${mkCheck(c.hasSeed)} Samen`,
        `${mkCheck(c.hasCan)} Giesskanne`,
        `${mkCheck(c.hasShears)} Schere`,
        `${mkCheck(c.hasNutrient)} Düngerpaket`,
        `${mkCheck(c.hasFungicide)} Fungizid`,
        `${mkCheck(c.hasSpray)} Schädlingsspray`
      ].join(' · ');
      row.innerHTML = `<div class="label">${mkCheck(c.hasSeed&&c.hasCan&&c.hasShears&&c.hasNutrient&&c.hasFungicide&&c.hasSpray)} <div><div><strong>Quest 2:</strong> Shop-Grundausstattung kaufen</div><div class="quest-muted">${items}</div></div></div><div class="actions"><button class="secondary" data-quest-action="goto-shop">Zum Shop</button></div>`;
      wrap.appendChild(row);
    } else if(state.questStep === 2){
      const row = document.createElement('div');
      row.className = 'quest-step';
      row.innerHTML = `<div class="label">${mkCheck(c.hasPlant && c.timeRunning)} <div><div><strong>Quest 3:</strong> Pflanze setzen & Zeit starten</div><div class="quest-muted">Setze einen Samen auf der Farm und starte die Zeit.</div></div></div><div class="actions"><button class="secondary" data-quest-action="goto-farm">Zur Farm</button><button class="accent" data-quest-action="start-time" ${c.timeRunning?'disabled':''}>Zeit starten</button></div>`;
      wrap.appendChild(row);
    } else {
      const row = document.createElement('div');
      row.className = 'quest-step';
      row.innerHTML = `<div class="label">${mkCheck(true)} <div><div><strong>Starter-Quests erledigt</strong></div><div class="quest-muted">Viel Erfolg mit deiner Farm!</div></div></div><div class="actions"></div>`;
      wrap.appendChild(row);
    }
  }
  function initQuests(){ ensureQuestState(); renderQuests(); }

  function currentGrowRoom(){ return GROW_ROOMS[Math.max(0, Math.min(GROW_ROOMS.length-1, state.growTierIndex||0))]; }
  function currentMaxSlots(){ const r = currentGrowRoom(); return Math.min(MAX_SLOTS, (r?.slots)||2); }
  if(slotMaxEl) slotMaxEl.textContent = currentMaxSlots();

  function showToast(message){
    if(!toastEl) return;
    toastEl.innerHTML = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1500);
  }

  // Header announcement bar
  let announceTimer = null;
  function showAnnouncement(msg, dur=4000){
    const bar = document.getElementById('announceBar');
    if(!bar) return;
    bar.innerHTML = msg;
    bar.hidden = false;
    bar.classList.add('show');
    if(announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      bar.classList.remove('show');
      setTimeout(() => { bar.hidden = true; }, 350);
    }, dur);
  }

  function renderResources(){
    const gramsMarkup = `<span class="gram-display"><img src="assets/bund.png" alt="" class="gram-icon"> ${fmt(state.grams)} g</span>`;
    gramsEls.forEach(el => { if(el) el.innerHTML = gramsMarkup; });
    const perSecText = fmt(computePerSec()) + ' g/s';
    perSecEls.forEach(el => { if(el) el.textContent = perSecText; });
    if(cashEl) cashEl.innerHTML = fmtMoney(state.cash);
    if(levelEl) levelEl.textContent = 'Lvl ' + (state.level||1);
    renderXPBar();
    prestigeEls.points.textContent = String(state.hazePoints);
    renderConsumables();
    try{ renderQuests(); }catch(_e){}
  }

  function xpForNext(level){
    level = Math.max(1, level||1);
    return Math.floor(100 * Math.pow(1.35, level-1));
  }
  function addXP(amt, why){
    amt = Math.max(0, Math.floor(amt||0));
    if(amt<=0) return;
    state.xp = (state.xp||0) + amt;
    let leveled = false;
    while(state.xp >= xpForNext(state.level||1)){
      state.xp -= xpForNext(state.level||1);
      state.level = (state.level||1) + 1;
      leveled = true;
    }
      if(leveled){ showAnnouncement('Level up! Lvl ' + state.level); }
      renderXPBar();
      save();
    }
  function renderXPBar(){
    const fill = document.getElementById('xpFill');
    if(!fill) return;
    const need = xpForNext(state.level||1);
    const have = state.xp||0;
    const pct = Math.max(0, Math.min(100, (have/need)*100));
    fill.style.width = pct.toFixed(1) + '%';
  }

  function applySidebar(){
    const collapsed = !!state.sidebarCollapsed;
    if(collapsed) document.body.classList.add('sidebar-collapsed');
    else document.body.classList.remove('sidebar-collapsed');
    if(sidebarToggle) sidebarToggle.textContent = collapsed ? '"' : '"';
    if(typeof window.__updateTabHighlight === 'function'){
      window.requestAnimationFrame(window.__updateTabHighlight);
    }
  }

  function setTimeSpeed(mult){
    // erlaubte Werte: 0, 0.5, 1, 2, 7
    const allowed = [0, 0.5, 1, 2, 7];
    let sel = parseFloat(mult);
    if(!allowed.includes(sel)) sel = 1;
    state.timeSpeed = sel;
    renderGameTime();
    try{ if(typeof window.__updateTabCentering === 'function') window.__updateTabCentering(); }catch(_e){}
    try{ checkQuestProgress(); }catch(_e){}
    save();
  }

  function advanceGameTime(dtWorld){
    const prevTotal = state.gameDaysTotal || 0;
    state.gameDaysTotal = (state.gameDaysTotal || 0) + (dtWorld / GAME_DAY_REAL_SECONDS);
    // yearly maintenance
    const prevYear = Math.floor(Math.floor(prevTotal) / DAYS_PER_YEAR) + 1;
    const newYear = Math.floor(Math.floor(state.gameDaysTotal) / DAYS_PER_YEAR) + 1;
    if(newYear > (state.lastYearProcessed || 0)){
      // process each missed year once
      for(let y = Math.max(prevYear, (state.lastYearProcessed||0)+1); y <= newYear; y++){
        const shears = state.itemsOwned?.['shears'] || 0;
        if(shears > 0){
          state.itemsOwned['shears'] = shears - 1;
          showToast('1 Jahr vergangen - Schere stumpf. Ersetze sie im Shop.');
        }else{
          showToast('1 Jahr vergangen - Schere fehlt zum Ernten.');
        }
      }
      state.lastYearProcessed = newYear;
      renderResources();
    }
    // half-year: filter replacement due logic
    if(!state.maintenance) state.maintenance = { filterPenaltyActive:false, filterNextDueAtDays:0 };
    if(!(state.maintenance.filterNextDueAtDays>0)){
      state.maintenance.filterNextDueAtDays = (state.gameDaysTotal||0) + (DAYS_PER_YEAR/2);
    }
    if(!state.maintenance.filterPenaltyActive && (state.gameDaysTotal||0) >= (state.maintenance.filterNextDueAtDays||0)){
      state.maintenance.filterPenaltyActive = true;
      state.maintenance.filterNextDueAtDays = 0; // warten bis ersetzt
      showToast('6 Monate vergangen - Aktivkohlefilter ersetzen (Qualitaet -5%).');
    }

    // monthly costs catch-up
    const y = currentYear();
    const doy = currentDayOfYear();
    const curMonth = monthFromDayOfYear(doy);
    const currentIndex = (y-1)*12 + curMonth;
    let lastIdx = state.lastMonthProcessed || 1;
    if(currentIndex > lastIdx){
      for(let idx = lastIdx+1; idx<=currentIndex; idx++){
        const cost = computeMonthlyCost();
        const empCost = computeEmployeeMonthlyCost();
        state.cash -= cost + empCost;
        if(empCost > 0) showToast(`Mitarbeiterkosten bezahlt: -${fmtMoney(empCost)}`);
        if(cost > 0) showToast(`Monatskosten bezahlt: -${fmtMoney(cost)}`);
      }
      state.lastMonthProcessed = currentIndex;
    }

    renderGameTime();
  }
  function formatGameClock(){
    const total = state.gameDaysTotal || 0;
    const dayInt = Math.floor(total);
    const frac = total - dayInt;
    const hour = Math.floor(frac * 24);
    const minute = Math.floor((frac * 24 - hour) * 60);
    const year = Math.floor(dayInt / DAYS_PER_YEAR) + 1;
    const dayOfYear = (dayInt % DAYS_PER_YEAR) + 1;
    return `Jahr ${year}, Tag ${dayOfYear} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  }

  function renderGameTime(){
    if(gameClockEl) gameClockEl.textContent = formatGameClock();
    const s = (typeof state.timeSpeed === 'number') ? state.timeSpeed : 1;
    if(speedSelect){ speedSelect.value = String(s); }
    // Issues indicator: sammeln
    if(timeIssuesEl){
      const msgs = [];
      const hasShears = (state.itemsOwned?.['shears']||0) > 0;
      if(!hasShears) msgs.push('Werkzeug fehlt: Schere');
      if(state?.maintenance?.filterPenaltyActive) msgs.push('Filter ersetzen');
      if((state.marketTimer||0) > 0 && (state.marketMult||1) !== 1){
        const secs = Math.ceil(state.marketTimer);
        msgs.push(`Event: ${state.marketEventName||'Markt'} x${(state.marketMult||1).toFixed(2)} ${secs}s`);
      }
      if((state.cash||0) < 0){ msgs.push('Konto im Minus'); }
      try{ const room = currentGrowRoom(); if(room && room.exhaust===false) msgs.push('Keine Abluft (Schimmelrisiko)'); }catch(_e){}
      if(msgs.length > 0){
        timeIssuesEl.textContent = msgs.join(' * ');
        timeIssuesEl.hidden = false;
      } else {
        timeIssuesEl.hidden = true;
      }
    }
  }

  const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
  function currentDayOfYear(){
    const total = Math.floor(state.gameDaysTotal||0);
    return (total % DAYS_PER_YEAR) + 1;
  }
  function currentYear(){
    const total = Math.floor(state.gameDaysTotal||0);
    return Math.floor(total / DAYS_PER_YEAR) + 1;
  }
  function monthFromDayOfYear(doy){
    let d = doy;
    for(let m=0;m<12;m++){
      if(d <= MONTH_DAYS[m]) return m+1;
      d -= MONTH_DAYS[m];
    }
    return 12;
  }
  function isWinter(doy){ return (doy >= 335 || doy <= 59); }
  function isSummer(doy){ return (doy >= 152 && doy <= 243); }
  function computeMonthlyCost(){
    const base = 25;
    const perPlant = 5 * (state.plants?.length || 0);
    let total = base + perPlant;
    try{
      const eff = (typeof researchEffectsV2 === 'function') ? researchEffectsV2() : (typeof researchEffects === 'function' ? researchEffects() : {});
      const mult = Math.max(0.3, 1 - (eff.cost||0));
      total = total * mult;
    }catch(_e){}
    return Math.round(total);
  }

  function computeEmployeeMonthlyCost(){
    let total = 0;
    for(const emp of EMPLOYEES){
      if(state.employees[emp.id]) total += emp.salary;
    }
    return total;
  }

  function renderStats(){
    if(lifetimeEl) lifetimeEl.textContent = fmt(state.totalEarned) + ' g';
    if(bestPerSecEl) bestPerSecEl.textContent = fmt(state.bestPerSec) + ' g/s';
    if(plantCountEl) plantCountEl.textContent = String(state.plants.length);
    if(resetCountEl) resetCountEl.textContent = String(state.resets || 0);
    const sec = Math.floor(state.playtimeSec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if(playtimeEl) playtimeEl.textContent = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function renderSlots(){
    const cap = currentMaxSlots();
    slotsEl.innerHTML = '';
    for(let i = 0; i < cap; i++){
      const plant = state.plants.find(p => p.slot === i);
      const cell = document.createElement('div');
      cell.className = plant ? 'slot slot-has-plant' : 'slot slot-empty';
      cell.dataset.slot = String(i);

      if(plant){
        ensurePlantDefaults(plant);
        const tpl = $('#tpl-plant-card');
        const card = tpl.content.firstElementChild.cloneNode(true);
        const strain = getStrain(plant.strainId);
        card.dataset.slot = String(i);
        card.querySelector('[data-icon]').textContent = strain.tag || '🌿';
        card.querySelector('[data-name]').textContent = strain.name;
        updatePlantCard(card, plant);
        card.querySelector('[data-upgrade]').addEventListener('click', () => upgradePlant(i));
        card.querySelector('[data-harvest]').addEventListener('click', () => harvestPlant(i));
        const waterBtn = card.querySelector('[data-water-btn]');
        if(waterBtn) waterBtn.addEventListener('click', () => waterPlant(i));
        const feedBtn = card.querySelector('[data-feed-btn]');
        if(feedBtn){
          feedBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" role="img"><path d="M9 3h6v2l-1 1v4.2l4.43 7.38A3 3 0 0 1 15.84 21H8.16a3 3 0 0 1-2.59-3.42L10 10.2V6L9 5V3Zm1.94 9-3.7 6.16A1 1 0 0 0 8.16 19h7.68a1 1 0 0 0 .86-1.54L13.94 12h-3Z"></path></svg>';
          feedBtn.addEventListener('click', () => feedPlant(i));
        }
        const pb = card.querySelector('[data-pest-btn]');
        if(pb) pb.addEventListener('click', () => treatPlant(i));
        cell.appendChild(card);
      }else{
        const placeholder = document.createElement('div');
        placeholder.className = 'slot-empty-card';
        placeholder.innerHTML = `
          <div class="slot-empty-icon"><i class="fi fi-rr-seedling"></i></div>
          <div class="slot-empty-content">
            <div class="slot-empty-title">Slot ${i + 1}</div>
            <p class="slot-empty-text">Setze eine neue Sorte oder oeffne den Growmarkt.</p>
            <div class="slot-empty-actions">
              <button class="accent" type="button">Pflanze setzen</button>
            </div>
          </div>`;
        placeholder.querySelector('button').addEventListener('click', () => openShopForSlot(i));
        cell.appendChild(placeholder);
      }
      slotsEl.appendChild(cell);
    }
    if(slotCountEl) slotCountEl.textContent = String(state.plants.length||0);
    if(slotMaxEl) slotMaxEl.textContent = currentMaxSlots();
    if(unlockCostEl){ unlockCostEl.textContent = '? Immobilien fuer mehr Plaetze'; }
  }

  // Jobs
  const JOBS = [
    { id:'runner', name:'Straßenrunner', salary:140, base:0.82, reqLevel:1, desc:'Verteilt Flyer und Samples in der Nachbarschaft.' },
    { id:'assistant', name:'Shop-Assistent', salary:180, base:0.78, reqLevel:1, desc:'Hilft im Headshop, kümmert sich um Kunden und Kasse.' },
    { id:'growhelper', name:'Grow-Helfer', salary:220, base:0.74, reqLevel:2, desc:'Unterstützt beim Umtopfen, Bewässern und Trimmen der Pflanzen.' },
    { id:'delivery', name:'Lieferfahrer', salary:260, base:0.7, reqLevel:2, desc:'Bringt Bestellungen schnell und diskret zu Stammkunden.' },
    { id:'barista', name:'Café Barista', salary:300, base:0.66, reqLevel:3, desc:'Bereitet infused Drinks und Snacks im Coffeeshop zu.' },
    { id:'labtech', name:'Labor-Assistent', salary:360, base:0.62, reqLevel:3, desc:'Überwacht Extrakte und dokumentiert Messwerte im Labor.' },
    { id:'consultant', name:'Grow Consultant', salary:420, base:0.58, reqLevel:4, desc:'Berät Kundschaft zu Sortenwahl, Setup und Pflege.' },
    { id:'deliverylead', name:'Lieferkoordinator', salary:480, base:0.54, reqLevel:5, desc:'Plant Touren, weist Fahrer ein und verwaltet Lagerbestände.' },
    { id:'manager', name:'Store Manager', salary:620, base:0.5, reqLevel:6, desc:'Führt das Team, organisiert Schichten und sorgt für Umsatz.' },
    { id:'operations', name:'Operations Lead', salary:780, base:0.44, reqLevel:7, desc:'Optimiert Produktion, Einkauf und Qualitätskontrolle.' },
    { id:'chemist', name:'Extrakt-Chemiker', salary:960, base:0.38, reqLevel:8, desc:'Entwickelt neue Konzentrate und stellt Reinheit sicher.' },
    { id:'marketing', name:'Marketing Director', salary:1200, base:0.32, reqLevel:9, desc:'Plant Kampagnen, Social Media und Events.' },
    { id:'finance', name:'Finanzmanager', salary:1500, base:0.26, reqLevel:10, desc:'Betreut Buchhaltung, Forecasts und Investoren.' },
    { id:'globalbuyer', name:'Internationaler Einkäufer', salary:1900, base:0.22, reqLevel:11, desc:'Sichert rare Genetik und knüpft internationale Kontakte.' },
    { id:'executive', name:'Chief Growth Officer', salary:2400, base:0.18, reqLevel:12, desc:'Setzt langfristige Expansionsstrategie und Partnerschaften um.' }
  ];

  // Erweiterter Verbrauchsmaterial-Shop (Pakete)
  const CONSUMABLE_PACKS = [
    // Duenger Gr-en
    { id:'nutrient_s', name:'Duenger S', icon:'fi fi-sr-flask', price:5, desc:'Einzeldosis NPK', add:{ nutrient:1 } },
    { id:'nutrient_m', name:'Duenger M', icon:'fi fi-sr-flask', price:12, desc:'3x NPK Dosen', add:{ nutrient:3 } },
    { id:'nutrient_l', name:'Duenger L', icon:'fi fi-sr-flask', price:22, desc:'6x NPK Dosen', add:{ nutrient:6 } },
    // Additive
    { id:'pgr_boost', name:'PGR-Booster', icon:'fi fi-sr-bolt', price:18, desc:'Wachstum +, Qualitaet leicht -', add:{ pgr:1 } },
    { id:'pk_boost', name:'PK-Boost', icon:'fi fi-sr-rocket', price:14, desc:'Bluete-Unterstuetzung', add:{ nutrient:2 } },
    { id:'micro_tea', name:'Mikroben-Tee', icon:'fi fi-sr-plant', price:10, desc:'Bodenleben foerdern', add:{ nutrient:1 } },
    { id:'micro_bio', name:'Bio-Elixier', icon:'fi fi-sr-flower-tulip', price:26, desc:'2x NPK + 1x Booster', add:{ nutrient:2, pgr:1 } },
    // Pflanzenschutz Packs
    { id:'spray_s', name:'Pflanzenspray S', icon:'fi fi-sr-bug', price:9, desc:'1x gegen Insekten', add:{ spray:1 } },
    { id:'spray_m', name:'Pflanzenspray M', icon:'fi fi-sr-bug', price:24, desc:'3x gegen Insekten', add:{ spray:3 } },
    { id:'fungi_s', name:'Fungizid S', icon:'fi fi-sr-shield-plus', price:11, desc:'1x gegen Schimmel', add:{ fungicide:1 } },
    { id:'fungi_m', name:'Fungizid M', icon:'fi fi-sr-shield-plus', price:30, desc:'3x gegen Schimmel', add:{ fungicide:3 } },
    { id:'beneficial_s', name:'Nuetzlinge S', icon:'fi fi-sr-leaf', price:14, desc:'1x biologische Abwehr', add:{ beneficials:1 } },
    { id:'beneficial_m', name:'Nuetzlinge M', icon:'fi fi-sr-leaf', price:36, desc:'3x biologische Abwehr', add:{ beneficials:3 } }
  ];

  function fireJob(){
    if(!confirm('Sind Sie sicher, dass Sie kündigen wollen?')) return;
    state.jobId = null;
    renderJobs();
    renderJobPanel();
    save();
    showToast('Job gekündigt.');
  }

  function renderJobs(){
    const wrap = document.getElementById('jobsList');
    if(!wrap) return;
    wrap.classList.add('jobs-grid');
    wrap.innerHTML = '';

    const lvl = state.level || 1;
    const applications = state.applications || [];
    const currentJob = JOBS.find(j => j.id === state.jobId) || null;

    const header = document.createElement('div');
    header.className = 'jobs-header';
    const currentLabel = currentJob ? currentJob.name : 'Keiner';
    header.innerHTML = `<h3>Aktueller Job: ${currentLabel}</h3>`;
    const meta = document.createElement('div');
    meta.className = 'jobs-meta';
    meta.innerHTML = `<span>Level ${lvl}</span>` +
      (currentJob ? `<span>Dein Monatsgehalt: ${fmtMoney(currentJob.salary)}</span>` : '') +
      `<span>Bewerbungen: ${applications.length}/2</span>`;
    header.appendChild(meta);
    if(currentJob){
      const quitBtn = document.createElement('button');
      quitBtn.className = 'ghost';
      quitBtn.type = 'button';
      quitBtn.textContent = 'Kündigen';
      quitBtn.addEventListener('click', () => fireJob());
      header.appendChild(quitBtn);
    }
    wrap.appendChild(header);

    JOBS.forEach(job => {
      const owned = state.jobId === job.id;
      const pending = applications.some(a => a.jobId === job.id);
      const eligible = lvl >= job.reqLevel;
      const chance = Math.round(job.base * Math.min(1, (lvl / Math.max(1, job.reqLevel))) * 100);

      const card = document.createElement('div');
      card.className = 'job-card';
      if(owned) card.classList.add('job-card-active');
      if(!eligible && !owned) card.classList.add('job-card-locked');

      card.innerHTML = `
        <div class="job-title">${job.name}</div>
        <div class="job-salary">${fmtMoney(job.salary)}/Monat</div>
        <div class="job-tags">
          <span>Level ${job.reqLevel}+</span>
          <span>Erfolgschance ~${chance}%</span>
        </div>
        <p class="job-desc">${job.desc || ''}</p>
        <div class="jobs-card-actions"></div>
      `;
      const actions = card.querySelector('.jobs-card-actions');
      if(owned){
        const resignBtn = document.createElement('button');
        resignBtn.className = 'ghost';
        resignBtn.type = 'button';
        resignBtn.textContent = 'Kündigen';
        resignBtn.addEventListener('click', () => fireJob());
        actions.appendChild(resignBtn);
      }else if(pending){
        const label = document.createElement('span');
        label.className = 'job-meta';
        label.textContent = 'Bewerbung läuft';
        actions.appendChild(label);
      }else{
        const applyBtn = document.createElement('button');
        applyBtn.className = 'secondary';
        applyBtn.type = 'button';
        applyBtn.textContent = eligible ? 'Bewerben' : `Gesperrt (Lvl ${job.reqLevel})`;
        applyBtn.disabled = !eligible;
        if(eligible){
          applyBtn.addEventListener('click', () => confirmApply(job.id));
        }
        actions.appendChild(applyBtn);
      }

      wrap.appendChild(card);
    });
  }

  function confirmApply(jobId){
    if(!confirm('Sind Sie sicher, dass Sie sich bewerben wollen?')) return;
    const days = state.gameDaysTotal || 0;
    const in3 = days + 3;
    state.applications = state.applications || [];
    state.applications.push({ jobId, decideAt: in3 });
    showToast('Bewerbung eingereicht. Antwort in ca. 3 Tagen.');
    save();
  }

  function processApplications(){
    const days = state.gameDaysTotal || 0;
    const pending = [];
    for(const app of (state.applications||[])){
      if(days >= app.decideAt){
        const job = JOBS.find(j=>j.id===app.jobId);
        if(!job) continue;
        const lvl = state.level || 1;
        const prob = job.base * Math.min(1, (lvl / Math.max(1, job.reqLevel)));
        const accepted = Math.random() < prob;
        if(accepted){ state.jobId = job.id; pushMessage(`Bewerbung bei ${job.name}: Angenommen!`); showAnnouncement(`Job erhalten: ${job.name}`); try{ checkQuestProgress(); }catch(_e){} }
        else { pushMessage(`Bewerbung bei ${job.name}: Leider abgelehnt.`); }
      } else {
        pending.push(app);
      }
    }
    state.applications = pending;
  }

  function monthlyIncome(){
    const job = JOBS.find(j=>j.id===state.jobId);
    return job ? job.salary : 0;
  }

  function renderInbox(){
    const wrap = document.getElementById('messagesList');
    if(!wrap) return;
    wrap.innerHTML = '';
    const list = (state.messages||[]).slice(-50).reverse();
    for(const m of list){
      const node = document.createElement('div');
      node.className = 'offer';
      node.innerHTML = m.text;
      wrap.appendChild(node);
    }
  }

  function pushMessage(text){
    const id = (state.nextMsgId||1);
    state.nextMsgId = id + 1;
    state.messages = state.messages || [];
    state.messages.push({ id, text, ts: Date.now() });
  }

  function renderShop(){
    const activeTab = document.querySelector('.shop-tab.active')?.getAttribute('data-shop-tab') || 'seeds';
    const container = document.getElementById(`shop-${activeTab}`);
    if(!container) return;
    container.innerHTML = '';
    ensureCart();

    if(activeTab === 'seeds'){
      for(const strain of STRAINS){
        const price = nextSeedPrice(strain.id);
        const priceLabel = fmtMoney(price);
        const card = document.createElement('div');
        card.className = 'shop-item';
        const duration = strain.grow || 180;
        const weeks = Math.ceil(duration / (24 * 7));
        card.innerHTML = `
          <button class="cart-add" data-cart-type="seed" data-cart-id="${strain.id}" aria-label="Zum Warenkorb hinzufügen" title="Zum Warenkorb hinzufügen">
            <i class="fi fi-rr-shopping-cart"></i>
          </button>
          <div class="shop-left">
            <div class="shop-icon">${strain.tag || '🌱'}</div>
            <div>
              <div class="shop-name">${strain.name}</div>
              <div class="shop-desc">${strain.desc}<br>Ertrag: ${Math.round(strain.yield)}g | Dauer: ${weeks} Wochen | Qualität: ${Math.round(strain.quality * 100)}%</div>
              <div class="shop-price">Preis: ${priceLabel}</div>
            </div>
          </div>
        `;
        container.appendChild(card);
      }
      return;
    }

    if(activeTab === 'tools' || activeTab === 'equipment'){
      const items = ITEMS.filter(it => it.category === activeTab);
      for(const item of items){
        const priceLabel = fmtMoney(item.cost);
        const inCart = cartCount('item', item.id);
        const owned = state.itemsOwned[item.id] || 0;
        const limitReached = !item.stack && (owned + inCart) >= 1;
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `
          <button class="cart-add" data-cart-type="item" data-cart-id="${item.id}" aria-label="Zum Warenkorb hinzufügen" title="${limitReached ? 'Bereits im Besitz' : 'Zum Warenkorb hinzufügen'}" ${limitReached ? 'disabled' : ''}>
            <i class="fi fi-rr-shopping-cart"></i>
          </button>
          <div class="shop-left">
            <div class="shop-icon"><i class="${iconForItem(item.id)}"></i></div>
            <div>
              <div class="shop-name">${item.name}</div>
              <div class="shop-desc">${item.desc}</div>
              <div class="shop-price">Preis: ${priceLabel}</div>
            </div>
          </div>
        `;
        container.appendChild(card);
      }
      return;
    }

    if(activeTab === 'consumables'){
      for(const pack of CONSUMABLE_PACKS){
        const priceLabel = fmtMoney(pack.price);
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `
          <button class="cart-add" data-cart-type="pack" data-cart-id="${pack.id}" aria-label="Zum Warenkorb hinzufügen" title="Zum Warenkorb hinzufügen">
            <i class="fi fi-rr-shopping-cart"></i>
          </button>
          <div class="shop-left">
            <div class="shop-icon"><i class="${pack.icon}"></i></div>
            <div>
              <div class="shop-name">${pack.name}</div>
              <div class="shop-desc">${pack.desc}</div>
              <div class="shop-price">Preis: ${priceLabel}</div>
            </div>
          </div>
        `;
        container.appendChild(card);
      }
      return;
    }
  }

  function ensureCart(){
    if(!Array.isArray(state.cart)) state.cart = [];
  }

  function cartCount(type, id){
    ensureCart();
    return state.cart.filter(entry => entry && entry.type === type && entry.id === id).length;
  }

  function nextSeedPrice(strainId){
    const strain = getStrain(strainId);
    if(!strain) return 0;
    return Math.round(strain.cost || 0);
  }

  function cartSummary(){
    ensureCart();
    const summaryMap = new Map();
    let total = 0;
    state.cart.forEach((entry, index) => {
      if(!entry) return;
      const { type, id } = entry;
      let price = 0;
      let name = '';
      let icon = '';
      if(type === 'seed'){
        const strain = getStrain(id);
        if(!strain) return;
        price = Math.round(strain.cost || 0);
        name = strain.name;
        icon = `<span>${strain.tag || '🌱'}</span>`;
      }else if(type === 'item'){
        const item = ITEMS.find(it => it.id === id);
        if(!item) return;
        price = item.cost || 0;
        name = item.name;
        icon = `<i class="${iconForItem(id)}"></i>`;
      }else if(type === 'pack'){
        const pack = (CONSUMABLE_PACKS||[]).find(p => p.id === id);
        if(!pack) return;
        price = pack.price || 0;
        name = pack.name;
        icon = `<i class="${pack.icon}"></i>`;
      }else{
        return;
      }
      total += price;
      const key = `${type}:${id}`;
      if(!summaryMap.has(key)){
        summaryMap.set(key, { key, type, id, name, icon, count:0, total:0, indices:[] });
      }
      const summary = summaryMap.get(key);
      summary.count += 1;
      summary.total += price;
      summary.indices.push(index);
    });
    return { total, items: Array.from(summaryMap.values()) };
  }
  function cartIsOpen(){
    return !!(cartModal && cartModal.classList.contains('show'));
  }

  function openCartModal(){
    if(cartIsOpen()) return;
    if(!cartModal) return;
    renderCart();
    if(cartToggleBtn){
      cartToggleBtn.setAttribute('aria-expanded', 'true');
      cartToggleBtn.classList.add('is-active');
    }
    cartModal.hidden = false;
    requestAnimationFrame(() => cartModal.classList.add('show'));
  }

  function closeCartModal(){
    if(!cartIsOpen()) return;
    if(!cartModal) return;
    if(cartToggleBtn){
      cartToggleBtn.setAttribute('aria-expanded', 'false');
      cartToggleBtn.classList.remove('is-active');
    }
    cartModal.classList.remove('show');
    setTimeout(() => { if(cartModal && !cartModal.classList.contains('show')) cartModal.hidden = true; }, 180);
  }


  function renderCart(){
    ensureCart();
    const count = state.cart.length;
    const labelItems = count === 1 ? '1 Artikel' : `${count} Artikel`;
    if(cartCountEl) cartCountEl.textContent = String(count);
    if(cartToggleBtn){
      cartToggleBtn.setAttribute('aria-label', `Warenkorb (${labelItems})`);
      cartToggleBtn.classList.toggle('has-items', count > 0);
    }
    const { total, items } = cartSummary();
    if(cartListEl){
      if(items.length === 0){
        cartListEl.classList.add('empty');
        cartListEl.innerHTML = '<div class="cart-empty">Warenkorb leer</div>';
      }else{
        cartListEl.classList.remove('empty');
        cartListEl.innerHTML = '';
        for(const item of items){
          const metaText = item.count > 1 ? `x${item.count}` : 'x1';
          const node = document.createElement('div');
          node.className = 'cart-item';
          node.innerHTML = `
            <div class="cart-left">
              <div class="cart-icon">${item.icon}</div>
              <div>
                <div class="cart-name">${item.name}</div>
                <div class="cart-meta">${metaText}</div>
              </div>
            </div>
            <div class="cart-right">
              <div class="cart-price">${fmtMoney(item.total)}</div>
              <button class="ghost cart-remove" data-remove-index="${item.indices[item.indices.length - 1]}" aria-label="Entfernen">
                <i class="fi fi-rr-cross-small"></i>
              </button>
            </div>
          `;
          cartListEl.appendChild(node);
        }
      }
    }
    if(cartTotalEl) cartTotalEl.innerHTML = fmtMoney(total);
    if(cartCheckoutBtn) cartCheckoutBtn.disabled = total <= 0;
    if(cartClearBtn) cartClearBtn.disabled = count === 0;
  }



  function addToCart(type, id){
    ensureCart();
    let name = '';
    if(type === 'seed'){
      const strain = getStrain(id);
      if(!strain){ showToast('Sorte nicht gefunden.'); return; }
      name = strain.name;
    }else if(type === 'item'){
      const item = ITEMS.find(it => it.id === id);
      if(!item){ showToast('Gegenstand nicht gefunden.'); return; }
      const owned = state.itemsOwned[item.id] || 0;
      const inCart = cartCount('item', item.id);
      if(!item.stack && (owned + inCart) >= 1){
        showToast('Bereits im Besitz.');
        return;
      }
      name = item.name;
    }else if(type === 'pack'){
      const pack = (CONSUMABLE_PACKS||[]).find(p => p.id === id);
      if(!pack){ showToast('Paket nicht gefunden.'); return; }
      name = pack.name;
    }else{
      return;
    }
    state.cart.push({ type, id });
    renderShop();
    renderItems();
    renderCart();
    save();
    showToast(`${name} in den Warenkorb gelegt.`);
  }

  function removeCartEntry(index){
    ensureCart();
    if(index < 0 || index >= state.cart.length) return;
    state.cart.splice(index, 1);
    renderShop();
    renderItems();
    renderCart();
    save();
  }

  function clearCart(){
    ensureCart();
    if(state.cart.length === 0) return;
    state.cart = [];
    renderShop();
    renderItems();
    renderCart();
    save();
    showToast('Warenkorb geleert.');
  }

  function checkoutCart(){
    ensureCart();
    if(state.cart.length === 0){ showToast('Warenkorb ist leer.'); return; }
    const { total } = cartSummary();
    if(total <= 0){ showToast('Keine Artikel im Warenkorb.'); return; }
    if(state.cash < total){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= total;
    const entries = [...state.cart];
    for(const entry of entries){
      if(!entry) continue;
      if(entry.type === 'seed'){
        const strain = getStrain(entry.id);
        if(!strain) continue;
        state.purchasedCount[entry.id] = (state.purchasedCount[entry.id] || 0) + 1;
        state.seeds[entry.id] = (state.seeds[entry.id] || 0) + 1;
      }else if(entry.type === 'item'){
        const item = ITEMS.find(it => it.id === entry.id);
        if(!item) continue;
        state.itemsOwned[entry.id] = (state.itemsOwned[entry.id] || 0) + 1;
        if(entry.id === 'filter'){
          if(!state.maintenance) state.maintenance = { filterPenaltyActive:false, filterNextDueAtDays:0 };
          state.maintenance.filterPenaltyActive = false;
          state.maintenance.filterNextDueAtDays = (state.gameDaysTotal||0) + (DAYS_PER_YEAR/2);
        }
      }else if(entry.type === 'pack'){
        const pack = (CONSUMABLE_PACKS||[]).find(p => p.id === entry.id);
        if(!pack) continue;
        ensureConsumables();
        const add = pack.add || {};
        for(const key of Object.keys(add)){
          state.consumables[key] = (state.consumables[key] || 0) + (add[key] || 0);
        }
      }
    }
    state.cart = [];
    renderResources();
    renderTrade();
    renderInventory();
    renderConsumables();
    renderItems();
    renderShop();
    renderCart();
    try{ checkQuestProgress(); }catch(_e){}
    save();
    showToast(`Einkauf abgeschlossen: ${fmtMoney(total)}`);
  }

  function renderUpgrades(){
    if(!upgListEl) return;
    upgListEl.innerHTML = '';
    for(const up of GLOBAL_UPGRADES){
      const lvl = state.upgrades[up.id] || 0;
      const cost = Math.round(up.baseCost * Math.pow(1.6, lvl));
      const node = document.createElement('div');
      node.className = 'upgrade';
      node.innerHTML = `
        <div class="upgrade-body">
          <div class="upgrade-title">${up.name}</div>
          <div class="upgrade-meta">Stufe ${lvl} · Bonus +${Math.round(up.inc*100)}%</div>
          <div class="upgrade-desc">${up.desc}</div>
          <div class="upgrade-status">Kosten: ${fmtMoney(cost)}</div>
          <button class="upgrade-btn buy" data-upg="${up.id}">Kaufen</button>
        </div>
      `;
      const btn = node.querySelector('button');
      btn.disabled = state.cash < cost;
      node.querySelector('button').addEventListener('click', () => buyUpgrade(up.id));
      upgListEl.appendChild(node);
    }
    const nextHaze = calcPrestigeGain(state.totalEarned);
    if (prestigeEls.owned) prestigeEls.owned.textContent = String(state.hazePoints);
    if (prestigeEls.gain) prestigeEls.gain.textContent = String(nextHaze);
    if (prestigeEls.bonus) prestigeEls.bonus.textContent = 'x' + (1 + 0.05 * Math.sqrt(state.hazePoints || 0)).toFixed(2);
  }

  // Immobilien (Grow-Raeume)
  function renderEstate(){
    const wrap = document.getElementById('estateList');
    if(!wrap) return;
    wrap.innerHTML = '';
    const curIdx = state.growTierIndex || 0;
    GROW_ROOMS.forEach((r, idx) => {
      const owned = idx <= curIdx;
      const canSell = owned && idx > 0;
      const node = document.createElement('div');
      node.className = 'estate-card';
      node.innerHTML = `
        <div class="estate-body">
          <div class="estate-title">${r.name}</div>
          <div class="estate-meta">Kapazität: ${r.slots} Slots ${!r.exhaust ? ' · keine Abluft' : ''}</div>
          <div class="estate-desc">${r.desc}</div>
          <div class="estate-status">${owned ? 'Besitzt' : 'Kosten: '+fmtMoney(r.cost)}</div>
          <button class="estate-btn ${canSell ? 'sell' : owned ? 'active' : 'buy'}" data-estate="${r.id}" ${owned && !canSell ? 'disabled' : ''}>${canSell ? 'Verkaufen (60% zurück)' : owned ? 'Aktiv' : 'Kaufen'}</button>
        </div>
      `;
      const btn = node.querySelector('button');
      if(canSell){
        btn.addEventListener('click', () => sellEstate(r.id));
      } else if(!owned){
        btn.disabled = state.cash < r.cost;
        btn.addEventListener('click', () => buyEstate(r.id));
      }
      wrap.appendChild(node);
    });
  }

  function buyEstate(id){
    const idx = GROW_ROOMS.findIndex(x=>x.id===id);
    if(idx === -1) return;
    const r = GROW_ROOMS[idx];
    if((state.growTierIndex||0) >= idx) return;
    if(state.cash < r.cost){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= r.cost;
    state.growTierIndex = idx;
    // sync slots to new capacity if lower than existing unlocked
    state.slotsUnlocked = Math.min(state.slotsUnlocked || 0, r.slots);
    renderResources();
    renderSlots();
    renderEstate();
    save();
  }

  function sellEstate(id){
    const idx = GROW_ROOMS.findIndex(x=>x.id===id);
    if(idx === -1 || state.growTierIndex !== idx || idx === 0) return; // can't sell closet
    const r = GROW_ROOMS[idx];
    const refund = Math.round(r.cost * 0.6);
    showConfirm(`Verkaufen?`, `Sind Sie sicher, dass Sie ${r.name} verkaufen wollen? Sie erhalten ${fmtMoney(refund)} zurück.`, 'Verkaufen', 'danger', () => {
      state.cash += refund;
      state.growTierIndex = Math.max(0, idx - 1);
      state.slotsUnlocked = Math.min(state.slotsUnlocked, currentMaxSlots());
      renderResources();
      renderSlots();
      renderEstate();
      save();
      showToast(`${r.name} verkauft für ${fmtMoney(refund)}.`);
    });
  }

  // Research UI under its own tab or can be reused elsewhere




  function renderTrade(){
    const base = BASE_PRICE_PER_G * (state.marketMult || 1);
    const mult = itemPriceMultiplier();
    if(basePriceEl) basePriceEl.innerHTML = `${fmtMoney(base)}/g`;
    if(saleMultEl) saleMultEl.textContent = 'x' + mult.toFixed(2);
    // Quality factor
    const avgQ = (state.qualityPool.grams||0) > 0 ? (state.qualityPool.weighted/state.qualityPool.grams) : 1;
    const qMult = saleQualityMultiplier(avgQ);
    const eff = base * mult * qMult;
    const qEl = (typeof document !== 'undefined') ? document.getElementById('qualityMult') : null;
    if(qEl) qEl.textContent = 'x' + qMult.toFixed(2);
    if(effectivePriceEl) effectivePriceEl.innerHTML = `${fmtMoney(eff)}/g`;
    if(sell10Btn) sell10Btn.disabled = state.grams < 10;
    if(sell100Btn) sell100Btn.disabled = state.grams < 100;
    if(sellMaxBtn) sellMaxBtn.disabled = state.grams < 1;
    renderOffers();
    renderOrders();
    renderApotheken();
    renderItems();
    renderInventory();
    renderConsumables();
  }

  function spawnMarketEvent(){
    // 50/50 negative inspection vs positive hype
    const roll = Math.random();
    if(roll < 0.5){
      // Inspection: lower prices briefly
      state.marketEventName = 'Inspektion';
      state.marketMult = 0.7;
      state.marketTimer = 20 + Math.random()*15; // 20-35s
      showToast('Inspektion! Verkaufspreise vorÃ¼bergehend reduziert.');
    }else{
      state.marketEventName = 'Hype';
      state.marketMult = 1.25;
      state.marketTimer = 25 + Math.random()*20; // 25-45s
      showToast('Hype! Verkaufspreise vorÃ¼bergehend erhÃ¶ht.');
    }
    state.nextMarketEventIn = 90 + Math.random()*120; // next event 1.5-3.5 min
    renderTrade();
  }

  function spawnRandomEvent(){
    const events = [
      { type:'pest_plague', name:'Pest-Plage', desc:'Schädlinge sind aggressiver!', duration:60, effect:() => { state.pestGlobalRate = PEST_GLOBAL_RATE * 2; } },
      { type:'harvest_blessing', name:'Ernte-Segen', desc:'Alle Erträge verdoppelt!', duration:30, effect:() => { state.harvestBonus = 2; } },
      { type:'growth_boost', name:'Wachstums-Boost', desc:'Pflanzen wachsen schneller!', duration:45, effect:() => { state.growthBonus = 1.5; } },
      { type:'cash_rain', name:'Geldregen', desc:'Zufällige Bargeld-Belohnungen!', duration:20, effect:() => { state.cashRain = true; } }
    ];
    const ev = events[Math.floor(Math.random()*events.length)];
    state.activeEvents.push({ ...ev, duration: ev.duration });
    ev.effect();
    showAnnouncement(`${ev.name}: ${ev.desc}`, 5000);
  }

  // Quality-based pricing tiers
  function saleQualityMultiplier(avgQ){
    if(!isFinite(avgQ) || avgQ<=0) return 1;
    if(avgQ >= 1.35) return 1.6;
    if(avgQ >= 1.15) return 1.25;
    return 1.0;
  }

  function renderOffers(){
    if(!offerListEl) return;
    offerListEl.innerHTML = '';
    const now = Date.now();
    state.offers = state.offers.filter(o => o.expiresAt > now);
    for(const offer of state.offers){
      const total = offer.grams * offer.pricePerG;
      const node = document.createElement('div');
      node.className = 'offer';
      node.innerHTML = `
        <div class="offer-left">
          <div class="offer-qty">${offer.grams} g</div>
          <div>
            <div>Preis: <strong>${fmtMoney(offer.pricePerG)}</strong> Â· Gesamt: <strong>${fmtMoney(total)}</strong></div>
            <div class="offer-meta">Anfrage #${offer.id}</div>
          </div>
        </div>
        <div class="offer-right">
          <div class="offer-timer" data-offer="${offer.id}">--s</div>
          <button class="accent" data-accept="${offer.id}">Verkaufen</button>
        </div>
      `;
      node.querySelector('[data-accept]').addEventListener('click', () => acceptOffer(offer.id));
      offerListEl.appendChild(node);
    }
  }

  function renderApotheken(){
    const apothekenListEl = document.getElementById('apothekenList');
    if(!apothekenListEl) return;
    apothekenListEl.innerHTML = '';
    if(state.level < 4){
      apothekenListEl.innerHTML = '<div class="placeholder">Dieses Feature wird mit Level 4 freigeschaltet.</div>';
      return;
    }
    if(!Array.isArray(state.apothekenOffers)) state.apothekenOffers = [];
    const now = Date.now();
    state.apothekenOffers = state.apothekenOffers.filter(o => o.expiresAt > now);
    for(const offer of state.apothekenOffers){
      const total = offer.grams * offer.pricePerG;
      const node = document.createElement('div');
      node.className = 'offer';
      node.innerHTML = `
        <div class="offer-left">
          <div class="offer-qty">${offer.grams} g</div>
          <div>
            <div>Preis: <strong>${fmtMoney(offer.pricePerG)}</strong> Â· Gesamt: <strong>${fmtMoney(total)}</strong></div>
            <div class="offer-meta">Apotheke #${offer.id}</div>
          </div>
        </div>
        <div class="offer-right">
          <div class="offer-timer" data-apotheke="${offer.id}">--s</div>
          <button class="accent" data-deliver="${offer.id}">Liefern</button>
        </div>
      `;
      node.querySelector('[data-deliver]').addEventListener('click', () => deliverApotheke(offer.id));
      apothekenListEl.appendChild(node);
    }
  }

  function renderItems(){
    if(!itemShopEl) return;
    itemShopEl.innerHTML = '';

    const addHeader = (title) => {
      const header = document.createElement('div');
      header.className = 'hint';
      header.textContent = title;
      try{ header.style.gridColumn = '1 / -1'; }catch(_e){}
      itemShopEl.appendChild(header);
      try{ const hr = document.createElement('hr'); hr.className = 'sep'; hr.style.cssText = 'border:0;border-top:1px solid #444;opacity:.5;margin:6px 0'; hr.style.gridColumn = '1 / -1'; itemShopEl.appendChild(hr); }catch(_e){}
    };

    const addItemCard = (it) => {
      const node = document.createElement('div');
      node.className = 'shop-item';
      const iconClass = iconForItem(it.id);
      const inCart = cartCount('item', it.id);
      const owned = state.itemsOwned[it.id] || 0;
      const limitReached = !it.stack && (owned + inCart) >= 1;
      node.innerHTML = `
        <button class="cart-add" data-cart-type="item" data-cart-id="${it.id}" aria-label="Zum Warenkorb hinzufügen" title="${limitReached ? 'Bereits im Besitz' : 'Zum Warenkorb hinzufügen'}" ${limitReached ? 'disabled' : ''}>
          <i class="fi fi-rr-shopping-cart"></i>
        </button>
        <div class="shop-left">
          <div class="shop-icon"><i class="${iconClass}"></i></div>
          <div>
            <div class="shop-name">${it.name}</div>
            <div class="shop-desc">${it.desc}</div>
            <div class="shop-price">Preis: ${fmtMoney(it.cost)}</div>
          </div>
        </div>
      `;
      itemShopEl.appendChild(node);
    };

    const addPackCard = (p) => {
      const node = document.createElement('div');
      node.className = 'shop-item';
      node.innerHTML = `
        <button class="cart-add" data-cart-type="pack" data-cart-id="${p.id}" aria-label="Zum Warenkorb hinzufügen" title="Zum Warenkorb hinzufügen">
          <i class="fi fi-rr-shopping-cart"></i>
        </button>
        <div class="shop-left">
          <div class="shop-icon"><i class="${p.icon}"></i></div>
          <div>
            <div class="shop-name">${p.name}</div>
            <div class="shop-desc">${p.desc}</div>
            <div class="shop-price">Preis: ${fmtMoney(p.price)}</div>
          </div>
        </div>
      `;
      itemShopEl.appendChild(node);
    };

    // 1) Werkzeuge
    const tools = ITEMS.filter(it => (it.category||'') === 'tools');
    if(tools.length){ addHeader('Werkzeuge'); tools.forEach(addItemCard); }

    // 2) Duenger & Additive (aus CONSUMABLE_PACKS)
    const packs = (typeof CONSUMABLE_PACKS !== 'undefined') ? CONSUMABLE_PACKS : [];
    const fertAdd = packs.filter(p => /^(nutrient_|pgr_|pk_|micro_)/.test(p.id));
    if(fertAdd.length){ addHeader('Duenger & Additive'); fertAdd.forEach(addPackCard); }

    // 3) Pflanzenschutz (erst Items-Kategorie, dann Pack-Varianten)
    const pestItems = ITEMS.filter(it => (it.category||'') === 'pest');
    const pestPacks = packs.filter(p => /^(spray_|fungi_|beneficial_)/.test(p.id));
    if(pestItems.length || pestPacks.length){
      addHeader('Pflanzenschutz');
      pestItems.forEach(addItemCard);
      pestPacks.forEach(addPackCard);
    }

    // 4) Ausstattung
    const equip = ITEMS.filter(it => (it.category||'') === 'equipment');
    if(equip.length){ addHeader('Ausstattung'); equip.forEach(addItemCard); }
  }

  function iconForItem(id){
    switch(id){
      case 'shears': return 'fi fi-sr-scissors';
      case 'watering_can': return 'fi fi-sr-raindrops';
      case 'nutrients': return 'fi fi-sr-flask';
      case 'scale': return 'fi fi-sr-scale';
      case 'jars': return 'fi fi-sr-jar';
      case 'van': return 'fi fi-sr-truck-side';
      case 'trimmer': return 'fi fi-sr-fan';
      case 'filter': return 'fi fi-sr-air-freshener';
      case 'fan': return 'fi fi-sr-fan';
      case 'dehumidifier': return 'fi fi-sr-wind';
      case 'sticky_traps': return 'fi fi-sr-bug';
      case 'humidifier': return 'fi fi-sr-raindrops';
      case 'irrigation': return 'fi fi-sr-water-hose';
      case 'ph_meter': return 'fi fi-sr-flask';
      case 'thermometer': return 'fi fi-sr-thermometer';
      case 'soundscape': return 'fi fi-sr-music';
      case 'aero_drone': return 'fi fi-sr-robot';
      case 'brand_wall': return 'fi fi-sr-gallery';
      default: return 'fi fi-rr-box-open';
    }
  }

  function renderConsumables(){
    ensureConsumables();
    // Wasserkanister wurden entfernt - Elemente ausblenden
    try{ if(buyWaterBtn) buyWaterBtn.style.display = 'none'; }catch(_e){}
    try{ if(waterChargesEl) waterChargesEl.style.display = 'none'; }catch(_e){}
    if(waterChargesEl) waterChargesEl.textContent = String(state.consumables.water || 0);
    if(nutrientChargesEl) nutrientChargesEl.textContent = String(state.consumables.nutrient || 0);
    if(sprayChargesEl) sprayChargesEl.textContent = String(state.consumables.spray || 0);
    if(fungicideChargesEl) fungicideChargesEl.textContent = String(state.consumables.fungicide || 0);
    if(beneficialChargesEl) beneficialChargesEl.textContent = String(state.consumables.beneficials || 0);
    if(buyWaterBtn){
      buyWaterBtn.disabled = state.cash < WATER_CONSUMABLE_PRICE;
    if(buyWaterBtn){ buyWaterBtn.disabled = state.cash < WATER_CONSUMABLE_PRICE; buyWaterBtn.innerHTML = `Kaufen (${fmtMoney(WATER_CONSUMABLE_PRICE)})`; }
    }
    if(buyNutrientBtn){
      buyNutrientBtn.disabled = state.cash < NUTRIENT_CONSUMABLE_PRICE;
    if(buyNutrientBtn){ buyNutrientBtn.disabled = state.cash < NUTRIENT_CONSUMABLE_PRICE; buyNutrientBtn.innerHTML = `Kaufen (${fmtMoney(NUTRIENT_CONSUMABLE_PRICE)})`; }
    }
    if(buySprayBtn){ buySprayBtn.disabled = state.cash < 9; buySprayBtn.innerHTML = `Kaufen (${fmtMoney(9)})`; }
    if(buyFungicideBtn){ buyFungicideBtn.disabled = state.cash < 11; buyFungicideBtn.innerHTML = `Kaufen (${fmtMoney(11)})`; }
    if(buyBeneficialBtn){ buyBeneficialBtn.disabled = state.cash < 14; buyBeneficialBtn.innerHTML = `Kaufen (${fmtMoney(14)})`; }
  }

  function buyConsumable(type){
    ensureConsumables();
    let price = 0;
    if(type === 'water') price = WATER_CONSUMABLE_PRICE;
    else if(type === 'nutrient') price = NUTRIENT_CONSUMABLE_PRICE;
    else if(type === 'spray') price = 9;
    else if(type === 'fungicide') price = 11;
    else if(type === 'beneficial') price = 14;
    if(state.cash < price){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= price;
    if(type === 'water') state.consumables.water += 1;
    else if(type === 'nutrient') state.consumables.nutrient += 1;
    else if(type === 'spray') state.consumables.spray += 1;
    else if(type === 'fungicide') state.consumables.fungicide += 1;
    else if(type === 'beneficial') state.consumables.beneficials += 1;
    renderResources();
    updateProgressBars();
    save();
  }

  function buyConsumablePack(id){
    const pack = (CONSUMABLE_PACKS||[]).find(p=>p.id===id);
    if(!pack) return;
    if((state.cash||0) < pack.price){ showToast('Nicht genug Bargeld.'); return; }
    ensureConsumables();
    state.cash -= pack.price;
    const add = pack.add || {};
    for(const k of Object.keys(add)){
      state.consumables[k] = (state.consumables[k]||0) + (add[k]||0);
    }
    renderResources();
    try{ renderItems(); }catch(_e){}
    try{ renderConsumables(); }catch(_e){}
    save();
    showToast(`${pack.name} gekauft.`);
  }

  function renderInventory(){
    if(!inventoryEl) return;
    inventoryEl.innerHTML = '';

    const ownedItems = ITEMS.filter(it => (state.itemsOwned[it.id] || 0) > 0);
    if(ownedItems.length){
      ownedItems.forEach(it => {
        const qty = state.itemsOwned[it.id] || 0;
        const sellPrice = Math.round(it.cost * 0.7);
        const node = document.createElement('div');
        node.className = 'inventory-item';
        node.innerHTML = `
          <div class="inventory-icon"><i class="${iconForItem(it.id)}"></i></div>
          <div class="inventory-main">
            <div class="job-title">${it.name} ${qty>1 ? '×'+qty : ''}</div>
            <p class="inventory-meta">${it.desc}</p>
          </div>
          <div class="inventory-actions">
            <span class="inventory-qty">Verkauf: ${fmtMoney(sellPrice)}</span>
            <button class="ghost" data-sell-item="${it.id}">Verkaufen</button>
          </div>`;
        node.querySelector('button').addEventListener('click', () => sellItem(it.id));
        inventoryEl.appendChild(node);
      });
    }

    ensureConsumables();
    const cons = state.consumables || {};
    const consumableEntries = [
      { key:'nutrient', label:'Nährstoffe', icon: 'fi fi-sr-flask' },
      { key:'pgr', label:'PGR Booster', icon: 'fi fi-sr-bolt' },
      { key:'spray', label:'Schädlingsspray', icon: 'fi fi-sr-bug' },
      { key:'fungicide', label:'Fungizid', icon: 'fi fi-sr-shield-plus' },
      { key:'beneficials', label:'Nützlinge', icon: 'fi fi-sr-leaf' }
    ];
    const availableConsumables = consumableEntries.filter(entry => (cons[entry.key]||0) > 0);
    if(availableConsumables.length){
      availableConsumables.forEach(entry => {
        const node = document.createElement('div');
        node.className = 'inventory-item';
        node.innerHTML = `
          <div class="inventory-icon"><i class="${entry.icon}"></i></div>
          <div class="inventory-main">
            <div class="job-title">${entry.label}</div>
            <p class="inventory-meta">Lagerbestand für Automatisierung und Boosts.</p>
          </div>
          <div class="inventory-actions">
            <span class="inventory-qty">${cons[entry.key]} Einheiten</span>
          </div>`;
        inventoryEl.appendChild(node);
      });
    }

    if(!ownedItems.length && availableConsumables.length === 0){
      const empty = document.createElement('div');
      empty.className = 'inventory-item';
      empty.innerHTML = '<p class="inventory-meta">Noch keine Gegenstände im Inventar.</p>';
      inventoryEl.appendChild(empty);
    }
  }

  function totalSeeds(){
    let sum = 0; const s = state.seeds||{}; for(const k in s){ sum += s[k]||0; } return sum;
  }
  function pickSeedId(){
    const s = state.seeds||{}; let best=null; let max=0; for(const k in s){ if((s[k]||0) > max){ max=s[k]; best=k; } }
    return best;
  }
  function openShopForSlot(slotIndex){
  if(hasAnySeeds()){
    showSeedSelection(slotIndex);
    return;
  }
  showToast("Keine Samen. Ã–ffne Growmarkt -");
  try{ document.querySelector('.tab-btn[data-tab="trade"]').click(); }catch(_e){}
  renderShop(slotIndex);
}/*
    showToast('Keine Samen. oeffne Growmarkt ...');
    try{ document.querySelector('.tab-btn[data-tab="trade"]').click(); }catch(_e){}
    renderShop(slotIndex);
  }*/

  function buyPlant(strainId){
    const cost = strainPurchaseCost(strainId);
    if(state.cash < cost){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= cost;
    state.purchasedCount[strainId] = (state.purchasedCount[strainId] || 0) + 1;
    state.seeds[strainId] = (state.seeds[strainId] || 0) + 1;
    renderResources();
    renderShop();
    save();
  }

  function removePlant(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if (plant) {
      const strainId = plant.strainId;
      state.seeds[strainId] = (state.seeds[strainId] || 0) + 1;
      showToast(`Samen von ${getStrain(strainId).name} zurueck ins Inventar gelegt.`);
    }
    state.plants = state.plants.filter(p => p.slot !== slotIndex);
    renderSlots();
    save();
  }

  function upgradePlant(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant) return;
    const cost = plantUpgradeCost(plant);
    if(state.grams < cost){ showToast('Nicht genug Ertrag.'); return; }
    state.grams -= cost;
    plant.level += 1;
    renderResources();
    updateProgressBars();
    save();
  }

  function harvestPlant(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant) return;
    if(plant.growProg < 1){ showToast('Noch nicht reif.'); return; }
    if((state.itemsOwned['shears'] || 0) <= 0){ showToast('Schere erforderlich.'); return; }
    const gain = harvestYieldFor(plant) * qualityMultiplier(plant);
    state.grams += gain;
    state.totalEarned += gain;
    // quality pool update
    const q = qualityMultiplier(plant);
    state.qualityPool.grams = (state.qualityPool.grams||0) + gain;
    state.qualityPool.weighted = (state.qualityPool.weighted||0) + gain * q;
    // Smooth ausploppen und danach Slot freigeben
    const card = document.querySelector(`#slots .plant-card[data-slot="${slotIndex}"]`);
    const finalize = () => {
      // Pflanze entfernen und Slot neu rendern
      state.plants = state.plants.filter(p => p.slot !== slotIndex);
      renderResources();
      renderSlots();
      save();
    };
    try{ spawnFloat(slotIndex, `+${fmt(gain)} g`); }catch(_e){}
    try{ spawnBurst(slotIndex, '??', 7); }catch(_e){}
    if(card){
      card.classList.add('pop-out');
      const onEnd = () => { card.removeEventListener('animationend', onEnd); finalize(); };
      card.addEventListener('animationend', onEnd);
    } else {
      finalize();
    }
  }

  function waterPlant(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant) return;
    ensureConsumables();
    if(state.consumables.water <= 0){ showToast('Kein Wasserkanister verfÃ¼gbar.'); return; }
    state.consumables.water -= 1;
    plant.water = Math.min(WATER_MAX, plant.water + WATER_ADD_AMOUNT);
    updateProgressBars();
    spawnBurst(slotIndex, '??', 4);
    renderConsumables();
    save();
  }

  function feedPlant(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant) return;
    ensureConsumables();
    if(state.consumables.nutrient <= 0){ showToast('Kein DÃ¼ngerpaket verfÃ¼gbar.'); return; }
    state.consumables.nutrient -= 1;
    plant.nutrients = Math.min(NUTRIENT_MAX, plant.nutrients + NUTRIENT_ADD_AMOUNT);
    plant.quality = clamp(plant.quality + 0.04, 0.4, 1.5);
    updateProgressBars();
    spawnBurst(slotIndex, '??', 4);
    renderConsumables();
    save();
  }

  function treatPlant(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant || !plant.pest){ showToast('Keine SchÃ¤dlinge vorhanden.'); return; }
    ensureConsumables();
    const type = plant.pest.id;
    if(type === 'mold' || type === 'root_rot' || type === 'leaf_rot'){
      if(state.consumables.fungicide > 0){
        state.consumables.fungicide -= 1;
        plant.pest = null;
        spawnBurst(slotIndex, '???', 6);
      } else { showToast('Fungizid benÃ¶tigt.'); return; }
    } else if(type === 'mites' || type === 'thrips'){
      if(state.consumables.spray > 0){
        state.consumables.spray -= 1;
        plant.pest = null;
        spawnBurst(slotIndex, '???', 6);
      } else if(state.consumables.beneficials > 0){
        state.consumables.beneficials -= 1;
        plant.pest = null;
        spawnBurst(slotIndex, '??', 6);
      } else { showToast('Keine Abwehr vorhanden.'); return; }
    }
    updateProgressBars();
    renderConsumables();
    save();
  }

  function firstEmptySlot(){
    const used = new Set(state.plants.map(p => p.slot));
    for(let i = 0; i < state.slotsUnlocked; i++){
      if(!used.has(i)) return i;
    }
    return null;
  }

  function unlockSlot(){
    const cap = currentMaxSlots();
    if(state.slotsUnlocked >= cap){ showToast('Maximale Slots fuer aktuellen Raum erreicht. Immobilien upgraden.'); return; }
    const cost = slotUnlockCost(state.slotsUnlocked);
    if(state.grams < cost){ showToast('Nicht genug Ertrag.'); return; }
    state.grams -= cost;
    state.slotsUnlocked += 1;
    renderSlots();
    renderResources();
    save();
  }

  function buyUpgrade(id){
    const def = GLOBAL_UPGRADES.find(u => u.id === id);
    if(!def) return;
    const lvl = state.upgrades[id] || 0;
    const cost = Math.round(def.baseCost * Math.pow(1.6, lvl));
    if(state.cash < cost){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= cost;
    state.upgrades[id] = lvl + 1;
    renderUpgrades();
    renderResources();
    save();
  }

  function quickSell(amount){
    amount = Math.floor(amount);
    if(amount <= 0) return;
    if(state.grams < amount){ showToast('Nicht genug Ertrag.'); return; }
    const base = BASE_PRICE_PER_G * (state.marketMult || 1);
    const itemMult = itemPriceMultiplier();
    const avgQ = (state.qualityPool.grams||0) > 0 ? (state.qualityPool.weighted/state.qualityPool.grams) : 1;
    const qMult = saleQualityMultiplier(avgQ);
    const price = base * itemMult * qMult;
    const cashGain = amount * price;
    state.grams -= amount;
    // reduce quality pool proportionally
    const usedWeighted = Math.min(state.qualityPool.weighted||0, avgQ * amount);
    state.qualityPool.grams = Math.max(0, (state.qualityPool.grams||0) - amount);
    state.qualityPool.weighted = Math.max(0, (state.qualityPool.weighted||0) - usedWeighted);
    state.cash += cashGain;
    state.totalCashEarned += cashGain;
    state.tradesDone += 1;
    renderResources();
    renderTrade();
    save();
    addXP(Math.max(1, Math.floor(amount/100)), "Verkauf");
    showToast(`Verkauft: ${amount} g fuer ${fmtMoney(cashGain)}`);
  }

  function canBuyItem(it){
    if(!it.stack && (state.itemsOwned[it.id] || 0) >= 1) return false;
    return state.cash >= it.cost;
  }

  function buyItem(id){
    const it = ITEMS.find(item => item.id === id);
    if(!it) return;
    if(!canBuyItem(it)){ showToast('Nicht genug Bargeld oder bereits vorhanden.'); return; }
    state.cash -= it.cost;
    state.itemsOwned[id] = (state.itemsOwned[id] || 0) + 1;
    // Maintenance: replacing carbon filter clears penalty and schedules next due
    if(id === 'filter'){
      if(!state.maintenance) state.maintenance = { filterPenaltyActive:false, filterNextDueAtDays:0 };
      state.maintenance.filterPenaltyActive = false;
      state.maintenance.filterNextDueAtDays = (state.gameDaysTotal||0) + (DAYS_PER_YEAR/2);
      showToast('Aktivkohlefilter ersetzt. Qualitaetsmalus entfernt.');
    }
    renderResources();
    renderTrade();
    save();
  }

  function sellItem(id){
    const it = ITEMS.find(item => item.id === id);
    if(!it) return;
    const owned = state.itemsOwned[id] || 0;
    if(owned <= 0) return;
    state.itemsOwned[id] = owned - 1;
    const price = Math.round(it.cost * 0.7);
    state.cash += price;
    renderResources();
    renderTrade();
    save();
  }

  function spawnOffer(){
    const scale = Math.max(1, Math.sqrt(Math.max(1, state.totalEarned)) / 20);
    const grams = clamp(Math.floor(40 * scale + Math.random() * (400 * scale)), 20, 1000000);
    const priceMult = 1.1 + Math.random() * 0.9;
    const pricePerG = parseFloat((BASE_PRICE_PER_G * priceMult).toFixed(2));
    const ttl = 60 + Math.floor(Math.random() * 120);
    const id = Math.floor(Math.random() * 1e6);
    state.offers.push({ id, grams, pricePerG, expiresAt: Date.now() + ttl * 1000 });
  }

  function spawnApothekenOffer(){
    if(state.level < 4) return;
    if(!Array.isArray(state.apothekenOffers)) state.apothekenOffers = [];
    const scale = Math.max(1, Math.sqrt(Math.max(1, state.totalEarned)) / 20);
    const grams = clamp(Math.floor(50 * scale + Math.random() * (300 * scale)), 30, 500000);
    const priceMult = 1.2 + Math.random() * 1.0; // höherer Preis für Apotheken
    const pricePerG = parseFloat((BASE_PRICE_PER_G * priceMult).toFixed(2));
    const ttl = 90 + Math.floor(Math.random() * 180);
    const id = Math.floor(Math.random() * 1e6);
    state.apothekenOffers.push({ id, grams, pricePerG, expiresAt: Date.now() + ttl * 1000 });
  }

  function acceptOffer(id){
    const idx = state.offers.findIndex(o => o.id === id);
    if(idx === -1) return;
    const offer = state.offers[idx];
    if(offer.expiresAt <= Date.now()){
      state.offers.splice(idx, 1);
      renderTrade();
      return;
    }
    if(state.grams < offer.grams){ showToast('Nicht genug Ertrag fuer diese Anfrage.'); return; }
    state.grams -= offer.grams;
    const avgQ = (state.qualityPool.grams||0) > 0 ? (state.qualityPool.weighted/state.qualityPool.grams) : 1;
    const qMult = saleQualityMultiplier(avgQ);
    const total = offer.grams * offer.pricePerG * qMult;
    // reduce quality pool proportionally
    const usedWeighted = Math.min(state.qualityPool.weighted||0, avgQ * offer.grams);
    state.qualityPool.grams = Math.max(0, (state.qualityPool.grams||0) - offer.grams);
    state.qualityPool.weighted = Math.max(0, (state.qualityPool.weighted||0) - usedWeighted);
    state.cash += total;
    state.totalCashEarned += total;
    state.tradesDone += 1;
    state.offers.splice(idx, 1);
    renderResources();
    renderTrade();
    save();
    addXP(10, "Anfrage erf-llt");
    showToast(`Anfrage erfuellt: ${offer.grams} g fuer ${fmtMoney(total)}`);
  }

  function deliverApotheke(id){
    if(!Array.isArray(state.apothekenOffers)) state.apothekenOffers = [];
    const idx = state.apothekenOffers.findIndex(o => o.id === id);
    if(idx === -1) return;
    const offer = state.apothekenOffers[idx];
    if(offer.expiresAt <= Date.now()){
      state.apothekenOffers.splice(idx, 1);
      renderTrade();
      return;
    }
    if(state.grams < offer.grams){ showToast('Nicht genug Ertrag fuer diese Lieferung.'); return; }
    state.grams -= offer.grams;
    const avgQ = (state.qualityPool.grams||0) > 0 ? (state.qualityPool.weighted/state.qualityPool.grams) : 1;
    const qMult = saleQualityMultiplier(avgQ);
    const total = offer.grams * offer.pricePerG * qMult;
    // reduce quality pool proportionally
    const usedWeighted = Math.min(state.qualityPool.weighted||0, avgQ * offer.grams);
    state.qualityPool.grams = Math.max(0, (state.qualityPool.grams||0) - offer.grams);
    state.qualityPool.weighted = Math.max(0, (state.qualityPool.weighted||0) - usedWeighted);
    state.cash += total;
    state.totalCashEarned += total;
    state.tradesDone += 1;
    state.apothekenOffers.splice(idx, 1);
    renderResources();
    renderTrade();
    save();
    addXP(12, "Apotheke beliefert");
    showToast(`Lieferung erfuellt: ${offer.grams} g fuer ${fmtMoney(total)}`);
  }

  function calcPrestigeGain(total){
    return Math.floor(Math.pow(total / 10000, 0.5));
  }

  function doPrestige(){
    const gain = calcPrestigeGain(state.totalEarned);
    if(gain <= 0){ showToast('Noch kein Prestige-Gewinn verfuegbar.'); return; }
    if(!confirm(`Reinvestieren? Du erhaeltst ${gain} Haze-Punkte und setzt die Farm zurueck.`)) return;
    const theme = state.theme;
    state = {
      grams:0,
      totalEarned:0,
      bestPerSec:0,
      hazePoints: state.hazePoints + gain,
      resets:(state.resets||0)+1,
      playtimeSec:0,
      timeSpeed: state.timeSpeed || 1,
      gameDaysTotal: 0,
      lastYearProcessed: 1,
      lastTime: Date.now(),
      slotsUnlocked:3,
      plants:[],
      purchasedCount:{},
      upgrades:{},
      theme,
      cash:0,
      totalCashEarned:0,
      tradesDone:0,
      offers:[],
      nextOfferIn:10,
      apothekenOffers:[],
      nextApothekenOfferIn:30,
      itemsOwned:{},
      consumables:{ water:0, nutrient:0, spray:0, fungicide:0, beneficials:0 },
      maintenance:{ filterPenaltyActive:false, filterNextDueAtDays:0 },
      lastMonthProcessed:1,
      nextMarketEventIn:90,
      marketMult:1,
      marketTimer:0,
      marketEventName:'',
      welcomeRewarded:true
    };
    renderAll();
    save();
    showToast('Prestige abgeschlossen. Bonus aktiv.');
  }

  function setActionStates(card, plant){
    const harvestBtn = card.querySelector('[data-harvest]');
    const waterBtn = card.querySelector('[data-water-btn]');
    const feedBtn = card.querySelector('[data-feed-btn]');
    const pestBtn = card.querySelector('[data-pest-btn]');
    const hasShears = (state.itemsOwned['shears'] || 0) > 0;
    ensureConsumables();
    const waterCharges = state.consumables.water || 0;
    const nutrientCharges = state.consumables.nutrient || 0;
    const anyPestCharges = (state.consumables.spray||0) + (state.consumables.fungicide||0) + (state.consumables.beneficials||0);
    if(harvestBtn){
      harvestBtn.disabled = !(plant.growProg >= 1 && hasShears && plant.health > 0);
      harvestBtn.title = harvestBtn.disabled ? 'Ernte erfordert Schere und reife Pflanze' : 'Ernten';
    }
    if(waterBtn){
      if(waterCharges <= 0){
        waterBtn.disabled = true;
        waterBtn.title = 'Kein Wasserkanister - im Handel kaufen';
      }else{
        waterBtn.disabled = false;
        waterBtn.title = `Waessern (Kanister: ${waterCharges})`;
      }
    }
    if(feedBtn){
      if(nutrientCharges <= 0){
        feedBtn.disabled = true;
        feedBtn.title = 'Kein DÃ¼ngerpaket - im Handel kaufen';
      }else{
        feedBtn.disabled = false;
        feedBtn.title = `Duengen (Pakete: ${nutrientCharges})`;
      }
    }
    if(pestBtn){
      const infected = !!plant.pest;
      pestBtn.disabled = !(infected && anyPestCharges > 0);
      pestBtn.title = infected ? (anyPestCharges>0 ? 'Abwehr einsetzen' : 'Keine Abwehr vorrÃ¤tig') : 'Keine SchÃ¤dlinge';
    }
  }

  function updateProgressBars(){
    $$('#slots .plant-card').forEach(card => {
      const slot = Number(card.dataset.slot);
      const plant = state.plants.find(p => p.slot === slot);
      if(!plant) return;
      ensurePlantDefaults(plant);
      updatePlantCard(card, plant);
    });
  }

  function spawnFloat(slotIndex, text){
    const card = $(`#slots .plant-card[data-slot="${slotIndex}"]`);
    if(!card) return;
    const fx = card.querySelector('[data-fx]');
    if(!fx) return;
    const el = document.createElement('div');
    el.className = 'float';
    el.innerHTML = text;
    el.style.top = '45%';
    fx.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function showFloat(text, type='default'){
    const el = document.createElement('div');
    el.className = 'global-float';
    el.innerHTML = text;
    el.style.position = 'fixed';
    el.style.left = Math.random() * 80 + 10 + '%';
    el.style.top = Math.random() * 60 + 20 + '%';
    el.style.color = type === 'cash' ? '#FFD700' : '#eafff2';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '18px';
    el.style.textShadow = '0 2px 8px rgba(0,0,0,.5)';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '1000';
    el.style.animation = 'globalFloatUp 2s ease-out forwards';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  function spawnBurst(slotIndex, symbol='??', count=6){
    const card = $(`#slots .plant-card[data-slot="${slotIndex}"]`);
    if(!card) return;
    const fx = card.querySelector('[data-fx]');
    if(!fx) return;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = symbol;
      p.style.left = '50%';
      p.style.top = '46%';
      const dx = (Math.random()*28 - 14).toFixed(1) + 'px';
      p.style.setProperty('--dx', dx);
      p.style.animationDelay = (i*0.03)+'s';
      fx.appendChild(p);
      setTimeout(()=> p.remove(), 1300);
    }
  }

  function fireEmployee(id){
    const emp = EMPLOYEES.find(e => e.id === id);
    if(!emp || !state.employees[id] || !state.employees[id].hired) return;
    if(!confirm(`Mitarbeiter ${emp.name} kündigen?`)) return;
    delete state.employees[id];
    renderEmployees();
    save();
    showToast(`${emp.name} gekündigt.`);
  }

  function renderEmployees(){
    const wrap = document.getElementById('employeesList');
    if(!wrap) return;
    wrap.innerHTML = '';
    for(const emp of EMPLOYEES){
      const empData = state.employees[emp.id] || {};
      const hired = empData.hired;
      const level = empData.level || 1;
      const eligible = state.level >= (emp.reqLevel || 1);
      const upgradeCost = hired ? Math.round(emp.salary * level * 2) : 0;
      const div = document.createElement('div');
      div.className = 'employee-card';
      div.innerHTML = `
        <div class="employee-image">
          <img src="${emp.image}" alt="${emp.name}" />
        </div>
        <div class="employee-info">
          <div class="employee-name">${emp.name} ${hired ? `(Lv.${level})` : ''}</div>
          <div class="employee-desc">${emp.desc}</div>
          <div class="employee-details">Gehalt: ${fmtMoney(emp.salary)}/Monat Â· Aufgaben: ${emp.tasks.join(', ')} ${hired ? `Â· Effizienz: +${(level-1)*10}%` : ''}</div>
          <div class="employee-actions">
            ${!hired ? `<button class="secondary" data-hire-emp="${emp.id}" ${!eligible?'disabled':''}>${eligible?'Einstellen':`Gesperrt (Lvl ${emp.reqLevel})`}</button>` : `<button class="accent" data-upgrade-emp="${emp.id}">Upgrade (${fmt(upgradeCost)}g)</button><button class="ghost" data-fire-emp="${emp.id}">Kündigen</button>`}
          </div>
        </div>
      `;
      const hireBtn = div.querySelector('[data-hire-emp]');
      if(hireBtn){
        hireBtn.disabled = !eligible || state.cash < emp.salary;
        hireBtn.addEventListener('click', () => hireEmployee(emp.id));
      }
      const upgradeBtn = div.querySelector('[data-upgrade-emp]');
      if(upgradeBtn){
        upgradeBtn.disabled = state.grams < upgradeCost;
        upgradeBtn.addEventListener('click', () => upgradeEmployee(emp.id));
      }
      const fireBtn = div.querySelector('[data-fire-emp]');
      if(fireBtn){
        fireBtn.addEventListener('click', () => fireEmployee(emp.id));
      }
      wrap.appendChild(div);
    }
  }

  function renderApothekenVertraege(){
    const wrap = document.getElementById('vertraegeList');
    if(!wrap) return;
    wrap.innerHTML = '';
    if(state.level < 6){
      wrap.innerHTML = '<div class="placeholder">Dieses Feature wird mit Level 6 freigeschaltet.</div>';
      return;
    }
    for(const vertrag of APOTHEKEN_VERTRAEGE){
      const vertragData = state.apothekenVertraege[vertrag.id] || {};
      const hired = vertragData.hired;
      const eligible = state.level >= (vertrag.reqLevel || 1);
      const div = document.createElement('div');
      div.className = 'job-card' + (hired ? ' job-card-active' : (eligible ? '' : ' job-card-locked'));
      div.innerHTML = `
        <div class="job-title">${vertrag.name}</div>
        <div class="job-salary">${fmtMoney(vertrag.monthlyCash)}/Monat</div>
        <div class="job-desc">${vertrag.desc}</div>
        <div class="job-tags">Lieferung: ${vertrag.monthlyGrams}g/Monat</div>
        <div class="job-meta">Vertragskosten: ${fmtMoney(vertrag.costToHire)}</div>
        <div class="jobs-card-actions">
          ${!hired ? `<button class="secondary" data-hire-vertrag="${vertrag.id}" ${!eligible?'disabled':''}>${eligible?'Vertrag abschließen':`Gesperrt (Lvl ${vertrag.reqLevel})`}</button>` : `<button class="ghost" data-fire-vertrag="${vertrag.id}">Vertrag kündigen</button>`}
        </div>
      `;
      const hireBtn = div.querySelector('[data-hire-vertrag]');
      if(hireBtn){
        hireBtn.disabled = !eligible || state.cash < vertrag.costToHire;
        hireBtn.addEventListener('click', () => hireApothekenVertrag(vertrag.id));
      }
      const fireBtn = div.querySelector('[data-fire-vertrag]');
      if(fireBtn){
        fireBtn.addEventListener('click', () => fireApothekenVertrag(vertrag.id));
      }
      wrap.appendChild(div);
    }
  }

  function hireEmployee(id){
    const emp = EMPLOYEES.find(e => e.id === id);
    if(!emp) return;
    if(state.employees[id] && state.employees[id].hired) return;
    if(state.cash < emp.salary){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= emp.salary;
    state.employees[id] = { hired: true, level: 1 };
    renderResources();
    renderEmployees();
    save();
    showToast(`${emp.name} eingestellt.`);
  }

  function upgradeEmployee(id){
    const emp = EMPLOYEES.find(e => e.id === id);
    if(!emp || !state.employees[id] || !state.employees[id].hired) return;
    const currentLevel = state.employees[id].level || 1;
    const cost = Math.round(emp.salary * currentLevel * 2);
    if(state.grams < cost){ showToast('Nicht genug Ertrag.'); return; }
    state.grams -= cost;
    state.employees[id].level = currentLevel + 1;
    renderResources();
    renderEmployees();
    save();
    showToast(`${emp.name} auf Level ${currentLevel + 1} upgegradet.`);
  }

  function hireApothekenVertrag(id){
    const vertrag = APOTHEKEN_VERTRAEGE.find(v => v.id === id);
    if(!vertrag) return;
    if(state.apothekenVertraege[id] && state.apothekenVertraege[id].hired) return;
    if(state.cash < vertrag.costToHire){ showToast('Nicht genug Bargeld.'); return; }
    state.cash -= vertrag.costToHire;
    state.apothekenVertraege[id] = { hired: true };
    renderResources();
    renderApothekenVertraege();
    save();
    showToast(`Vertrag mit ${vertrag.name} abgeschlossen.`);
  }

  function fireApothekenVertrag(id){
    const vertrag = APOTHEKEN_VERTRAEGE.find(v => v.id === id);
    if(!vertrag || !state.apothekenVertraege[id] || !state.apothekenVertraege[id].hired) return;
    if(!confirm(`Vertrag mit ${vertrag.name} kündigen?`)) return;
    delete state.apothekenVertraege[id];
    renderApothekenVertraege();
    save();
    showToast(`Vertrag mit ${vertrag.name} gekündigt.`);
  }

  function employeeActions(dt){
    // Simple automation: every few seconds, perform tasks
    if(!state._empTimer) state._empTimer = 0;
    state._empTimer += dt;
    if(state._empTimer < 5) return; // every 5 seconds
    state._empTimer = 0;

    for(const emp of EMPLOYEES){
      if(!state.employees[emp.id]) continue;
      for(const task of emp.tasks){
        performEmployeeTask(task);
      }
    }
  }

  function performEmployeeTask(task){
    const plants = state.plants.filter(p => p.health > 0);
    if(plants.length === 0) return;
    const plant = plants[Math.floor(Math.random() * plants.length)]; // random plant
    const slot = plant.slot;
    // Find employee level for this task
    let empLevel = 1;
    for(const emp of EMPLOYEES){
      if(emp.tasks.includes(task) && state.employees[emp.id] && state.employees[emp.id].hired){
        empLevel = state.employees[emp.id].level || 1;
        break;
      }
    }
    const efficiency = 1 + (empLevel - 1) * 0.1; // +10% per level
    if(task === 'water'){
      if(plant.water < WATER_MAX * 0.5 && (state.itemsOwned['watering_can']||0) > 0){
        plant.water = Math.min(WATER_MAX, plant.water + WATER_ADD_AMOUNT * 0.5 * efficiency);
      }
    }else if(task === 'feed'){
      ensureConsumables();
      if(plant.nutrients < NUTRIENT_MAX * 0.5 && state.consumables.nutrient > 0){
        state.consumables.nutrient -= 1;
        plant.nutrients = Math.min(NUTRIENT_MAX, plant.nutrients + NUTRIENT_ADD_AMOUNT * efficiency);
        plant.quality = clamp(plant.quality + 0.02 * efficiency, 0.4, 1.5);
      }
    }else if(task === 'harvest'){
      if(plant.growProg >= 1 && (state.itemsOwned['shears']||0) > 0){
        harvestPlant(slot);
      }
    }else if(task === 'treat'){
      if(plant.pest && state.consumables.spray > 0){
        treatPlant(slot);
      }
    }
  }

  function breedStrains(parent1Id, parent2Id){
    const p1 = getStrain(parent1Id);
    const p2 = getStrain(parent2Id);
    if(!p1 || !p2) return null;
    const newId = `hybrid_${parent1Id}_${parent2Id}_${Date.now()}`;
    const newName = `${p1.name} x ${p2.name}`;
    const newYield = Math.round((p1.yield + p2.yield) / 2 * 1.2); // hybrid vigor
    const newGrow = Math.round((p1.grow + p2.grow) / 2 * 0.9);
    const newQuality = (p1.quality + p2.quality) / 2 + 0.1;
    const newStrain = {
      id: newId,
      name: newName,
      tag: 'HY',
      cost: Math.round((p1.cost + p2.cost) / 2 * 1.5),
      yield: newYield,
      grow: newGrow,
      quality: newQuality,
      yieldBonus: (p1.yieldBonus + p2.yieldBonus) / 2 + 0.1,
      offerBonus: (p1.offerBonus + p2.offerBonus) / 2 + 0.1,
      desc: `Hybrid aus ${p1.name} und ${p2.name}`,
      base: 'assets/plants/greengelato' // placeholder
    };
    state.customStrains.push(newStrain);
    state.seeds[newId] = (state.seeds[newId] || 0) + 1;
    return newStrain;
  }

  let breedingSlots = { parent1: null, parent2: null };

  function renderBreeding(){
    const wrap = document.getElementById('breedingInterface');
    if(!wrap) return;
    const resultPreview = document.getElementById('resultPreview');
    const breedBtn = document.getElementById('breedBtn');

    // Update slots
    for(let i=1; i<=2; i++){
      const slotEl = document.querySelector(`.breeding-slot[data-parent="${i}"]`);
      const strainId = breedingSlots[`parent${i}`];
      if(strainId){
        const strain = getStrain(strainId);
        slotEl.className = 'breeding-slot filled';
        slotEl.innerHTML = `<div class="strain-info">${strain.name}</div><button class="remove-seed" data-remove-parent="${i}">X</button>`;
      } else {
        slotEl.className = 'breeding-slot empty';
        slotEl.innerHTML = '<div class="slot-label">Samen setzen</div>';
      }
    }

    // Update preview
    const p1 = breedingSlots.parent1;
    const p2 = breedingSlots.parent2;
    if(p1 && p2 && p1 !== p2){
      const s1 = getStrain(p1);
      const s2 = getStrain(p2);
      const newName = `${s1.name} x ${s2.name}`;
      if(resultPreview) resultPreview.textContent = `Neue Sorte: ${newName}`;
      if(breedBtn) breedBtn.disabled = false;
    } else {
      if(resultPreview) resultPreview.textContent = 'Setze zwei verschiedene Samen';
      if(breedBtn) breedBtn.disabled = true;
    }
  }

  function renderAll(){
    renderSlots();
    renderShop();
    renderCart();
    renderResources();
    renderUpgrades();
    renderStats();
    renderTrade();
    renderSettings();
    renderResearch();
    renderEmployees();
    renderApothekenVertraege();
    renderBreeding();
    renderGameTime();
    if(unlockCostEl) unlockCostEl.textContent = state.slotsUnlocked >= MAX_SLOTS ? 'max' : fmt(slotUnlockCost(state.slotsUnlocked));
  }

  function updateOfferTimers(){
    const now = Date.now();
    const before = state.offers.length;
    state.offers = state.offers.filter(o => o.expiresAt > now);
    if(offerListEl && state.offers.length !== before) renderOffers();
    $$('#offerList [data-offer]').forEach(el => {
      const id = Number(el.dataset.offer);
      const offer = state.offers.find(o => o.id === id);
      if(!offer){ el.textContent = 'abgelaufen'; return; }
      const sec = Math.max(0, Math.ceil((offer.expiresAt - now) / 1000));
      el.textContent = `${sec}s`;
    });
  }

  // Orders (NPC-Auftraege)
  function renderOrders(){
    const container = document.getElementById('ordersList');
    if(!container) return;
    container.innerHTML = '';
    const now = Date.now();
    state.orders = state.orders.filter(o => o.expiresAt > now);
    for(const o of state.orders){
      const strain = getStrain(o.strainId);
      const total = o.grams * o.pricePerG;
      const node = document.createElement('div');
      node.className = 'offer';
      node.innerHTML = `
        <div class="offer-left">
          <div class="offer-qty">${o.grams} g</div>
          <div>
            <div>${strain.name} Â· Preis: <strong>${fmtMoney(o.pricePerG)}</strong> Â· Gesamt: <strong>${fmtMoney(total)}</strong></div>
            <div class="offer-meta">Auftrag #${o.id}</div>
          </div>
        </div>
        <div class="offer-right">
          <div class="offer-timer" data-order="${o.id}">--s</div>
          <button class="accent" data-deliver="${o.id}">Liefern</button>
        </div>
      `;
      node.querySelector('[data-deliver]').addEventListener('click', () => deliverOrder(o.id));
      container.appendChild(node);
    }
  }

  function updateOrderTimers(){
    const now = Date.now();
    const before = state.orders.length;
    state.orders = state.orders.filter(o => o.expiresAt > now);
    if(before !== state.orders.length) renderOrders();
    document.querySelectorAll('#ordersList [data-order]')?.forEach(el => {
      const id = Number(el.getAttribute('data-order'));
      const o = state.orders.find(x=>x.id===id);
      if(!o){ el.textContent = 'abgelaufen'; return; }
      const sec = Math.max(0, Math.ceil((o.expiresAt - now)/1000));
      el.textContent = `${sec}s`;
    });
  }

  function updateApothekenTimers(){
    if(!Array.isArray(state.apothekenOffers)) state.apothekenOffers = [];
    const now = Date.now();
    const before = state.apothekenOffers.length;
    state.apothekenOffers = state.apothekenOffers.filter(o => o.expiresAt > now);
    if(before !== state.apothekenOffers.length) renderApotheken();
    document.querySelectorAll('#apothekenList [data-apotheke]')?.forEach(el => {
      const id = Number(el.getAttribute('data-apotheke'));
      const o = state.apothekenOffers.find(x=>x.id===id);
      if(!o){ el.textContent = 'abgelaufen'; return; }
      const sec = Math.max(0, Math.ceil((o.expiresAt - now)/1000));
      el.textContent = `${sec}s`;
    });
  }

  function spawnOrder(){
    const strain = STRAINS[Math.floor(Math.random()*STRAINS.length)];
    const base = BASE_PRICE_PER_G * (state.marketMult || 1);
    const pricePerG = parseFloat((base * (1.2 + Math.random()*0.6)).toFixed(2));
    const grams = Math.floor(50 + Math.random()*250);
    const ttl = 120 + Math.floor(Math.random()*240);
    const id = Math.floor(Math.random()*1e6);
    state.orders.push({ id, strainId: strain.id, grams, pricePerG, expiresAt: Date.now()+ttl*1000 });
  }

  function deliverOrder(id){
    const idx = state.orders.findIndex(o=>o.id===id);
    if(idx===-1) return;
    const o = state.orders[idx];
    if(state.grams < o.grams){ showToast('Nicht genug Ertrag fuer diesen Auftrag.'); return; }
    // apply quality multiplier like offers
    const avgQ = (state.qualityPool.grams||0) > 0 ? (state.qualityPool.weighted/state.qualityPool.grams) : 1;
    const qMult = saleQualityMultiplier(avgQ);
    const total = o.grams * o.pricePerG * qMult;
    state.grams -= o.grams;
    const usedWeighted = Math.min(state.qualityPool.weighted||0, avgQ * o.grams);
    state.qualityPool.grams = Math.max(0, (state.qualityPool.grams||0) - o.grams);
    state.qualityPool.weighted = Math.max(0, (state.qualityPool.weighted||0) - usedWeighted);
    state.cash += total;
    state.totalCashEarned += total;
    state.tradesDone += 1;
    state.reputation = (state.reputation||0) + 1;
    state.orders.splice(idx,1);
    renderResources();
    renderTrade();
    save();
    addXP(12, "Auftrag geliefert");
    showToast(`Auftrag erfuellt: ${o.grams} g fuer ${fmtMoney(total)}`);
  }

  function initTabs(){
    const buttons = Array.from($$('.tab-btn'));// ensure static list
    if(buttons.length === 0) return;
    const nav = document.getElementById('sidebar');
    let highlight = null;
    if(nav){
      highlight = nav.querySelector('.tab-highlight');
      if(!highlight){
        highlight = document.createElement('div');
        highlight.className = 'tab-highlight';
        nav.appendChild(highlight);
      }
    }
    let activeBtn = buttons.find(btn => btn.classList.contains('active')) || buttons[0];
    const moveHighlight = (target) => {
      if(!highlight || !nav || !target) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = target.getBoundingClientRect();
      window.requestAnimationFrame(() => {
        highlight.style.height = `${btnRect.height}px`;
        highlight.style.transform = `translateY(${btnRect.top - navRect.top}px)`;
        highlight.classList.add('show');
      });
    };
    const updateTabCentering = () => {
      try{
        const tab = document.querySelector('.tab.active');
        if(!tab) return;
        // center only if content fits viewport (no vertical overflow)
        const shouldCenter = tab.scrollHeight <= tab.clientHeight + 2; // small tolerance
        tab.classList.toggle('centered', shouldCenter);
      }catch(_e){}
    };
    const activateTab = (btn) => {
      if(!btn) return;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab;
      $$('.tab').forEach(tab => tab.classList.remove('active'));
      const panel = document.querySelector(`#tab-${id}`);
      if(panel) panel.classList.add('active');
      if(id === 'trade' || id === 'market') renderTrade();
      if(id === 'trade') renderShop();
      if(id === 'settings') renderSettings();
      if(id === 'research') renderResearch();
      if(id === 'inventory') renderInventory();
      if(id === 'estate') renderEstate();
      if(id === 'jobs') renderJobs();
      if(id === 'inbox') renderInbox();
      if(id === 'employees') renderEmployees();
      if(id === 'breeding') renderBreeding();
      activeBtn = btn;
      moveHighlight(btn);
      // update vertical centering dynamically
      requestAnimationFrame(updateTabCentering);
    };
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if(btn === activeBtn) return;
        activateTab(btn);
      });
    });
    if(activeBtn){
      if(!activeBtn.classList.contains('active')) activateTab(activeBtn);
      moveHighlight(activeBtn);
    }
    window.addEventListener('resize', () => { moveHighlight(activeBtn); requestAnimationFrame(() => {
      try{ const tab = document.querySelector('.tab.active'); if(tab) tab.classList.remove('centered'); }catch(_e){}
      requestAnimationFrame(updateTabCentering);
    }); });
    window.__updateTabHighlight = () => moveHighlight(activeBtn);
    window.__updateTabCentering = updateTabCentering;
  }

  function applyTheme(){
    if(state.theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
  }

  function initThemeToggle(){
    if(!themeToggle) return;
    themeToggle.checked = state.theme === 'light';
    themeToggle.addEventListener('change', () => {
      state.theme = themeToggle.checked ? 'light' : 'dark';
      applyTheme();
      save();
    });
  }

  function initAmbientLayer(){
    const wrap = document.querySelector('.ambient-orbs');
    if(!wrap || wrap.dataset.enhanced === '1') return;
    wrap.dataset.enhanced = '1';
    const orbs = Array.from(wrap.querySelectorAll('.orb'));// existing seeded in markup
    const desired = Math.max(6, orbs.length);
    while(orbs.length < desired){
      const span = document.createElement('span');
      span.className = 'orb';
      wrap.appendChild(span);
      orbs.push(span);
    }
    const randomize = (orb) => {
      const dur = 16 + Math.random()*12;
      const delay = -Math.random()*dur;
      const hue = Math.floor(Math.random()*60) - 15;
      const opacity = (0.25 + Math.random()*0.4).toFixed(2);
      orb.style.animationDuration = `${dur}s`;
      orb.style.animationDelay = `${delay}s`;
      orb.style.opacity = opacity;
      orb.style.setProperty('--orb-hue', `${hue}deg`);
    };
    orbs.forEach(orb => {
      randomize(orb);
      orb.addEventListener('animationiteration', () => randomize(orb));
    });
  }

  function initSidebar(){
    applySidebar();
    if(sidebarToggle){
      sidebarToggle.addEventListener('click', () => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        applySidebar();
        save();
      });
    }
    if(seedCancelBtn) seedCancelBtn.addEventListener('click', closeSeedSelection);
    if(seedConfirmBtn) seedConfirmBtn.addEventListener('click', plantSelectedSeed);
  }

  function maybeWelcome(){
    if(state.welcomeRewarded) return;
    state.cash += 250;
    state.welcomeRewarded = true;
    renderResources();
    save();
    if(welcomeModal){
      welcomeModal.hidden = false;
      welcomeModal.classList.add('show');
      if(welcomeOk){
        welcomeOk.addEventListener('click', () => {
          welcomeModal.classList.remove('show');
          welcomeModal.hidden = true;
        }, { once:true });
      }
    }
  }

  function monthlyApothekenIncome() {
    let totalIncome = 0;
    let totalGrams = 0;
    const hiredContracts = (state.apothekenVertraege || {});

    for (const contractId in hiredContracts) {
        if (hiredContracts[contractId] && hiredContracts[contractId].hired) {
            const contractDef = APOTHEKEN_VERTRAEGE.find(c => c.id === contractId);
            if (contractDef) {
                totalGrams += contractDef.monthlyGrams;
                totalIncome += contractDef.monthlyCash;
            }
        }
    }

    if (totalGrams > 0) {
        if (state.grams >= totalGrams) {
            state.grams -= totalGrams;
            showToast(`Apotheken-Lieferung: ${totalGrams}g abgegeben.`);
            return totalIncome;
        } else {
            pushMessage(`Lieferung für Apotheken-Verträge fehlgeschlagen: Nicht genug Ertrag. Benötigt: ${totalGrams}g.`);
            return 0;
        }
    }
    return 0;
  }

  let lastTick = performance.now();
  let saveTicker = 0;

  function loop(now){
    const dt = Math.min(0.2, (now - lastTick) / 1000);
    lastTick = now;
    state.playtimeSec += dt;

    const worldDt = dt * getTimeSpeed();
    advanceGameTime(worldDt);
    for(const plant of state.plants){
      advancePlant(plant, worldDt);
    }
    employeeActions(worldDt);

    const perSec = computePerSec();
    if(perSec > state.bestPerSec) state.bestPerSec = perSec;

    state.nextOfferIn -= worldDt;
    if(state.nextOfferIn <= 0){
      if(state.offers.length < currentMaxOffers()) spawnOffer();
      const [minS, maxS] = currentSpawnWindow();
      state.nextOfferIn = minS + Math.random() * (maxS - minS);
      renderOffers();
    }

    // Orders spawn
    state.nextOrderIn -= worldDt;
    if(state.nextOrderIn <= 0){
      if((state.orders?.length||0) < 3) spawnOrder();
      state.nextOrderIn = 90 + Math.random()*120;
      renderOrders();
    }

    // Apotheken spawn
    if(!Array.isArray(state.apothekenOffers)) state.apothekenOffers = [];
    state.nextApothekenOfferIn -= worldDt;
    if(state.nextApothekenOfferIn <= 0){
      if(state.apothekenOffers.length < 2) spawnApothekenOffer();
      state.nextApothekenOfferIn = 60 + Math.random()*120;
      renderApotheken();
    }

    // Bewerbungen auswerten (Antwort nach 3 Tagen)
    try{ processApplications(); }catch(_e){}
    // Monatsgehalt sicherstellen (falls Monatswechsel verpasst)
    try{
      const idx = (currentYear()-1)*12 + monthFromDayOfYear(currentDayOfYear());
      if(state._salaryIdx == null) state._salaryIdx = idx;
      if(idx !== state._salaryIdx){
        const inc = monthlyIncome();
        if(inc > 0){ state.cash += inc; pushMessage('Gehalt erhalten: ' + fmtMoney(inc)); }
        const vertragInc = monthlyApothekenIncome();
        if(vertragInc > 0){ state.cash += vertragInc; pushMessage('Apotheken-Verträge: ' + fmtMoney(vertragInc)); }
        state._salaryIdx = idx;
      }
    }catch(_e){}

    updateOfferTimers();
    updateOrderTimers();
    updateApothekenTimers();
    updateProgressBars();
    renderResources();

    // Market events (random inspections / hype)
    if((state.marketTimer||0) > 0){
      state.marketTimer -= worldDt;
      if(state.marketTimer <= 0){
        state.marketTimer = 0;
        state.marketMult = 1;
        state.marketEventName = '';
        showToast('Marktereignis beendet. Preise normalisiert.');
        renderTrade();
      }
    } else {
      state.nextMarketEventIn -= worldDt;
      if(state.nextMarketEventIn <= 0){
        spawnMarketEvent();
        try{
          const msg = (state.marketEventName||'') === 'Inspektion' ? 'Inspektion! Preise kurzzeitig reduziert' : 'Hype! Preise kurzzeitig erhÃ¶ht';
          showAnnouncement(msg);
        }catch(_e){}
      }
    }

    // Random game events
    if(!state.nextGameEventIn) state.nextGameEventIn = 300 + Math.random()*600; // 5-15 min
    state.nextGameEventIn -= worldDt;
    if(state.nextGameEventIn <= 0){
      spawnRandomEvent();
      state.nextGameEventIn = 300 + Math.random()*600;
    }
    // Update active events
    state.activeEvents = state.activeEvents.filter(ev => {
      ev.duration -= worldDt;
      if(ev.duration <= 0){
        // End event
        if(ev.type === 'pest_plague') state.pestGlobalRate = PEST_GLOBAL_RATE;
        if(ev.type === 'harvest_blessing') state.harvestBonus = 1;
        if(ev.type === 'growth_boost') state.growthBonus = 1;
        if(ev.type === 'cash_rain') state.cashRain = false;
        showToast(`Event "${ev.name}" beendet.`);
        return false;
      }
      return true;
    });

    // Cash rain effect
    if(state.cashRain && Math.random() < 0.1 * worldDt){ // ~10% chance per second
      const bonus = Math.floor(Math.random() * 50) + 10;
      state.cash += bonus;
      showFloat(fmtMoney(bonus, { showPlus:true }), 'cash');
    }

    saveTicker += dt;
    if(saveTicker > 3){
      save();
      saveTicker = 0;
    }

    requestAnimationFrame(loop);
  }

  function renderSettings(){
    const d = DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
    if(diffGrowth) diffGrowth.textContent = 'x' + (d.growth || 1).toFixed(2);
    if(diffPest) diffPest.textContent = 'x' + (d.pest || 1).toFixed(2);
    $$('.chip').forEach(el => el.classList.remove('active'));
    const cur = state.difficulty;
    if(cur === 'easy' && diffEasy) diffEasy.classList.add('active');
    if(cur === 'normal' && diffNormal) diffNormal.classList.add('active');
    if(cur === 'hard' && diffHard) diffHard.classList.add('active');
  }

  function setDifficulty(mode){
    if(!DIFFICULTIES[mode]) return;
    state.difficulty = mode;
    renderSettings();
    showToast('Schwierigkeit: ' + DIFFICULTIES[mode].name);
    save();
  }

  function bindGlobal(){
    if(unlockBtn) unlockBtn.addEventListener('click', unlockSlot);
    if(sell10Btn) sell10Btn.addEventListener('click', () => quickSell(10));
    if(sell100Btn) sell100Btn.addEventListener('click', () => quickSell(100));
    if(sellMaxBtn) sellMaxBtn.addEventListener('click', () => quickSell(Math.floor(state.grams * 0.5)));
    if(buyWaterBtn) buyWaterBtn.addEventListener('click', () => buyConsumable('water'));
    if(buyNutrientBtn) buyNutrientBtn.addEventListener('click', () => buyConsumable('nutrient'));
    if(buySprayBtn) buySprayBtn.addEventListener('click', () => buyConsumable('spray'));
    if(buyFungicideBtn) buyFungicideBtn.addEventListener('click', () => buyConsumable('fungicide'));
    if(buyBeneficialBtn) buyBeneficialBtn.addEventListener('click', () => buyConsumable('beneficial'));
        if(speedSelect) speedSelect.addEventListener('change', e => setTimeSpeed(e.target.value));
    if(diffEasy) diffEasy.addEventListener('click', () => setDifficulty('easy'));
    if(diffNormal) diffNormal.addEventListener('click', () => setDifficulty('normal'));
    if(diffHard) diffHard.addEventListener('click', () => setDifficulty('hard'));
    // Breeding
    document.addEventListener('click', (e) => {
      const target = e.target;
      if(target.classList.contains('cart-add') || target.closest('.cart-add')){
        const btn = target.closest('.cart-add');
        if(btn){
          const type = btn.getAttribute('data-cart-type');
          const id = btn.getAttribute('data-cart-id');
          addToCart(type, id);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      if(target.classList.contains('cart-remove') || target.closest('.cart-remove')){
        const btn = target.closest('.cart-remove');
        if(btn){
          const idx = parseInt(btn.getAttribute('data-remove-index') || '-1', 10);
          if(idx >= 0){
            removeCartEntry(idx);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      if(target.classList.contains('breeding-slot') || target.closest('.breeding-slot')){
        const slot = target.closest('.breeding-slot');
        if(slot){
          const parent = slot.getAttribute('data-parent');
          showSeedSelectionForBreeding(parent);
        }
      }
      if(target.classList.contains('remove-seed') || target.closest('.remove-seed')){
        const btn = target.closest('.remove-seed');
        if(btn){
          const parent = btn.getAttribute('data-remove-parent');
          breedingSlots[`parent${parent}`] = null;
          renderBreeding();
        }
      }
      // Right panel toggle
      if(target.id === 'rightPanelToggle' || (target.closest && target.closest('#rightPanelToggle'))){
        const panel = document.getElementById('rightPanel');
        if(panel){
          const isCollapsed = panel.classList.toggle('collapsed');
          if(rightPanelToggleBtn){
            rightPanelToggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            rightPanelToggleBtn.setAttribute('title', isCollapsed ? 'Premium Panel oeffnen' : 'Premium Panel schliessen');
          }
          e.preventDefault();
        }
      }
      // Panel tabs
      if(target.classList.contains('panel-tab') || target.closest('.panel-tab')){
        const tab = target.closest('.panel-tab');
        if(tab){
          const tabName = tab.getAttribute('data-panel-tab');
          switchPanelTab(tabName);
        }
      }

    });
    if(cartToggleBtn) cartToggleBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      if(cartIsOpen()) closeCartModal(); else openCartModal();
    });
    if(cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartModal);
    if(cartModal){
      cartModal.addEventListener('click', (ev) => {
        if(ev.target === cartModal) closeCartModal();
      });
    }
    document.addEventListener('keydown', (ev) => {
      if(ev.key === 'Escape' && cartIsOpen()) closeCartModal();
    });
    if(rightPanelToggleBtn){
      const panel = document.getElementById('rightPanel');
      const isCollapsed = panel ? panel.classList.contains('collapsed') : false;
      rightPanelToggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      rightPanelToggleBtn.setAttribute('title', isCollapsed ? 'Premium Panel oeffnen' : 'Premium Panel schliessen');
    }
    if(cartCheckoutBtn) cartCheckoutBtn.addEventListener('click', checkoutCart);
    if(cartClearBtn) cartClearBtn.addEventListener('click', () => { clearCart(); });
    const breedBtn = document.getElementById('breedBtn');
    if(breedBtn) breedBtn.addEventListener('click', performBreeding);
    setInterval(renderStats, 1000);
  }

  function showSeedSelectionForBreeding(parentNum){
    if(!seedModal || !seedListEl || !seedConfirmBtn || !seedCancelBtn) return;
    seedListEl.innerHTML = '';
    const s = state.seeds || {};
    const keys = Object.keys(s).filter(k => (s[k]||0) > 0);
    if(keys.length === 0){ showToast('Keine Samen vorhanden.'); return; }
    keys.forEach(id => {
      const strain = getStrain(id);
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div class="shop-left">
          <div class="shop-icon">${strain.tag || '??'}</div>
          <div>
            <div class="shop-name">${strain.name || id}</div>
            <div class="shop-desc">Bestand: ${(s[id]||0)}</div>
          </div>
        </div>
        <button class="secondary" data-choose-breeding="${id}" data-parent="${parentNum}">Auswaehlen</button>
      `;
      div.querySelector('button').addEventListener('click', (e) => {
        const strainId = e.target.getAttribute('data-choose-breeding');
        const parent = e.target.getAttribute('data-parent');
        breedingSlots[`parent${parent}`] = strainId;
        renderBreeding();
        closeSeedSelection();
      });
      seedListEl.appendChild(div);
    });
    seedConfirmBtn.style.display = 'none';
    seedModal.hidden = false; seedModal.classList.add('show');
  }

  function performBreeding(){
    const p1 = breedingSlots.parent1;
    const p2 = breedingSlots.parent2;
    if(!p1 || !p2) return;
    const newStrain = breedStrains(p1, p2);
    if(newStrain){
      showToast(`Neue Sorte erstellt: ${newStrain.name}`);
      breedingSlots = { parent1: null, parent2: null }; // Clear slots
      renderBreeding();
      renderShop();
    }
  }

  function switchPanelTab(tabName){
    const tabs = document.querySelectorAll('.panel-tab');
    const sections = document.querySelectorAll('.panel-section');
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    const activeTab = document.querySelector(`[data-panel-tab="${tabName}"]`);
    const activeSection = document.getElementById(`panel-${tabName}`);
    if(activeTab) activeTab.classList.add('active');
    if(activeSection) activeSection.classList.add('active');
    try{ document.getElementById('panel-quests')?.classList.add('active'); }catch(_e){}
    try{ document.getElementById('panel-events')?.classList.add('active'); }catch(_e){}
  }

  function switchShopTab(tabName){
    const tabs = document.querySelectorAll('#tab-trade .shop-tab');
    const categories = document.querySelectorAll('#tab-trade .shop-category');
    tabs.forEach(t => t.classList.remove('active'));
    categories.forEach(c => c.classList.remove('active'));
    const activeTab = document.querySelector(`#tab-trade [data-shop-tab="${tabName}"]`);
    const activeCategory = document.getElementById(`shop-${tabName}`);
    if(activeTab) activeTab.classList.add('active');
    if(activeCategory) activeCategory.classList.add('active');
    renderShop(); // Re-render shop for the active category
  }

  function switchMarketTab(tabName){
    const tabs = document.querySelectorAll('#tab-market .shop-tab');
    const categories = document.querySelectorAll('#tab-market .market-category');
    tabs.forEach(t => t.classList.remove('active'));
    categories.forEach(c => c.classList.remove('active'));
    const activeTab = document.querySelector(`#tab-market [data-market-tab="${tabName}"]`);
    const activeCategory = document.getElementById(`market-${tabName}`);
    if(activeTab) activeTab.classList.add('active');
    if(activeCategory) activeCategory.classList.add('active');
  }

  function start(){
    load();
    applyOfflineProgress();
    ensureConsumables();
    applyTheme();
    initSidebar();
    initQuests();
    // Cleanup any broken duplicated research section (legacy escaped markup)
    try{
      document.querySelectorAll('h2').forEach(h => {
        if(h.textContent && h.textContent.trim() === 'Forschung'){
          const sec = h.closest('section');
          if(sec && sec.id && sec.id !== 'tab-research'){
            sec.remove();
          }
        }
      });
    }catch(_e){}

    initThemeToggle();
    initTabs();
    initAmbientLayer();
    bindGlobal();

    // Handle shop tabs in #tab-trade
    const shopTabContainer = document.querySelector('#tab-trade');
    if (shopTabContainer) {
      shopTabContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.shop-tab');
        if (tab) {
          const tabName = tab.getAttribute('data-shop-tab');
          if (tabName) {
            switchShopTab(tabName);
          }
        }
      });
    }

    // Handle market tabs in #tab-market
    const marketTabContainer = document.querySelector('#tab-market');
    if (marketTabContainer) {
      marketTabContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.shop-tab');
        if (tab) {
          const tabName = tab.getAttribute('data-market-tab');
          if (tabName) {
            switchMarketTab(tabName);
          }
        }
      });
    }
    // Delegate confirmations for remove/upgrade once
    try{
      document.addEventListener('click', (ev) => {
        const t = ev.target;
        if(!t) return;
        const btn = t.closest ? t.closest('[data-remove], [data-upgrade]') : null;
        if(!btn) return;
        const card = btn.closest ? btn.closest('.plant-card') : null;
        if(!card) return;
        const slot = parseInt(card.getAttribute('data-slot') || '-1', 10);
        if(!(slot >= 0)) return;
        ev.preventDefault();
        if(btn.hasAttribute('data-remove')){
          showConfirm('Entfernen?', 'Willst du diese Pflanze wirklich entfernen?', 'Entfernen', 'danger', () => removePlant(slot));
        } else {
          const plant = state.plants.find(p=>p.slot===slot);
          const cost = plant ? plantUpgradeCost(plant) : 0;
          showConfirm('Upgrade?', 'Upgrade kostet ' + fmt(cost) + ' g.', 'Upgrade', 'accent', () => upgradePlant(slot));
        }
      }, true);
    }catch(_e){}
    try{
      const hr = document.getElementById('hardResetBtn');
      if(hr){ hr.addEventListener('click', () => {
        if(confirm('Wirklich alle Daten loeschen und neu starten?')){
          __RESETTING = true;
          try{ window.removeEventListener('beforeunload', save); }catch(_r){}
          try{ localStorage.removeItem(SAVE_KEY); localStorage.clear(); }catch(_ee){}
          location.reload();
        }
      }); }
    }catch(_e){}
    renderAll();
    maybeWelcome();
    renderSettings();
    // Quest actions (navigation + start time)
    try{
      document.addEventListener('click', (ev) => {
        const el = ev.target.closest ? ev.target.closest('[data-quest-action]') : null;
        if(!el) return;
        const act = el.getAttribute('data-quest-action');
        if(act === 'goto-jobs') document.querySelector('.tab-btn[data-tab="jobs"]').click();
        else if(act === 'goto-shop') document.querySelector('.tab-btn[data-tab="trade"]').click();
        else if(act === 'goto-farm') document.querySelector('.tab-btn[data-tab="farm"]').click();
        else if(act === 'start-time') setTimeSpeed(1);
      }, true);
    }catch(_e){}
    requestAnimationFrame(ts => {
      lastTick = ts;
      requestAnimationFrame(loop);
    });
    window.addEventListener('beforeunload', save);
  }

document.addEventListener('DOMContentLoaded', start);

// --- Enhancements: inventory, shop grouping, jobs UX, messages badge, watering ---
// Override watering: no water canisters, require watering can
try{
  const __orig_waterPlant = waterPlant;
  waterPlant = function(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant) return;
    if((state.itemsOwned['watering_can']||0) <= 0){ showToast('Giesskanne erforderlich.'); return; }
    plant.water = Math.min(WATER_MAX, plant.water + WATER_ADD_AMOUNT);
    updateProgressBars();
    try{ spawnBurst(slotIndex, '??', 4); }catch(_e){}
    save();
  }
}catch(_e){}

// Adjust action states for watering button tooltip/disabled
try{
  const __orig_setActionStates = setActionStates;
  setActionStates = function(card, plant){
    __orig_setActionStates(card, plant);
    try{
      const waterBtn = card.querySelector('[data-water-btn]');
      if(waterBtn){
        const hasCan = (state.itemsOwned['watering_can']||0) > 0;
        waterBtn.disabled = !hasCan;
        waterBtn.title = hasCan ? 'Waessern' : 'Giesskanne erforderlich';
      }
    }catch(_ee){}
  }
}catch(_e){}

// Block buying water canisters via consumable purchase
try{
  const __orig_buyConsumable = buyConsumable;
  buyConsumable = function(type){
    if(type === 'water'){ showToast('Wasserkanister entfernt - bitte Giesskanne nutzen.'); return; }
    return __orig_buyConsumable(type);
  }
}catch(_e){}

// Messages: popup + live dot badge on Inbox tab
function showMessagePopup(text){
  try{
    const m = document.getElementById('confirmModal');
    const t = document.getElementById('confirmTitle');
    const p = document.getElementById('confirmText');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    if(!m || !t || !p || !ok) throw new Error('no modal');

    const cleanup = () => {
      if (!m) return;
      m.classList.remove('show');
      setTimeout(() => { m.hidden = true; }, 180); // Match modal hide timing
      if(cancel) cancel.style.display = '';
      if(ok) ok.onclick = null;
      if(cancel) cancel.onclick = null;
    };

    t.textContent = 'Nachricht';
    p.textContent = text;
    if(cancel) {
      cancel.style.display = 'none';
      cancel.onclick = null;
    }
    m.hidden = false;
    m.classList.add('show');
    ok.textContent = 'OK';
    ok.className = 'accent';
    ok.onclick = cleanup;
  }catch(_e){ try{ showAnnouncement(text, 5000); }catch(_e2){ try{ showToast(text); }catch(_e3){} } }
}

function updateMessageBadge(){
  try{
    const btn = document.querySelector('.tab-btn[data-tab="inbox"]');
    if(!btn) return;
    let dot = btn.querySelector('.live-dot');
    if(!dot){ dot = document.createElement('span'); dot.className = 'live-dot'; dot.textContent = '-'; dot.style.color = 'red'; dot.style.marginLeft = '6px'; dot.style.fontSize = '18px'; btn.appendChild(dot); }
    dot.style.display = (state.unreadMessages||0) > 0 ? '' : 'none';
  }catch(_e){}
}

try{
  const __orig_pushMessage = pushMessage;
  pushMessage = function(text){
    __orig_pushMessage(text);
    state.unreadMessages = (state.unreadMessages||0) + 1;
    updateMessageBadge();
    showMessagePopup(text);
    save();
  }
}catch(_e){}

// Clear unread when opening Inbox
try{
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if(!t) return;
    const btn = t.closest ? t.closest('.tab-btn[data-tab="inbox"]') : null;
    if(!btn) return;
    state.unreadMessages = 0;
    updateMessageBadge();
    save();
  }, true);
}catch(_e){}

updateMessageBadge();

// Override feedPlant to optionally use PGR as a consumable
try{
  const __orig_feedPlant = feedPlant;
  feedPlant = function(slotIndex){
    const plant = state.plants.find(p => p.slot === slotIndex);
    if(!plant) return;
    ensureConsumables();
    const hasPgr = (state.consumables.pgr||0) > 0;
    const boostActive = !!(plant.pgrBoostSec && plant.pgrBoostSec > 0);
    if(!hasPgr || boostActive){
      return __orig_feedPlant(slotIndex);
    }
    const feedWithoutPgr = () => {
      __orig_feedPlant(slotIndex);
    };
    const feedWithPgr = () => {
      __orig_feedPlant(slotIndex);
      state.consumables.pgr = Math.max(0, (state.consumables.pgr||0) - 1);
      plant.pgrBoostSec = PGR_BOOST_SEC;
      plant.quality = clamp(plant.quality - 0.02, 0.4, 1.5);
      try{ spawnFloat(slotIndex, 'PGR'); }catch(_e){}
      try{ renderConsumables(); }catch(_e){}
      try{ renderInventory(); }catch(_e){}
      save();
    };
    const shown = showConfirm('PGR-Booster verwenden?', 'Mit PGR verbrauchst du 1 Ladung und beschleunigst das Wachstum.', 'Mit PGR', 'accent', feedWithPgr, 'Ohne PGR', feedWithoutPgr);
    if(!shown){ feedWithoutPgr(); }
  };
}catch(_e){}
  // === Research (new tree) - Implementation ===
  function researchAvailable(){
    const totalPoints = Math.floor((state.totalEarned||0) / 500) + (state.hazePoints||0);
    let spent = 0;
    for(const branchKey in RESEARCH_TREE){
      const branch = RESEARCH_TREE[branchKey];
      for(const nodeKey in branch.nodes){
        if(state.research?.[nodeKey]) spent += branch.nodes[nodeKey].cost;
      }
    }
    return Math.max(0, totalPoints - spent);
  }

  function researchEffects(){
    const res = state.research || {};
    const eff = { yield:0, growth:0, quality:0, pest:0, water:0, cost:0, pest_mold:0, growthTime:0, priceMult:0, nutrientCost:0 };
    for(const branchKey in RESEARCH_TREE){
      const branch = RESEARCH_TREE[branchKey];
      for(const nodeKey in branch.nodes){
        if(res[nodeKey]){
          const e = branch.nodes[nodeKey].effects || {};
          eff.yield += e.yield||0;
          eff.growth += e.growth||0;
          eff.quality += e.quality||0;
          eff.pest += e.pest||0;
          eff.water += e.water||0;
          eff.cost += e.cost||0;
          eff.pest_mold += e.pest_mold||0;
          eff.growthTime += e.growthTime||0;
          eff.priceMult += e.priceMult||0;
          eff.nutrientCost += e.nutrientCost||0;
        }
      }
    }
    return eff;
  }

  function renderResearch(){
    const wrap = document.getElementById('researchList');
    const availEl = document.getElementById('researchAvailable');
    if(availEl) availEl.textContent = String(researchAvailable());
    if(!wrap) return;
    wrap.innerHTML = '';
    const eff = researchEffects();
    const totals = document.createElement('div');
    totals.className = 'hint';
    totals.textContent = `Aktive Boni - Ertrag +${Math.round(eff.yield*100)}%, Wachstum +${Math.round(eff.growth*100)}%, Qualitaet +${Math.round(eff.quality*100)}%, Risiko -${Math.round(eff.pest*100)}%`;
    wrap.appendChild(totals);

    const tree = document.createElement('div');
    tree.className = 'research-tree';
    const activeId = window.__activeResearchBranch || Object.keys(RESEARCH_TREE)[0];
    for(const branchKey in RESEARCH_TREE){
      const b = RESEARCH_TREE[branchKey];
      const ownedCount = Object.keys(b.nodes).filter(n => state.research?.[n]).length;
      const card = document.createElement('div');
      card.className = 'branch-card' + (activeId===branchKey?' active':'');
      card.dataset.branch = branchKey;
      card.innerHTML = `
        <div class="branch-icon">${b.icon}</div>
        <div class="branch-name">${b.name}</div>
        <div class="branch-progress">${ownedCount}/${Object.keys(b.nodes).length}</div>
      `;
      card.addEventListener('click', () => { window.__activeResearchBranch = branchKey; renderResearch(); });
      tree.appendChild(card);
    }
    wrap.appendChild(tree);

    const nodesWrap = document.createElement('div');
    nodesWrap.className = 'node-grid';
    const active = RESEARCH_TREE[activeId];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('class', 'research-lines');

    // Compute canvas size from node positions
    const NODE_W = 220; // must match CSS width
    const NODE_H = 110; // approx height
    let maxX = 0, maxY = 0;
    for(const nodeKey in active.nodes){
      const p = active.nodes[nodeKey].position || {x:0,y:0};
      if(p.x > maxX) maxX = p.x;
      if(p.y > maxY) maxY = p.y;
    }
    const pad = 80;
    const canvasW = Math.max((maxX + NODE_W + pad), wrap.clientWidth || 0);
    const canvasH = Math.max((maxY + NODE_H + pad), 320);
    nodesWrap.style.minHeight = canvasH + 'px';
    // Let container stretch, but SVG needs explicit size for line coords
    svg.setAttribute('width', String(canvasW));
    svg.setAttribute('height', String(canvasH));
    svg.setAttribute('viewBox', `0 0 ${canvasW} ${canvasH}`);
    nodesWrap.appendChild(svg);

    for(const nodeKey in active.nodes){
      const n = active.nodes[nodeKey];
      const owned = !!(state.research && state.research[nodeKey]);
      const prereqOk = (n.requires||[]).every(id => state.research?.[id]);
      const node = document.createElement('div');
      node.className = 'node-card';
      node.style.left = `${n.position.x}px`;
      node.style.top = `${n.position.y}px`;
      node.dataset.nodeId = nodeKey;

      node.innerHTML = `
        <div class="node-name">${n.name}</div>
        <div class="node-desc">${n.desc}</div>
        <button class="secondary" ${owned?'disabled':''}>${owned?'Erforscht':'Freischalten ('+n.cost+')'}</button>
      `;
      const btn = node.querySelector('button');
      if(!owned){
        btn.disabled = researchAvailable() < n.cost || !prereqOk;
        btn.addEventListener('click', () => buyResearch(nodeKey));
      }
      nodesWrap.appendChild(node);

      if (n.requires && n.requires.length > 0) {
        n.requires.forEach(reqId => {
          const reqNode = active.nodes[reqId];
          if (reqNode) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', n.position.x + 50);
            line.setAttribute('y1', n.position.y + 20);
            line.setAttribute('x2', reqNode.position.x + 50);
            line.setAttribute('y2', reqNode.position.y + 70);
            line.setAttribute('stroke', '#555');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
          }
        });
      }
    }
    wrap.appendChild(nodesWrap);
  }

  function formatResearchEffects(e){
    if(!e) return '';
    const items = [];
    if(e.growth) items.push(`Wachstum +${Math.round(e.growth*100)}%`);
    if(e.yield) items.push(`Ertrag +${Math.round(e.yield*100)}%`);
    if(e.quality) items.push(`Qualitaet +${Math.round(e.quality*100)}%`);
    if(e.water) items.push(`Wasser -${Math.round(e.water*100)}%`);
    if(e.pest) items.push(`Risiko -${Math.round(e.pest*100)}%`);
    if(e.pest_mold) items.push(`Schimmel -${Math.round(e.pest_mold*100)}%`);
    if(e.cost) items.push(`Kosten -${Math.round(e.cost*100)}%`);
    if(e.growthTime) items.push(`Wachstumszeit +${Math.round(e.growthTime*100)}%`);
    if(e.priceMult) items.push(`Preise +${Math.round(e.priceMult*100)}%`);
    if(e.nutrientCost) items.push(`Düngekosten +${Math.round(e.nutrientCost*100)}%`);
    return items.join(' Â· ');
  }

  function buyResearch(id){
    let found = null;
    let branchKey = null;
    for(const bk in RESEARCH_TREE){
        const branch = RESEARCH_TREE[bk];
        if(branch.nodes[id]){
            found = branch.nodes[id];
            branchKey = bk;
            break;
        }
    }

    if(!found) return;
    if(state.research?.[id]) return;

    const prereqOk = (found.requires||[]).every(r=> state.research?.[r]);
    if(!prereqOk){ showToast('Voraussetzungen fehlen.'); return; }

    if(researchAvailable() < found.cost){ showToast('Nicht genug Forschungspunkte.'); return; }
    state.research = state.research || {};
    state.research[id] = 1;
    renderResearch();
    save();
  }

 















function hasAnySeeds(){
  const s = state.seeds || {};
  for(const k in s){ if((s[k]||0) > 0) return true; }
  return false;
}

let _seedSelect = { slot:null, id:null };
function showSeedSelection(slot){
  _seedSelect.slot = slot; _seedSelect.id = null;
  if(!seedModal || !seedListEl || !seedConfirmBtn || !seedCancelBtn) return;
  seedListEl.innerHTML = '';
  const s = state.seeds || {};
  const keys = Object.keys(s).filter(k => (s[k]||0) > 0);
  if(keys.length === 0){ showToast('Keine Samen vorhanden.'); return; }
  keys.forEach(id => {
    const strain = getStrain(id);
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <div class="shop-left">
        <div class="shop-icon">${strain.tag || '??'}</div>
        <div>
          <div class="shop-name">${strain.name || id}</div>
          <div class="shop-desc">Bestand: ${(s[id]||0)}</div>
        </div>
      </div>
      <button class="secondary" data-choose="${id}">Auswaehlen</button>
    `;
    div.querySelector('button').addEventListener('click', () => {
      _seedSelect.id = id;
      Array.from(seedListEl.querySelectorAll('.shop-item')).forEach(n => n.classList.remove('active'));
      div.classList.add('active');
      seedConfirmBtn.disabled = false;
    });
    seedListEl.appendChild(div);
  });
  seedConfirmBtn.disabled = true;
  seedModal.hidden = false; seedModal.classList.add('show');
}

function closeSeedSelection(){ if(!seedModal) return; seedModal.classList.remove('show'); seedModal.hidden = true; }

  function plantSelectedSeed(){
  if(!_seedSelect || !_seedSelect.id) return;
  const id = _seedSelect.id; const slotIndex = _seedSelect.slot;
  state.seeds[id] = (state.seeds[id]||0) - 1;
  state.plants = state.plants.filter(p => p.slot !== slotIndex);
  state.plants.push(createPlant(id, slotIndex));
  if(typeof addXP === 'function') addXP(10, 'Samen gesetzt');
  renderSlots(); save(); closeSeedSelection(); showToast('Samen gesetzt.');
  try{ checkQuestProgress(); }catch(_e){}
}

function showConfirm(title, text, okLabel, okClass, onOk, cancelLabel, onCancel){
  if(!confirmModal || !confirmOkBtn || !confirmCancelBtn){
    try{
      if(typeof onCancel === 'function') onCancel();
    }catch(_e){}
    return false;
  }
  if(confirmTitleEl) confirmTitleEl.textContent = title || 'Bestaetigen';
  if(confirmTextEl) confirmTextEl.textContent = text || '';
  confirmOkBtn.textContent = okLabel || 'OK';
  confirmOkBtn.className = okClass || 'accent';
  if(confirmCancelBtn) confirmCancelBtn.textContent = cancelLabel || 'Abbrechen';
  const cleanup = () => { confirmModal.classList.remove('show'); confirmModal.hidden = true; confirmOkBtn.onclick = null; confirmCancelBtn.onclick = null; };
  confirmOkBtn.onclick = () => { try{ onOk && onOk(); } finally { cleanup(); } };
  confirmCancelBtn.onclick = () => { try{ onCancel && onCancel(); } finally { cleanup(); } };
  confirmModal.hidden = false; confirmModal.classList.add('show');
  return true;
}

})();


