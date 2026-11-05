/*
 * Beach Check — data + decision logic. No DOM in here, so it can be tested in Node.
 *
 * Data sources (all free, no API key, browser-friendly):
 *   - Open-Meteo Forecast API   : air temp, feels-like, wind, gusts, rain chance
 *   - Open-Meteo Marine API     : wave height, sea temperature
 *   - Marine Institute (Ireland): tide predictions by station, ERDDAP (CC BY 4.0)
 */
(function (root) {
  'use strict';

  const TZ = 'Europe/Dublin';
  const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];
  const pad = (n) => (n < 10 ? '0' : '') + n;

  // ---------- time helpers (everything is shown in Irish local time) ----------
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function localKey(ms) {
    const p = {};
    for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
    return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
  }
  function nowLocal() {
    const k = localKey(Date.now());
    return { date: k.slice(0, 10), hour: parseInt(k.slice(11, 13), 10) };
  }

  // ---------- fetching ----------
  async function getJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + new URL(url).host);
    return r.json();
  }
  const asArray = (x) => (Array.isArray(x) ? x : [x]);
  const indexTimes = (o) => {
    const idx = {};
    o.hourly.time.forEach((t, i) => { idx[t] = i; });
    o.idx = idx;
    return o;
  };

  function tideUrl(station, fromMs, toMs) {
    const iso = (ms) => new Date(ms).toISOString().slice(0, 19) + 'Z';
    const q = 'time,Water_Level&stationID="' + station + '"&time>=' + iso(fromMs) + '&time<=' + iso(toMs);
    return 'https://erddap.marine.ie/erddap/tabledap/IMI-TidePrediction.json?' + encodeURI(q);
  }

  function prepareTide(rows, dates) {
    const series = rows.filter((r) => r[1] != null).map((r) => {
      const ms = Date.parse(r[0]);
      return { ms, key: localKey(ms), lvl: r[1] };
    });
    if (series.length < 50) return null;
    const keyIdx = {};
    series.forEach((s, i) => { keyIdx[s.key] = i; });
    let min = Infinity, max = -Infinity;
    for (const s of series) {
      if (dates.indexOf(s.key.slice(0, 10)) === -1) continue;
      if (s.lvl < min) min = s.lvl;
      if (s.lvl > max) max = s.lvl;
    }
    return { series, keyIdx, min, max };
  }

  async function loadAll(beaches, user) {
    const today = nowLocal().date;
    const tomorrow = localKey(Date.now() + 24 * 3600e3).slice(0, 10);
    const dates = [today, tomorrow];

    const pts = beaches.map((b) => [b.lat, b.lon]).concat([[user.lat, user.lon]]);
    const sea = beaches.map((b) => b.sea);
    const list = (arr, i) => arr.map((p) => p[i].toFixed(3)).join(',');
    const tz = '&timezone=' + encodeURIComponent(TZ) + '&forecast_days=2';

    const wxUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + list(pts, 0) + '&longitude=' + list(pts, 1) +
      '&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation_probability&wind_speed_unit=kmh' + tz;
    const seaUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + list(sea, 0) + '&longitude=' + list(sea, 1) +
      '&hourly=wave_height,sea_surface_temperature' + tz;

    const stations = Array.from(new Set(beaches.map((b) => b.station)));
    const from = Date.parse(dates[0] + 'T00:00:00Z') - 2 * 3600e3;
    const to = Date.parse(dates[1] + 'T23:59:00Z');

    const [wx, marine, ...tideRes] = await Promise.all([
      getJson(wxUrl),
      getJson(seaUrl).catch(() => null),       // waves are nice-to-have; page still works without them
      ...stations.map((s) => getJson(tideUrl(s, from, to)).then((j) => prepareTide(j.table.rows, dates)).catch(() => null))
    ]);

    const tide = {};
    stations.forEach((s, i) => { tide[s] = tideRes[i]; });

    return {
      dates,
      wx: asArray(wx).map(indexTimes),
      sea: marine ? asArray(marine).map(indexTimes) : null,
      tide,
      fetchedAt: Date.now()
    };
  }

  // ---------- tide maths ----------
  function tideAt(t, key, beach) {
    if (!t || t.keyIdx[key] == null) return null;
    const i = t.keyIdx[key];
    const s = t.series;
    const level = s[i].lvl;
    const range = Math.max(0.01, t.max - t.min);
    const f = Math.min(1, Math.max(0, (level - t.min) / range));
    const ahead = s[Math.min(s.length - 1, i + 3)].lvl;
    const behind = s[Math.max(0, i - 3)].lvl;
    const rising = ahead >= behind;

    // next high or low: first local extreme at least 6 samples (30 min) from each side
    let next = null;
    for (let j = i + 1; j < s.length - 6; j++) {
      let isMax = true, isMin = true;
      for (let k = j - 6; k <= j + 6; k++) {
        if (s[k].lvl > s[j].lvl) isMax = false;
        if (s[k].lvl < s[j].lvl) isMin = false;
      }
      if (j - 6 < 0) continue;
      if (isMax && s[j].lvl > s[j - 6].lvl) { next = { type: 'High', at: s[j].key.slice(11) }; break; }
      if (isMin && s[j].lvl < s[j - 6].lvl) { next = { type: 'Low', at: s[j].key.slice(11) }; break; }
    }

    const state = f > 0.8 ? 'High tide' : f < 0.2 ? 'Low tide' : rising ? 'Tide rising' : 'Tide falling';
    const sandM = Math.round((t.max - level) * beach.slope);
    return { level, f, rising, state, next, sandM };
  }

  function tideBars(data, beach, dayIdx) {
    const t = data.tide[beach.station];
    const out = [];
    for (let h = 6; h <= 23; h++) {
      const key = data.dates[dayIdx] + 'T' + pad(h) + ':00';
      const x = tideAt(t, key, beach);
      out.push({ h, f: x ? x.f : null });
    }
    return out;
  }

  // ---------- conditions at one place, one hour ----------
  function pick(o, name, i) {
    if (!o || i == null) return null;
    const v = o.hourly[name][i];
    return v == null ? null : v;
  }
  const r0 = (v) => (v == null ? null : Math.round(v));

  function weatherAt(o, key) {
    const i = o.idx[key];
    return {
      temp: r0(pick(o, 'temperature_2m', i)),
      feels: r0(pick(o, 'apparent_temperature', i)),
      wind: r0(pick(o, 'wind_speed_10m', i)),
      gust: r0(pick(o, 'wind_gusts_10m', i)),
      rain: r0(pick(o, 'precipitation_probability', i))
    };
  }

  function conditions(data, bi, beach, dayIdx, hour) {
    const key = data.dates[dayIdx] + 'T' + pad(hour) + ':00';
    const w = weatherAt(data.wx[bi], key);
    const sIdx = data.sea ? data.sea[bi].idx[key] : null;
    const waveRaw = data.sea ? pick(data.sea[bi], 'wave_height', sIdx) : null;
    const sstRaw = data.sea ? pick(data.sea[bi], 'sea_surface_temperature', sIdx) : null;
    const c = Object.assign({}, w, {
      wave: waveRaw == null ? null : Math.round(waveRaw * 10) / 10,
      sst: r0(sstRaw),
      tide: tideAt(data.tide[beach.station], key, beach)
    });
    c.assess = assess(c);
    return c;
  }

  function userConditions(data, user, dayIdx, hour) {
    const key = data.dates[dayIdx] + 'T' + pad(hour) + ':00';
    return weatherAt(data.wx[data.wx.length - 1], key);
  }

  // ---------- the decision ----------
  // Thresholds are product assumptions, deliberately in one place so they can be tuned.
  const RULES = {
    tide:  { goodAbove: 0.5, watchAbove: 0.3 },     // share of the day's tidal range that is covered by water
    wind:  { goodUpTo: 20, watchUpTo: 32 },         // km/h
    waves: { goodUpTo: 0.8, watchUpTo: 1.5 },       // metres
    warm:  { goodFrom: 15, watchFrom: 11 },         // feels-like °C
    rain:  { goodUpTo: 30, watchUpTo: 60 }          // % chance
  };

  function assess(c) {
    const t = {};
    t.tide = !c.tide ? 'na' : c.tide.f >= RULES.tide.goodAbove ? 'good' : c.tide.f >= RULES.tide.watchAbove ? 'watch' : 'poor';
    t.wind = c.wind == null ? 'na' : c.wind <= RULES.wind.goodUpTo ? 'good' : c.wind <= RULES.wind.watchUpTo ? 'watch' : 'poor';
    t.waves = c.wave == null ? 'na' : c.wave <= RULES.waves.goodUpTo ? 'good' : c.wave <= RULES.waves.watchUpTo ? 'watch' : 'poor';
    t.warm = c.feels == null ? 'na' : c.feels >= RULES.warm.goodFrom ? 'good' : c.feels >= RULES.warm.watchFrom ? 'watch' : 'poor';
    t.rain = c.rain == null ? 'na' : c.rain <= RULES.rain.goodUpTo ? 'good' : c.rain <= RULES.rain.watchUpTo ? 'watch' : 'poor';
    let score = 0;
    Object.keys(t).forEach((k) => { score += t[k] === 'poor' ? 2 : t[k] === 'watch' ? 1 : 0; });
    const level = score <= 1 ? 'good' : score <= 3 ? 'watch' : 'poor';
    return { tones: t, score, level };
  }

  const levelWord = (level) => (level === 'good' ? 'Great' : level === 'watch' ? 'OK' : 'Rough');

  function reasons(c) {
    const t = c.assess.tones, out = [];
    if (t.tide === 'poor') out.push('the tide is far out'); else if (t.tide === 'watch') out.push('the tide is still low');
    if (t.wind === 'poor') out.push('it is very windy'); else if (t.wind === 'watch') out.push('it is breezy');
    if (t.waves === 'poor') out.push('the waves are big'); else if (t.waves === 'watch') out.push('the water is choppy');
    if (t.warm === 'poor') out.push('it feels cold'); else if (t.warm === 'watch') out.push('it feels cooler than it looks');
    if (t.rain === 'poor') out.push('rain is likely'); else if (t.rain === 'watch') out.push('showers are possible');
    return out;
  }

  function bestHour(data, bi, beach, dayIdx, hours) {
    let best = null;
    hours.forEach((h) => {
      const s = conditions(data, bi, beach, dayIdx, h).assess.score;
      if (best === null || s < best.score) best = { hour: h, score: s };
    });
    return best;
  }

  root.BC = {
    TZ, HOURS, pad, nowLocal, loadAll, conditions, userConditions, tideBars,
    levelWord, reasons, bestHour, RULES
  };
  if (typeof module !== 'undefined') module.exports = root.BC;
})(typeof window !== 'undefined' ? window : globalThis);
