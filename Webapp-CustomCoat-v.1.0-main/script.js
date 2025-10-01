
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
  const fmtMoney = n => 'EUR ' + fmt(n);
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
    { id:'gelato',  name:'Green Gelato',  tag:'GG', cost:50,  yield:50,  grow:120, desc:'Schnell und aromatisch', base:'assets/plants/greengelato', stages:['wachstum0','wachstum1','wachstum2','wachstum3','wachstum4','ende'] },
    { id:'zushi',   name:'Blue Zushi',    tag:'BZ', cost:320, yield:90,  grow:180, desc:'Frischer Hybrid' },
    { id:'honey',   name:'Honey Cream',   tag:'HC', cost:540, yield:150, grow:210, desc:'Cremige Indica' },
    { id:'amnesia', name:'Amnesia Haze',  tag:'AH', cost:900, yield:240, grow:260, desc:'Klassische Sativa' },
    { id:'gorilla', name:'Gorilla Glue',  tag:'GL', cost:1500,yield:360, grow:320, desc:'Harzige Power' },
    { id:'zkittle', name:'Zkittlez',      tag:'ZK', cost:2300,yield:520, grow:360, desc:'Suesser Regenbogen' },
  ];

  const GLOBAL_UPGRADES = [
    { id:'lights', name:'LED-Growlights', baseCost:100, inc:0.15, desc:'Alle Pflanzen +15% Ertrag je Stufe' },
    { id:'nutrients', name:'Naehrstoff-Booster', baseCost:250, inc:0.20, desc:'Alle Pflanzen +20% je Stufe' },
    { id:'climate', name:'Klimasteuerung', baseCost:800, inc:0.35, desc:'Alle Pflanzen +35% je Stufe' },
    { id:'automation', name:'Automatisierung', baseCost:2500, inc:0.50, desc:'Alle Pflanzen +50% je Stufe' },
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
    { id:'thermometer', name:'Thermometer', icon:'TM', cost:90, desc:'Leicht besseres Klima', category:'equipment', effects:{ pestReduce:{ mold:0.95, thrips:0.95 } } }
  ];

  // Research (Forschungsbaum)
  const RESEARCH_NODES = [
    { id:'bio1', name:'Botanik I', desc:'+10% Ertrag', cost:1, group:'yield', value:0.10, requires:[] },
    { id:'bio2', name:'Botanik II', desc:'+10% Ertrag', cost:2, group:'yield', value:0.10, requires:['bio1'] },
    { id:'climate1', name:'Klima I', desc:'+10% Wachstum', cost:1, group:'growth', value:0.10, requires:[] },
    { id:'process1', name:'Verarbeitung I', desc:'+10% Qualitaet', cost:1, group:'quality', value:0.10, requires:[] },
    { id:'auto1', name:'Automatisierung I', desc:'-20% Wasserverbrauch', cost:1, group:'water', value:0.20, requires:[] },
    { id:'pest1', name:'Schaedlingskontrolle I', desc:'-25% Befallsrisiko', cost:1, group:'pest', value:0.25, requires:[] },
  ];

  // Pests
  const PESTS = [
    { id:'mites', name:'Spinnmilben', icon:'???', base: 0.02, effect:{ growth:0.6, health:-2, quality:-0.01 }, prefers:'dry' },
    { id:'mold',  name:'Schimmel',    icon:'??', base: 0.015, effect:{ growth:0.3, health:-3, quality:-0.03 }, prefers:'wet' },
    { id:'thrips',name:'Thripse',     icon:'??', base: 0.018, effect:{ growth:0.8, health:-1, quality:-0.008 }, prefers:'any' },
  ];

  // Neues Forschungsmodell: 4 Branches mit Kacheln
  const RESEARCH_BRANCHES = [
    { id:'lamp', name:'Lampen', icon:'L', nodes:[
      { id:'lamp1', name:'LED Tuning I', cost:1, effects:{ growth:0.10 } },
      { id:'lamp2', name:'Lichtmanagement', cost:2, effects:{ growth:0.10, yield:0.05 } },
      { id:'lamp3', name:'Spektrum Pro', cost:3, effects:{ growth:0.10, yield:0.10 } },
    ]},
    { id:'vent', name:'Lueftung', icon:'V', nodes:[
      { id:'vent1', name:'Luftstrom I', cost:1, effects:{ pest:0.10 } },
      { id:'vent2', name:'Abluft+Filter', cost:2, effects:{ pest_mold:0.15, quality:0.05 } },
      { id:'vent3', name:'Zuluft-Automatik', cost:3, effects:{ pest:0.10, growth:0.05 } },
    ]},
    { id:'elec', name:'Elektrik', icon:'E', nodes:[
      { id:'elec1', name:'Energie-Monitor', cost:1, effects:{ cost:0.15 } },
      { id:'elec2', name:'Effizienz I', cost:2, effects:{ cost:0.15 } },
      { id:'elec3', name:'Effizienz II', cost:3, effects:{ cost:0.20 } },
    ]},
    { id:'fan', name:'Ventilator', icon:'F', nodes:[
      { id:'fan1', name:'Schwingventilator', cost:1, effects:{ pest_mold:0.10 } },
      { id:'fan2', name:'Stroemungslehre', cost:2, effects:{ growth:0.05, quality:0.05 } },
      { id:'fan3', name:'EC-Upgrade', cost:3, effects:{ pest_mold:0.15, pest:0.10 } },
    ]},
  ];

  // Grow-Raeume (Immobilien)
  const GROW_ROOMS = [
    { id:'closet', name:'Abstellkammer', slots:2, cost:0, exhaust:false, moldRisk:1.6 },
    { id:'room', name:'Zimmer (Fenster)', slots:4, cost:1200, exhaust:true, moldRisk:1.2 },
    { id:'basement', name:'Kellerraeume', slots:6, cost:3500, exhaust:true, moldRisk:1.0 },
    { id:'garage', name:'Garage', slots:8, cost:8000, exhaust:true, moldRisk:0.95 },
    { id:'warehouse', name:'Lagerhalle', slots:12, cost:20000, exhaust:true, moldRisk:0.9 },
  ];

  const MAX_SLOTS = 12;
  const SAVE_KEY = 'cannabis_idle_farm_v2';
  const BASE_PRICE_PER_G = 2;
  const OFFER_SPAWN_MIN = 45;
  const OFFER_SPAWN_MAX = 90;
  const MAX_ACTIVE_OFFERS_BASE = 3;

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
  // Globaler Drossel-Faktor fuer SchAedlings-Spawns (z. B. 0.25 = 25% der bisherigen Haeufigkeit)
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
    timeSpeed:1,
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
    sidebarCollapsed:false
  };

  function getStrain(id){
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
    return base * levelMult * (1 + (res.yield||0)) * globalMultiplier();
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
    return statuses.join(' � ');
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
    if(healthEl) healthEl.textContent = `${Math.round(plant.health)}%`;
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
      const pest = PESTS.find(p => p.id === plant.pest.id) || {icon:'??', name:'Schaedlinge'};
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
    return isFinite(t) ? t : 1;
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
      state.plants = Array.isArray(loaded.plants) ? loaded.plants : [];
      state.purchasedCount = loaded.purchasedCount || {};
      state.upgrades = loaded.upgrades || {};
      state.offers = Array.isArray(loaded.offers) ? loaded.offers : [];
      state.itemsOwned = loaded.itemsOwned || {};
      state.seeds = loaded.seeds || {};
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
      if(typeof state.timeSpeed !== 'number' || !isFinite(state.timeSpeed)) state.timeSpeed = 1;
      if(typeof state.gameDaysTotal !== 'number' || !isFinite(state.gameDaysTotal)) state.gameDaysTotal = 0;
      if(typeof loaded.growTierIndex === 'number') state.growTierIndex = loaded.growTierIndex; else state.growTierIndex = state.growTierIndex || 0;
      if(typeof loaded.slotsUnlocked === 'number') state.slotsUnlocked = loaded.slotsUnlocked; else state.slotsUnlocked = Math.min(2, state.slotsUnlocked||2);
      if(typeof loaded.sidebarCollapsed === 'boolean') state.sidebarCollapsed = loaded.sidebarCollapsed;
      ensureConsumables();
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
      let growthFactor = d.growth;
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
    // Phase ermitteln: Bluete nur fuer bestimmte SchAedlinge
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
      // Wurzelfaeule bei Ueberwaesserung wahrscheinlicher
      let r1 = (EXTRA_PESTS.root_rot.base || 0.006) * dt * (PEST_GLOBAL_RATE || 1);
      r1 *= (waterRatio > 0.9 ? 6 : 0.1);
      if(Math.random() < r1){ plant.pest = { id:'root_rot', sev:1 }; return; }
      // Faule Blaetter bei Ueberduengung wahrscheinlicher
      let r2 = (EXTRA_PESTS.leaf_rot.base || 0.008) * dt * (PEST_GLOBAL_RATE || 1);
      r2 *= (nutrientRatio > 0.9 ? 5 : 0.1);
      if(Math.random() < r2){ plant.pest = { id:'leaf_rot', sev:1 }; return; }
    }
  }

  function pestRiskModifiers(){
    const m = { mites:1, mold:1, thrips:1 };
    // Research effects reduce risks globally
    try{
      const eff = (typeof researchEffectsV2 === 'function') ? researchEffectsV2() : (typeof researchEffects === 'function' ? researchEffects() : {});
      const general = Math.max(0, 1 - (eff.pest||0));
      m.mites *= general; m.mold *= general; m.thrips *= general;
      if(eff.pest_mold) m.mold *= Math.max(0, 1 - eff.pest_mold);
    }catch(_e){}
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

  function currentGrowRoom(){ return GROW_ROOMS[Math.max(0, Math.min(GROW_ROOMS.length-1, state.growTierIndex||0))]; }
  function currentMaxSlots(){ const r = currentGrowRoom(); return Math.min(MAX_SLOTS, (r?.slots)||2); }
  if(slotMaxEl) slotMaxEl.textContent = currentMaxSlots();

  function showToast(message){
    if(!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1500);
  }

  // Header announcement bar
  let announceTimer = null;
  function showAnnouncement(msg, dur=4000){
    const bar = document.getElementById('announceBar');
    if(!bar) return;
    bar.textContent = msg;
    bar.hidden = false;
    bar.classList.add('show');
    if(announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      bar.classList.remove('show');
      setTimeout(() => { bar.hidden = true; }, 350);
    }, dur);
  }

  function renderResources(){
    const gramsText = fmt(state.grams) + ' g';
    gramsEls.forEach(el => { if(el) el.textContent = gramsText; });
    const perSecText = fmt(computePerSec()) + ' g/s';
    perSecEls.forEach(el => { if(el) el.textContent = perSecText; });
    if(cashEl) cashEl.textContent = fmtMoney(state.cash);
    if(levelEl) levelEl.textContent = 'Lvl ' + (state.level||1);
    renderXPBar();
    prestigeEls.points.textContent = String(state.hazePoints);
    renderConsumables();
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
  }

  function setTimeSpeed(mult){
    // erlaubte Werte: 0, 0.5, 1, 2, 7
    const allowed = [0, 0.5, 1, 2, 7];
    let sel = parseFloat(mult);
    if(!allowed.includes(sel)) sel = 1;
    state.timeSpeed = sel;
    renderGameTime();
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
        state.cash -= cost;
        showToast(`Monatskosten bezahlt: -${fmtMoney(cost)}`);
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
    // Zeige exakt so viele Plaetze wie der aktuelle Raum hat
    const cap = currentMaxSlots();
    const unlocked = cap;

    slotsEl.innerHTML = '';
    for(let i = 0; i < unlocked; i++){
      const plant = state.plants.find(p => p.slot === i);
      const cell = document.createElement('div');
      cell.className = 'slot';
      if(plant){
        ensurePlantDefaults(plant);
        const tpl = $('#tpl-plant-card');
        const card = tpl.content.firstElementChild.cloneNode(true);
        const strain = getStrain(plant.strainId);
        card.dataset.slot = String(i);
        card.querySelector('[data-icon]').textContent = strain.tag;
        card.querySelector('[data-name]').textContent = strain.name;
        updatePlantCard(card, plant);
        card.querySelector('[data-upgrade]').addEventListener('click', () => upgradePlant(i));
        card.querySelector('[data-remove]').addEventListener('click', () => removePlant(i));
        card.querySelector('[data-harvest]').addEventListener('click', () => harvestPlant(i));
        const waterBtn = card.querySelector('[data-water-btn]');
        if(waterBtn) waterBtn.addEventListener('click', () => waterPlant(i));
        const feedBtn = card.querySelector('[data-feed-btn]');
        if(feedBtn){
          // Inline SVG icon (white via currentColor)
          feedBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" role="img"><path d="M9 3h6v2l-1 1v4.2l4.43 7.38A3 3 0 0 1 15.84 21H8.16a3 3 0 0 1-2.59-3.42L10 10.2V6L9 5V3Zm1.94 9-3.7 6.16A1 1 0 0 0 8.16 19h7.68a1 1 0 0 0 .86-1.54L13.94 12h-3Z"></path></svg>';
          feedBtn.addEventListener('click', () => feedPlant(i));
        }
        const pb = card.querySelector('[data-pest-btn]');
        if(pb) pb.addEventListener('click', () => treatPlant(i));
        cell.appendChild(card);
      }else{
        cell.classList.add('center');
        const btn = document.createElement('button');
        btn.className = 'secondary';
        btn.textContent = 'Pflanze setzen';
        btn.addEventListener('click', () => openShopForSlot(i));
        const label = document.createElement('div');
        label.className = 'slot-label';
        label.textContent = `Slot ${i + 1}`;
        label.style.position = 'absolute';
        label.style.bottom = '8px';
        label.style.left = '10px';
        label.style.fontSize = '12px';
        cell.appendChild(btn);
        cell.appendChild(label);
      }
      slotsEl.appendChild(cell);
    }
    if(slotCountEl) slotCountEl.textContent = String(state.plants.length||0);
    if(slotMaxEl) slotMaxEl.textContent = currentMaxSlots();
    if(unlockCostEl){ unlockCostEl.textContent = '? Immobilien fuer mehr Plaetze'; }
  }

  // Jobs
  const JOBS = [
    { id:'helper', name:'Aushilfe', salary:120, base:0.75, reqLevel:1 },
    { id:'courier', name:'Kurier', salary:160, base:0.72, reqLevel:1 },
    { id:'bar', name:'Barhilfe', salary:180, base:0.70, reqLevel:1 },
    { id:'store', name:'Ladenhilfe', salary:200, base:0.65, reqLevel:2 },
    { id:'call', name:'Callcenter', salary:240, base:0.6, reqLevel:2 },
    { id:'security', name:'Security', salary:280, base:0.55, reqLevel:3 },
    { id:'assistant', name:'Assistent', salary:340, base:0.5, reqLevel:3 },
    { id:'driver', name:'Fahrer', salary:400, base:0.45, reqLevel:4 },
    { id:'lab', name:'Laborhilfe', salary:500, base:0.4, reqLevel:5 },
    { id:'tech', name:'Techniker', salary:650, base:0.35, reqLevel:6 },
    { id:'admin', name:'BUero', salary:700, base:0.33, reqLevel:7 },
    { id:'foreman', name:'Vorarbeiter', salary:850, base:0.3, reqLevel:8 },
    { id:'manager', name:'Manager', salary:1000, base:0.25, reqLevel:9 },
    { id:'senior', name:'Senior', salary:1300, base:0.2, reqLevel:10 },
    { id:'exec', name:'Executive', salary:1700, base:0.15, reqLevel:12 },
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
    // Pflanzenschutz Packs
    { id:'spray_s', name:'Pflanzenspray S', icon:'fi fi-sr-bug', price:9, desc:'1x gegen Insekten', add:{ spray:1 } },
    { id:'spray_m', name:'Pflanzenspray M', icon:'fi fi-sr-bug', price:24, desc:'3x gegen Insekten', add:{ spray:3 } },
    { id:'fungi_s', name:'Fungizid S', icon:'fi fi-sr-shield-plus', price:11, desc:'1x gegen Schimmel', add:{ fungicide:1 } },
    { id:'fungi_m', name:'Fungizid M', icon:'fi fi-sr-shield-plus', price:30, desc:'3x gegen Schimmel', add:{ fungicide:3 } },
    { id:'beneficial_s', name:'Nuetzlinge S', icon:'fi fi-sr-leaf', price:14, desc:'1x biologische Abwehr', add:{ beneficials:1 } },
    { id:'beneficial_m', name:'Nuetzlinge M', icon:'fi fi-sr-leaf', price:36, desc:'3x biologische Abwehr', add:{ beneficials:3 } }
  ];

  function renderJobs(){
    const wrap = document.getElementById('jobsList');
    if(!wrap) return;
    wrap.innerHTML = '';
    const lvl = state.level || 1;
    JOBS.forEach(job => {
      const owned = state.jobId === job.id;
      const div = document.createElement('div');
      div.className = 'upgrade';
      const chance = Math.round(job.base * Math.min(1, (lvl / Math.max(1, job.reqLevel))) * 100);
      div.innerHTML = `
        <div class="upg-left">
          <div class="upg-name">${job.name}</div>
          <div class="upg-level">Gehalt: ${fmtMoney(job.salary)} / Monat � Anforderung: Lvl ${job.reqLevel}</div>
          <div class="hint">Erfolgschance Bewerbung ca. ${chance}%</div>
        </div>
        <button class="secondary" ${owned?'disabled':''} data-apply-job="${job.id}">${owned?'Angestellt':'Bewerben'}</button>
      `;
      const btn = div.querySelector('button');
      if(!owned){
        btn.addEventListener('click', () => confirmApply(job.id));
      }
      wrap.appendChild(div);
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
        if(accepted){ state.jobId = job.id; pushMessage(`Bewerbung bei ${job.name}: Angenommen!`); showAnnouncement(`Job erhalten: ${job.name}`); }
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
      node.textContent = m.text;
      wrap.appendChild(node);
    }
  }

  function pushMessage(text){
    const id = (state.nextMsgId||1);
    state.nextMsgId = id + 1;
    state.messages = state.messages || [];
    state.messages.push({ id, text, ts: Date.now() });
  }

  function renderShop(selectedSlot){
    if(!shopEl) return;
    shopEl.innerHTML = '';
    for(const strain of STRAINS){
      const cost = strainPurchaseCost(strain.id);
      const card = document.createElement('div');
      card.className = 'shop-item';
      const duration = strain.grow || 180;
      const mm = Math.floor(duration / 60);
      const ss = duration % 60;
      card.innerHTML = `
        <div class="shop-left">
          <div class="shop-icon">${strain.tag}</div>
          <div>
            <div class="shop-name">${strain.name}</div>
            <div class="shop-desc">${strain.desc} � Ernte: ${Math.round(strain.yield)} g � Dauer: ${mm}:${String(ss).padStart(2,'0')}</div>
          </div>
        </div>
        <button class="accent" data-buy="${strain.id}">Kaufen (${fmtMoney(cost)})</button>
      `;
      card.querySelector('button').addEventListener('click', () => buyPlant(strain.id, selectedSlot));
      shopEl.appendChild(card);
      // Keine HR-Linien in Grid-Layout zwischen Karten (verursacht Verschiebungen)
      // Zusatz: Wochenanzeige (Spielzeit) in Beschreibung hinzufuegen
      try{
        const desc = card.querySelector('.shop-desc');
        if(desc){ desc.textContent = desc.textContent + ' (~ ' + strainWeeks(strain) + ' Wochen)'; }
      }catch(_e){}
    }
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
        <div class="upg-left">
          <div class="upg-name">${up.name}</div>
          <div class="upg-level">Stufe ${lvl} � Bonus +${Math.round(up.inc*100)}%</div>
          <div class="hint">${up.desc}</div>
        </div>
        <button class="secondary" data-upg="${up.id}">Kaufen (${fmt(cost)} g)</button>
      `;
      node.querySelector('button').addEventListener('click', () => buyUpgrade(up.id));
      upgListEl.appendChild(node);
    }
    const nextHaze = calcPrestigeGain(state.totalEarned);
    prestigeEls.owned.textContent = String(state.hazePoints);
    prestigeEls.gain.textContent = String(nextHaze);
    prestigeEls.bonus.textContent = 'x' + (1 + 0.05 * Math.sqrt(state.hazePoints || 0)).toFixed(2);
  }

  // Immobilien (Grow-Raeume)
  function renderEstate(){
    const wrap = document.getElementById('estateList');
    if(!wrap) return;
    wrap.innerHTML = '';
    const curIdx = state.growTierIndex || 0;
    GROW_ROOMS.forEach((r, idx) => {
      const owned = idx <= curIdx;
      const node = document.createElement('div');
      node.className = 'upgrade';
      node.innerHTML = `
        <div class="upg-left">
          <div class="upg-name">${r.name}</div>
          <div class="upg-level">KapazitAet: ${r.slots} Slots ${!r.exhaust ? ' � keine Abluft' : ''}</div>
          <div class="hint">${owned ? 'Besitzt' : 'Kosten: '+fmtMoney(r.cost)}</div>
        </div>
        <button class="secondary" ${owned?'disabled':''} data-estate="${r.id}">${owned?'Aktiv':'Kaufen'}</button>
      `;
      const btn = node.querySelector('button');
      if(!owned){
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

  // Research UI under its own tab or can be reused elsewhere
  function researchAvailable(){
    // simple derivation: 1 point per 500 g lifetime + haze points
    const totalPoints = Math.floor((state.totalEarned||0) / 500) + (state.hazePoints||0);
    const spent = RESEARCH_NODES.reduce((s,n)=> s + (state.research?.[n.id] ? n.cost : 0), 0);
    return Math.max(0, totalPoints - spent);
  }

  function researchEffects(){
    const res = state.research || {};
    const eff = { yield:0, growth:0, quality:0, pest:0, water:0 };
    for(const n of RESEARCH_NODES){
      if(res[n.id]){
        if(n.group==='yield') eff.yield += n.value;
        if(n.group==='growth') eff.growth += n.value;
        if(n.group==='quality') eff.quality += n.value;
        if(n.group==='pest') eff.pest += n.value;
        if(n.group==='water') eff.water += n.value;
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
    // optional header showing totals
    const totals = document.createElement('div');
    totals.className = 'hint';
    totals.textContent = `Aktive Boni - Ertrag +${Math.round(eff.yield*100)}%, Wachstum +${Math.round(eff.growth*100)}%, Qualitaet +${Math.round(eff.quality*100)}%, Risiko -${Math.round(eff.pest*100)}%, Wasser -${Math.round(eff.water*100)}%`;
    wrap.appendChild(totals);
    for(const node of RESEARCH_NODES){
      const owned = !!(state.research && state.research[node.id]);
      const div = document.createElement('div');
      div.className = 'upgrade';
      const prereqOk = (node.requires||[]).every(id => state.research?.[id]);
      div.innerHTML = `
        <div class="upg-left">
          <div class="upg-name">${node.name}</div>
          <div class="upg-level">Kosten ${node.cost} � ${node.desc}</div>
          <div class="hint">${prereqOk ? '' : 'Benoetigt: ' + (node.requires||[]).join(', ')}</div>
        </div>
        <button class="secondary" ${owned?'disabled':''} data-research="${node.id}">${owned?'Erforscht':'Freischalten'}</button>
      `;
      const btn = div.querySelector('button');
      if(!owned){
        btn.disabled = researchAvailable() < node.cost || !prereqOk;
        btn.addEventListener('click', () => buyResearch(node.id));
      }
      wrap.appendChild(div);
    }
  }

  function buyResearch(id){
    const node = RESEARCH_NODES.find(n=>n.id===id);
    if(!node) return;
    if(state.research?.[id]) return;
    const prereqOk = (node.requires||[]).every(r=> state.research?.[r]);
    if(!prereqOk){ showToast('Voraussetzungen fehlen.'); return; }
    if(researchAvailable() < node.cost){ showToast('Nicht genug Forschungspunkte.'); return; }
    state.research = state.research || {};
    state.research[id] = 1;
    renderResearch();
    save();
  }

  function renderTrade(){
    const base = BASE_PRICE_PER_G * (state.marketMult || 1);
    const mult = itemPriceMultiplier();
    if(basePriceEl) basePriceEl.textContent = fmtMoney(base) + '/g';
    if(saleMultEl) saleMultEl.textContent = 'x' + mult.toFixed(2);
    // Quality factor
    const avgQ = (state.qualityPool.grams||0) > 0 ? (state.qualityPool.weighted/state.qualityPool.grams) : 1;
    const qMult = saleQualityMultiplier(avgQ);
    const eff = base * mult * qMult;
    const qEl = (typeof document !== 'undefined') ? document.getElementById('qualityMult') : null;
    if(qEl) qEl.textContent = 'x' + qMult.toFixed(2);
    if(effectivePriceEl) effectivePriceEl.textContent = fmtMoney(eff) + '/g';
    if(sell10Btn) sell10Btn.disabled = state.grams < 10;
    if(sell100Btn) sell100Btn.disabled = state.grams < 100;
    if(sellMaxBtn) sellMaxBtn.disabled = state.grams < 1;
    renderOffers();
    renderOrders();
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
      showToast('Inspektion! Verkaufspreise vorUebergehend reduziert.');
    }else{
      state.marketEventName = 'Hype';
      state.marketMult = 1.25;
      state.marketTimer = 25 + Math.random()*20; // 25-45s
      showToast('Hype! Verkaufspreise vorUebergehend erhoeht.');
    }
    state.nextMarketEventIn = 90 + Math.random()*120; // next event 1.5-3.5 min
    renderTrade();
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
            <div>Preis: <strong>${fmtMoney(offer.pricePerG)}</strong> � Gesamt: <strong>${fmtMoney(total)}</strong></div>
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
      node.innerHTML = `
        <div class="shop-left">
          <div class="shop-icon"><i class="${iconClass}"></i></div>
          <div>
            <div class="shop-name">${it.name}</div>
            <div class="shop-desc">${it.desc}</div>
          </div>
        </div>
        <button class="secondary" data-buy-item="${it.id}">Kaufen (${fmtMoney(it.cost)})</button>
      `;
      const btn = node.querySelector('button');
      btn.disabled = !canBuyItem(it);
      btn.addEventListener('click', () => buyItem(it.id));
      itemShopEl.appendChild(node);
    };

    const addPackCard = (p) => {
      const node = document.createElement('div');
      node.className = 'shop-item';
      node.innerHTML = `
        <div class="shop-left">
          <div class="shop-icon"><i class="${p.icon}"></i></div>
          <div>
            <div class="shop-name">${p.name}</div>
            <div class="shop-desc">${p.desc}</div>
          </div>
        </div>
        <button class="secondary" data-buy-pack="${p.id}">Kaufen (${fmtMoney(p.price)})</button>
      `;
      const btn = node.querySelector('button');
      btn.disabled = (state.cash||0) < p.price;
      btn.addEventListener('click', () => buyConsumablePack(p.id));
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
      buyWaterBtn.textContent = `Kaufen (EUR ${WATER_CONSUMABLE_PRICE})`;
    }
    if(buyNutrientBtn){
      buyNutrientBtn.disabled = state.cash < NUTRIENT_CONSUMABLE_PRICE;
      buyNutrientBtn.textContent = `Kaufen (EUR ${NUTRIENT_CONSUMABLE_PRICE})`;
    }
    if(buySprayBtn){ buySprayBtn.disabled = state.cash < 9; buySprayBtn.textContent = 'Kaufen (EUR 9)'; }
    if(buyFungicideBtn){ buyFungicideBtn.disabled = state.cash < 11; buyFungicideBtn.textContent = 'Kaufen (EUR 11)'; }
    if(buyBeneficialBtn){ buyBeneficialBtn.disabled = state.cash < 14; buyBeneficialBtn.textContent = 'Kaufen (EUR 14)'; }
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
    const owned = ITEMS.filter(it => (state.itemsOwned[it.id] || 0) > 0);
    if(owned.length > 0){
      const toolsHeader = document.createElement('div');
      toolsHeader.className = 'hint';
      toolsHeader.textContent = 'Gegenstaende';
      try{ toolsHeader.style.gridColumn = '1 / -1'; }catch(_e){}
      inventoryEl.appendChild(toolsHeader);
      try{ const hr0 = document.createElement('hr'); hr0.className = 'sep'; hr0.style.cssText = 'border:0;border-top:1px solid #444;opacity:.5;margin:6px 0'; hr0.style.gridColumn = '1 / -1'; inventoryEl.appendChild(hr0); }catch(_e){}
      for(const it of owned){
        const qty = state.itemsOwned[it.id] || 0;
        const sellPrice = Math.round(it.cost * 0.7);
        const node = document.createElement('div');
        node.className = 'shop-item inventory-item';
        node.innerHTML = `
          <div class="shop-left">
            <div class="shop-icon">${it.icon}</div>
            <div>
              <div class="shop-name">${it.name} ${qty>1 ? 'x'+qty : ''}</div>
              <div class="shop-desc">Verkauf: ${fmtMoney(sellPrice)}</div>
            </div>
          </div>
          <button class="ghost danger" data-sell-item="${it.id}">Verkaufen</button>
        `;
        node.querySelector('button').addEventListener('click', () => sellItem(it.id));
        inventoryEl.appendChild(node);
      }
    }
    // Verbrauchsgegenstaende anzeigen (ohne Wasserkanister)
    ensureConsumables();
    const cons = state.consumables || {};
    const consEntries = [
      { key:'nutrient', label:'Naehrstoffe' },
      { key:'pgr', label:'PGR Booster' },
      { key:'spray', label:'Schaedlingsspray' },
      { key:'fungicide', label:'Fungizid' },
      { key:'beneficials', label:'Nuetzlinge' },
    ];
    const consList = consEntries.filter(e => (cons[e.key]||0) > 0);
    const anyCons = consList.length > 0;
    if(anyCons){
      // Trenner zwischen Gruppen, falls Items vorhanden (volle Grid-Breite)
      if(owned.length > 0){ try{ const hrGrp = document.createElement('hr'); hrGrp.className = 'sep'; hrGrp.style.cssText = 'border:0;border-top:1px solid #555;opacity:.6;margin:8px 0'; hrGrp.style.gridColumn = '1 / -1'; inventoryEl.appendChild(hrGrp); }catch(_e){} }
      const cHeader = document.createElement('div');
      cHeader.className = 'hint';
      cHeader.textContent = 'Verbrauchsgegenstaende';
      try{ cHeader.style.gridColumn = '1 / -1'; }catch(_e){}
      inventoryEl.appendChild(cHeader);
      try{ const hrc = document.createElement('hr'); hrc.className = 'sep'; hrc.style.cssText = 'border:0;border-top:1px solid #444;opacity:.5;margin:6px 0'; hrc.style.gridColumn = '1 / -1'; inventoryEl.appendChild(hrc); }catch(_e){}
      for(let i=0;i<consList.length;i++){
        const e = consList[i];
        const cnt = cons[e.key] || 0;
        const node = document.createElement('div');
        node.className = 'shop-item inventory-item';
        node.innerHTML = `
          <div class="shop-left">
            <div class="shop-icon">VC</div>
            <div>
              <div class="shop-name">${e.label}</div>
              <div class="shop-desc">Bestand: ${cnt}</div>
            </div>
          </div>
        `;
        inventoryEl.appendChild(node);
      }
    }
    if(owned.length === 0 && !anyCons){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Keine Artikel vorhanden.';
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
  showToast("Keine Samen. Oeffne Growmarkt -");
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
    if(state.consumables.water <= 0){ showToast('Kein Wasserkanister verfUegbar.'); return; }
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
    if(state.consumables.nutrient <= 0){ showToast('Kein DUengerpaket verfUegbar.'); return; }
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
    if(!plant || !plant.pest){ showToast('Keine SchAedlinge vorhanden.'); return; }
    ensureConsumables();
    const type = plant.pest.id;
    if(type === 'mold' || type === 'root_rot' || type === 'leaf_rot'){
      if(state.consumables.fungicide > 0){
        state.consumables.fungicide -= 1;
        plant.pest = null;
        spawnBurst(slotIndex, '???', 6);
      } else { showToast('Fungizid benoetigt.'); return; }
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
    if(state.grams < cost){ showToast('Nicht genug Ertrag.'); return; }
    state.grams -= cost;
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
        feedBtn.title = 'Kein DUengerpaket - im Handel kaufen';
      }else{
        feedBtn.disabled = false;
        feedBtn.title = `Duengen (Pakete: ${nutrientCharges})`;
      }
    }
    if(pestBtn){
      const infected = !!plant.pest;
      pestBtn.disabled = !(infected && anyPestCharges > 0);
      pestBtn.title = infected ? (anyPestCharges>0 ? 'Abwehr einsetzen' : 'Keine Abwehr vorraetig') : 'Keine SchAedlinge';
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
    el.textContent = text;
    el.style.top = '45%';
    fx.appendChild(el);
    setTimeout(() => el.remove(), 900);
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

  function renderAll(){
    renderSlots();
    renderShop();
    renderResources();
    renderUpgrades();
    renderStats();
    renderTrade();
    renderSettings();
    renderResearch();
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
            <div>${strain.name} � Preis: <strong>${fmtMoney(o.pricePerG)}</strong> � Gesamt: <strong>${fmtMoney(total)}</strong></div>
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
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
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
      });
    });
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

    // Bewerbungen auswerten (Antwort nach 3 Tagen)
    try{ processApplications(); }catch(_e){}
    // Monatsgehalt sicherstellen (falls Monatswechsel verpasst)
    try{
      const idx = (currentYear()-1)*12 + monthFromDayOfYear(currentDayOfYear());
      if(state._salaryIdx == null) state._salaryIdx = idx;
      if(idx !== state._salaryIdx){
        const inc = monthlyIncome();
        if(inc > 0){ state.cash += inc; pushMessage('Gehalt erhalten: ' + fmtMoney(inc)); }
        state._salaryIdx = idx;
      }
    }catch(_e){}

    updateOfferTimers();
    updateOrderTimers();
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
          const msg = (state.marketEventName||'') === 'Inspektion' ? 'Inspektion! Preise kurzzeitig reduziert' : 'Hype! Preise kurzzeitig erhoeht';
          showAnnouncement(msg);
        }catch(_e){}
      }
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
    const prestigeBtn = $('#prestigeBtn');
    if(prestigeBtn) prestigeBtn.addEventListener('click', doPrestige);
    if(sell10Btn) sell10Btn.addEventListener('click', () => quickSell(10));
    if(sell100Btn) sell100Btn.addEventListener('click', () => quickSell(100));
    if(sellMaxBtn) sellMaxBtn.addEventListener('click', () => quickSell(Math.floor(state.grams * 0.5)));
    if(buyWaterBtn) buyWaterBtn.addEventListener('click', () => buyConsumable('water'));
    if(buyNutrientBtn) buyNutrientBtn.addEventListener('click', () => buyConsumable('nutrient'));
    if(buySprayBtn) buySprayBtn.addEventListener('click', () => buyConsumable('spray'));
    if(buyFungicideBtn) buyFungicideBtn.addEventListener('click', () => buyConsumable('fungicide'));
    if(buyBeneficialBtn) buyBeneficialBtn.addEventListener('click', () => buyConsumable('beneficial'));
    if(speedSelect) speedSelect.addEventListener('change', () => setTimeSpeed(parseFloat(speedSelect.value)));
    if(diffEasy) diffEasy.addEventListener('click', () => setDifficulty('easy'));
    if(diffNormal) diffNormal.addEventListener('click', () => setDifficulty('normal'));
    if(diffHard) diffHard.addEventListener('click', () => setDifficulty('hard'));
    setInterval(renderStats, 1000);
  }

  function start(){
    load();
    applyOfflineProgress();
    ensureConsumables();
    applyTheme();
    initSidebar();
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
    // Switch research functions to new tree before first render
    try{
      if(typeof researchEffectsV2 === 'function'){ researchEffects = researchEffectsV2; }
      if(typeof researchAvailableV2 === 'function'){ researchAvailable = researchAvailableV2; }
      if(typeof renderResearchV2 === 'function'){ renderResearch = renderResearchV2; }
      if(typeof buyResearchV2 === 'function'){ buyResearch = buyResearchV2; }
    }catch(_e){}
    initThemeToggle();
    initTabs();
    bindGlobal();
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
    requestAnimationFrame(ts => {
      lastTick = ts;
      requestAnimationFrame(loop);
    });
    window.addEventListener('beforeunload', save);
  }

start();

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

// Jobs: limit applications to 2, grey-out locked, add header with current job
function enhanceJobsUI(){
  try{
    const wrap = document.getElementById('jobsList');
    if(!wrap) return;
    // Header
    const current = (JOBS.find(j=>j.id===state.jobId)?.name) || 'Keiner';
    const pendingCount = (state.applications||[]).length;
    const head = document.createElement('div'); head.className = 'hint'; head.textContent = `Aktueller Job: ${current} - Bewerbungen: ${pendingCount}/2`;
    wrap.prepend(head);
    // Grey out locked and disable apply
    const lvl = state.level || 1;
    wrap.querySelectorAll('.upgrade').forEach(div => {
      const btn = div.querySelector('[data-apply-job]');
      if(!btn) return;
      const id = btn.getAttribute('data-apply-job');
      const job = JOBS.find(j=>j.id===id);
      if(!job) return;
      const eligible = lvl >= (job.reqLevel||1);
      if(!eligible){
        div.style.opacity = '0.45';
        div.style.filter = 'grayscale(1)';
        btn.disabled = true;
        btn.title = `Erfordert Lvl ${job.reqLevel}`;
      }
    });
  }catch(_e){}
}

try{
  const __orig_renderJobs = renderJobs;
  renderJobs = function(){
    __orig_renderJobs();
    enhanceJobsUI();
  }
}catch(_e){}

try{
  const __orig_confirmApply = confirmApply;
  confirmApply = function(jobId){
    const apps = state.applications || [];
    if(apps.some(a=>a.jobId===jobId)){ showToast('Bereits beworben.'); return; }
    if(apps.length >= 2){ showToast('Max. 2 Bewerbungen gleichzeitig.'); return; }
    return __orig_confirmApply(jobId);
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
    t.textContent = 'Nachricht';
    p.textContent = text;
    if(cancel) cancel.style.display = 'none';
    m.hidden = false; m.classList.add('show');
    ok.textContent = 'OK'; ok.className = 'accent';
    ok.onclick = function(){ try{ m.classList.remove('show'); m.hidden = true; if(cancel) cancel.style.display = ''; ok.onclick = null; }catch(_e){} };
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
  function researchAvailableV2(){
    const totalPoints = Math.floor((state.totalEarned||0) / 500) + (state.hazePoints||0);
    let spent = 0;
    for(const b of RESEARCH_BRANCHES){
      for(const n of b.nodes){ if(state.research?.[n.id]) spent += n.cost; }
    }
    return Math.max(0, totalPoints - spent);
  }

  function researchEffectsV2(){
    const res = state.research || {};
    const eff = { yield:0, growth:0, quality:0, pest:0, water:0, cost:0, pest_mold:0 };
    for(const b of RESEARCH_BRANCHES){
      for(const n of b.nodes){
        if(res[n.id]){
          const e = n.effects || {};
          eff.yield += e.yield||0;
          eff.growth += e.growth||0;
          eff.quality += e.quality||0;
          eff.pest += e.pest||0;
          eff.water += e.water||0;
          eff.cost += e.cost||0;
          eff.pest_mold += e.pest_mold||0;
        }
      }
    }
    return eff;
  }

  function renderResearchV2(){
    const wrap = document.getElementById('researchList');
    const availEl = document.getElementById('researchAvailable');
    if(availEl) availEl.textContent = String(researchAvailableV2());
    if(!wrap) return;
    wrap.innerHTML = '';
    const eff = researchEffectsV2();
    const totals = document.createElement('div');
    totals.className = 'hint';
    totals.textContent = `Aktive Boni - Ertrag +${Math.round(eff.yield*100)}%, Wachstum +${Math.round(eff.growth*100)}%, Qualitaet +${Math.round(eff.quality*100)}%, Risiko -${Math.round(eff.pest*100)}%`;
    wrap.appendChild(totals);

    const tree = document.createElement('div');
    tree.className = 'research-tree';
    const activeId = window.__activeResearchBranch || RESEARCH_BRANCHES[0].id;
    for(const b of RESEARCH_BRANCHES){
      const ownedCount = b.nodes.filter(n => state.research?.[n.id]).length;
      const card = document.createElement('div');
      card.className = 'branch-card' + (activeId===b.id?' active':'');
      card.dataset.branch = b.id;
      card.innerHTML = `
        <div class="branch-icon">${b.icon}</div>
        <div class="branch-name">${b.name}</div>
        <div class="branch-progress">${ownedCount}/${b.nodes.length}</div>
      `;
      card.addEventListener('click', () => { window.__activeResearchBranch = b.id; renderResearchV2(); });
      tree.appendChild(card);
    }
    wrap.appendChild(tree);

    const nodesWrap = document.createElement('div');
    nodesWrap.className = 'node-grid';
    const active = RESEARCH_BRANCHES.find(x => x.id === (window.__activeResearchBranch || RESEARCH_BRANCHES[0].id));
    for(const n of active.nodes){
      const owned = !!(state.research && state.research[n.id]);
      const node = document.createElement('div');
      node.className = 'node-card';
      node.innerHTML = `
        <div class="node-name">${n.name}</div>
        <div class="node-desc">${formatResearchEffects(n.effects)}</div>
        <button class="secondary" ${owned?'disabled':''} data-node="${n.id}">${owned?'Erforscht':'Freischalten ('+n.cost+')'}</button>
      `;
      const btn = node.querySelector('button');
      if(!owned){
        btn.disabled = researchAvailableV2() < n.cost;
        btn.addEventListener('click', () => buyResearchV2(n.id));
      }
      nodesWrap.appendChild(node);
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
    return items.join(' � ');
  }

  function buyResearchV2(id){
    let found = null;
    for(const b of RESEARCH_BRANCHES){
      const n = b.nodes.find(x=>x.id===id);
      if(n){ found = n; break; }
    }
    if(!found) return;
    if(state.research?.[id]) return;
    if(researchAvailableV2() < found.cost){ showToast('Nicht genug Forschungspunkte.'); return; }
    state.research = state.research || {};
    state.research[id] = 1;
    renderResearchV2();
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

