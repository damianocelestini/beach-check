/*
 * Beach list. Add a beach by adding one object here — nothing else to change.
 *
 *  lat/lon  : the beach itself (used for air temperature, wind, rain)
 *  sea      : [lat, lon] of open water just offshore (used for waves + sea temperature;
 *             the marine model only has data over water, so land coordinates return nothing)
 *  station  : nearest Marine Institute tide-prediction station (stationID)
 *  slope    : ASSUMPTION. Metres of extra sand exposed per 1 m the tide drops.
 *             Flat beaches are high (100+), steep shingle beaches are low (under 20).
 *             These are rough guesses to be replaced with real beach-profile data.
 *  pin      : [lon, lat] where the pin is drawn on the map (nudged apart in crowded areas)
 *  side     : optional 'right' to put the map label on the right of the pin (default: left)
 */
const BEACHES = [
  { id: 'dollymount', name: 'Dollymount Strand', county: 'Dublin',   tag: 'Long, flat strand',   lat: 53.365, lon: -6.150, sea: [53.375, -6.07], station: 'Howth',                 slope: 150, pin: [-5.95, 53.52] },
  { id: 'killiney',   name: 'Killiney Beach',    county: 'Dublin',   tag: 'Steep shingle',       lat: 53.256, lon: -6.108, sea: [53.26, -6.07],  station: 'Bray_Harbour_MODELLED', slope: 10,  pin: [-5.95, 53.17] },
  { id: 'brittas',    name: 'Brittas Bay',       county: 'Wicklow',  tag: 'Dunes, wide sand',    lat: 52.880, lon: -6.060, sea: [52.88, -6.0],   station: 'Arklow',                slope: 60,  pin: [-6.07, 52.88] },
  { id: 'curracloe',  name: 'Curracloe',         county: 'Wexford',  tag: 'Long dune beach',     lat: 52.380, lon: -6.370, sea: [52.38, -6.25],  station: 'Rosslare',              slope: 90,  pin: [-6.30, 52.38] },
  { id: 'tramore',    name: 'Tramore',           county: 'Waterford',tag: 'Big open bay',        lat: 52.158, lon: -7.145, sea: [52.13, -7.15],  station: 'Dunmore',               slope: 70,  pin: [-7.15, 52.16] },
  { id: 'inch',       name: 'Inch Strand',       county: 'Kerry',    tag: 'Sand spit, surf',     lat: 52.140, lon: -10.000, sea: [52.17, -10.0], station: 'Dingle',                slope: 110, pin: [-10.1, 52.13], side: 'right' },
  { id: 'lahinch',    name: 'Lahinch',           county: 'Clare',    tag: 'Surf beach',          lat: 52.933, lon: -9.350, sea: [52.93, -9.45],  station: 'Lahinch_MODELLED',      slope: 40,  pin: [-9.34, 52.93] },
  { id: 'salthill',   name: 'Salthill',          county: 'Galway',   tag: 'Promenade beach',     lat: 53.258, lon: -9.080, sea: [53.25, -9.1],   station: 'Galway',                slope: 20,  pin: [-9.08, 53.26] },
  { id: 'strandhill', name: 'Strandhill',        county: 'Sligo',    tag: 'Surf beach',          lat: 54.270, lon: -8.600, sea: [54.28, -8.7],   station: 'Sligo',                 slope: 80,  pin: [-8.70, 54.35] }
];

// Used until the visitor taps "Use my location".
const DEFAULT_USER = { lat: 53.3498, lon: -6.2603, label: 'Dublin city centre', isDefault: true };
