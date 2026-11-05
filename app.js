/* Beach Check — UI. Reads BEACHES (beaches.js) and BC (logic.js). */
(function () {
  'use strict';
  const { HOURS, pad } = BC;
  const app = document.getElementById('app');

  const TONE = {
    good:  { label: 'Good',    bg: '#D6EFE3', fg: '#0B5B3A' },
    watch: { label: 'Watch',   bg: '#FCE9C8', fg: '#7A4300' },
    poor:  { label: 'Poor',    bg: '#FAD9D0', fg: '#8E2A12' },
    na:    { label: 'No data', bg: '#E6ECEB', fg: '#35505A' }
  };
  // Map projection for the hand-drawn outline (400 x 520 box, lon -10.7..-5.4, lat 51.3..55.5)
  const KX = 73.79, KY = 520 / 4.2;
  const OUTLINE = '246,15 277,37 336,35 362,80 358,105 384,136 354,186 332,186 325,198 328,223 342,261 336,272 347,313 332,359 321,409 278,418 229,425 210,440 184,458 160,483 65,501 22,477 30,440 18,421 59,396 74,365 57,364 100,318 106,291 122,276 59,272 33,260 52,248 59,233 44,192 52,155 100,146 155,142 170,124 148,105 170,74 177,43 199,37 229,28';
  const mapX = (lon) => ((lon + 10.7) * KX / 400 * 100).toFixed(1) + '%';
  const mapY = (lat) => ((55.5 - lat) * KY / 520 * 100).toFixed(1) + '%';

  const state = {
    dayIdx: 0, hour: 14, beachId: BEACHES[0].id,
    user: Object.assign({}, DEFAULT_USER),
    data: null, loading: true, error: null, geoMsg: ''
  };

  // ---------- URL hash keeps the view shareable ----------
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const b = p.get('beach');
    if (b && BEACHES.some((x) => x.id === b)) state.beachId = b;
    const d = parseInt(p.get('d'), 10);
    if (d === 0 || d === 1) state.dayIdx = d;
    const h = parseInt(p.get('h'), 10);
    return HOURS.indexOf(h) !== -1 ? h : null;
  }
  function writeHash() {
    const p = new URLSearchParams({ beach: state.beachId, d: state.dayIdx, h: state.hour });
    history.replaceState(null, '', '#' + p.toString());
  }

  // ---------- data ----------
  async function load() {
    state.loading = true; state.error = null; render();
    try {
      state.data = await BC.loadAll(BEACHES, state.user);
    } catch (e) {
      state.error = 'Could not load live data (' + e.message + '). Check your connection and try again.';
    }
    state.loading = false;
    render();
  }

  function isPast(h) {
    const now = BC.nowLocal();
    return state.dayIdx === 0 && h < now.hour - 1;
  }

  // ---------- small view helpers ----------
  const chip = (tone, text) => '<span class="chip" style="background:' + TONE[tone].bg + ';color:' + TONE[tone].fg + '">' + (text || TONE[tone].label) + '</span>';
  const val = (v, unit) => (v == null ? 'n/a' : v + unit);
  const dayLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  function factorCards(c, beachName) {
    const t = c.assess.tones;
    const tide = c.tide;
    const tideNote = !tide ? 'Tide times are unavailable for this beach right now.' :
      (tide.sandM >= 10 ? 'About ' + tide.sandM + ' m more sand showing than at high water (rough estimate).' : 'Water is close to its high mark.') +
      (tide.next ? ' Next ' + tide.next.type.toLowerCase() + ' tide ' + tide.next.at + '.' : '');
    const cards = [
      ['Tide', t.tide, tide ? tide.state : 'n/a', tideNote],
      ['Wind', t.wind, val(c.wind, ' km/h'), t.wind === 'good' ? 'Light enough for a towel and a book.' : t.wind === 'watch' ? 'Breezy. Bring a windbreak and expect blown sand.' : t.wind === 'poor' ? 'Strong. Sand will sting and towels will fly.' : 'No wind data.'],
      ['Waves', t.waves, val(c.wave, ' m'), t.waves === 'good' ? 'Gentle shore break.' : t.waves === 'watch' ? 'Choppy. Fine for paddling, take care swimming.' : t.waves === 'poor' ? 'Large. Not a day for swimming.' : 'No wave data for this spot.'],
      ['Rain', t.rain, val(c.rain, '%'), t.rain === 'good' ? 'Low chance of rain.' : t.rain === 'watch' ? 'Showers are possible. Bring a jacket.' : t.rain === 'poor' ? 'Rain is likely.' : 'No rain data.'],
      ['Feels like', t.warm, val(c.feels, '°C'), t.warm === 'good' ? 'Comfortable in a t-shirt.' : t.warm === 'watch' ? 'Cooler than it looks. Pack a layer.' : t.warm === 'poor' ? 'Cold on the sand. Pack warm clothes.' : 'No temperature data.']
    ];
    return cards.map((x) =>
      '<div class="factor"><div class="h"><div class="eyebrow">' + x[0] + '</div>' + chip(x[1]) + '</div><div class="v">' + x[2] + '</div><div class="note">' + x[3] + '</div></div>'
    ).join('');
  }

  function mapHtml(conds) {
    const u = state.user;
    const inMap = u.lon > -10.7 && u.lon < -5.4 && u.lat > 51.3 && u.lat < 55.5;
    let h = '<div class="map"><svg viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true"><polygon points="' + OUTLINE + '" fill="#F3F7F2" stroke="#4F8FA1" stroke-width="2" stroke-linejoin="round"></polygon></svg>';
    if (inMap) {
      h += '<div class="you-dot" role="img" aria-label="Your location" style="left:' + mapX(u.lon) + ';top:' + mapY(u.lat) + '"></div>';
    }
    BEACHES.forEach((b, i) => {
      const lv = conds[i].assess.level;
      const sel = b.id === state.beachId;
      const size = sel ? 30 : 24;
      h += '<button class="pin" data-act="beach" data-v="' + b.id + '" aria-pressed="' + sel + '" aria-label="' + b.name + ', ' + b.county + ': ' + BC.levelWord(lv) + ' conditions" style="left:' + mapX(b.pin[0]) + ';top:' + mapY(b.pin[1]) + '">' +
        '<i style="width:' + size + 'px;height:' + size + 'px;background:' + TONE[lv].bg + ';border-color:' + (sel ? '#0E2A33' : TONE[lv].fg) + '"></i>' +
        '<span class="lbl' + (b.side === 'right' ? ' r' : '') + '"><span style="font-weight:' + (sel ? 700 : 500) + '">' + b.name + '</span><em style="color:' + TONE[lv].fg + '">' + BC.levelWord(lv) + '</em></span></button>';
    });
    return h + '</div>';
  }

  // ---------- render ----------
  function render() {
    const focus = document.activeElement && document.activeElement.dataset ? { a: document.activeElement.dataset.act, v: document.activeElement.dataset.v } : null;

    if (state.loading && !state.data) {
      app.innerHTML = '<div class="state">Loading live conditions for Irish beaches…</div>';
      return;
    }
    if (state.error && !state.data) {
      app.innerHTML = '<div class="state"><div>' + state.error + '</div><button class="btn" data-act="retry">Try again</button></div>';
      return;
    }

    const d = state.data;
    const bi = BEACHES.findIndex((b) => b.id === state.beachId);
    const beach = BEACHES[bi];
    const hour = state.hour;
    const day = state.dayIdx;
    const c = BC.conditions(d, bi, beach, day, hour);
    const you = BC.userConditions(d, state.user, day, hour);
    const conds = BEACHES.map((b, i) => BC.conditions(d, i, b, day, hour));
    const availableHours = HOURS.filter((h) => !isPast(h));
    const best = availableHours.length ? BC.bestHour(d, bi, beach, day, availableHours) : null;

    // verdict
    const lv = c.assess.level;
    const why = BC.reasons(c);
    let line;
    if (lv === 'good') line = 'Conditions on the sand look good for ' + pad(hour) + ':00.';
    else line = 'Heads up: ' + (why.length ? why.join(', ') : 'conditions are mixed') + '.';
    if (best && best.score < c.assess.score) line += ' Better around ' + pad(best.hour) + ':00.';
    const title = lv === 'good' ? 'A good beach window' : lv === 'watch' ? 'Go, but plan for it' : 'Maybe not right now';

    // compare
    let cmp = 'Weather at your spot is unavailable.';
    if (you.feels != null && c.feels != null) {
      const diff = you.feels - c.feels;
      cmp = (diff === 0 ? 'Feels about the same on the sand.' : 'Feels ' + Math.abs(diff) + '° ' + (diff > 0 ? 'cooler' : 'warmer') + ' on the sand.') +
        (you.wind != null && c.wind != null ? ' Wind is ' + c.wind + ' km/h there against ' + you.wind + ' km/h where you are.' : '');
    }

    // tide bars
    const bars = BC.tideBars(d, beach, day).map((b) =>
      '<div class="bar"><div><i style="height:' + (b.f == null ? 4 : Math.round(14 + b.f * 116)) + 'px;background:' + (b.h === hour ? '#C2541B' : '#6FA8B8') + '"></i></div><span style="font-weight:' + (b.h === hour ? 700 : 400) + '">' + (b.h % 3 === 0 ? pad(b.h) : '') + '</span></div>'
    ).join('');

    const dayBtns = [0, 1].map((i) =>
      '<button class="btn" data-act="day" data-v="' + i + '" aria-pressed="' + (day === i) + '">' + (i === 0 ? 'Today' : 'Tomorrow') + ' · ' + dayLabel(d.dates[i]) + '</button>'
    ).join('');

    const hourBtns = HOURS.map((h) => {
      const lvH = BC.conditions(d, bi, beach, day, h).assess.level;
      return '<button class="hour" data-act="hour" data-v="' + h + '" aria-pressed="' + (h === hour) + '"' + (isPast(h) ? ' disabled' : '') + '><b>' + pad(h) + ':00</b><span>' + BC.levelWord(lvH) + ' for the beach</span></button>';
    }).join('');

    const list = BEACHES.map((b, i) => {
      const l = conds[i].assess.level;
      return '<button class="beach" data-act="beach" data-v="' + b.id + '" aria-pressed="' + (b.id === state.beachId) + '"><span class="n"><b>' + b.name + '</b><span>' + b.county + ' · ' + b.tag + '</span></span>' +
        chip(l, BC.levelWord(l)) + '</button>';
    }).join('');

    const fetched = new Date(d.fetchedAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', timeZone: BC.TZ });

    app.innerHTML =
      '<div class="hero"><h1>Warm in the city. What about on the beach?</h1>' +
      '<p>Pick a beach and a time. See tide, wind, waves, rain and temperature there, side by side with where you are, before you pack the car.</p></div>' +

      '<div class="where"><span class="eyebrow">Your spot</span><b>' + state.user.label + '</b>' +
      '<button class="btn" data-act="geo">Use my location</button>' +
      (state.geoMsg ? '<span class="msg">' + state.geoMsg + '</span>' : '') + '</div>' +

      '<div class="controls"><div class="row days">' + dayBtns + '</div>' +
      '<div class="eyebrow">' + (day === 0 ? 'Today' : 'Tomorrow') + ' at ' + beach.name + '</div>' +
      '<div class="row">' + hourBtns + '</div></div>' +

      '<div class="layout">' +
        '<div class="left"><div class="eyebrow">Map of Ireland</div><div class="mapcard">' + mapHtml(conds) +
        '<div class="note">Tap a pin to choose a beach. Pin colours show conditions at ' + pad(hour) + ':00. The black dot is where you are. Dublin Bay pins are nudged apart so both can be tapped.</div></div>' +
        '<div class="eyebrow" style="margin-top:10px">Beaches</div><div class="blist">' + list + '</div></div>' +

        '<div class="right">' +
          '<div class="verdict"><div class="t"><div class="eyebrow">' + beach.name + ', ' + beach.county + ' · ' + pad(hour) + ':00</div><h2>' + title + '</h2><p>' + line + '</p></div>' +
          '<div class="badge" style="background:' + TONE[lv].bg + ';color:' + TONE[lv].fg + '">' + BC.levelWord(lv) + ' conditions</div></div>' +

          '<div class="two">' +
            '<div class="card c1"><h2>Where you are vs the beach</h2><div class="cmp">' +
              '<div><div class="eyebrow">You</div><div class="big">' + val(you.temp, '°') + '</div><small>Wind ' + val(you.wind, ' km/h') + '</small><small>Feels like ' + val(you.feels, '°') + '</small></div>' +
              '<div class="vr"></div>' +
              '<div><div class="eyebrow">On the sand</div><div class="big">' + val(c.temp, '°') + '</div><small>Wind ' + val(c.wind, ' km/h') + '</small><small>Feels like ' + val(c.feels, '°') + '</small></div>' +
            '</div><div class="callout">' + cmp + '</div></div>' +
            '<div class="card c2"><div class="tidehead"><h2>Tide through the day</h2><span>' + (c.tide ? c.tide.state + (c.tide.next ? ' · ' + c.tide.next.type + ' at ' + c.tide.next.at : '') : 'Tide data unavailable') + '</span></div>' +
              '<div class="bars">' + bars + '</div><div class="note">Taller bars mean more water on the beach. The highlighted bar is the hour you picked. Station predictions from the Marine Institute; storm surge is not included.</div></div>' +
          '</div>' +

          '<div class="factors">' + factorCards(c, beach.name) + '</div>' +
          '<div class="extras">' +
            '<div class="extra"><div class="eyebrow">Sea temperature</div><b>' + val(c.sst, '°C') + '</b></div>' +
            '<div class="extra"><div class="eyebrow">Gusts</div><b>' + val(c.gust, ' km/h') + '</b></div>' +
            '<div class="extra"><div class="eyebrow">Best window ' + (day === 0 ? 'today' : 'tomorrow') + '</div><b>' + (best ? pad(best.hour) + ':00' : 'n/a') + '</b></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="foot"><div>Data updated at ' + fetched + '. <button class="btn" data-act="retry" style="min-height:36px;padding:4px 12px">Refresh</button></div>' +
      '<div>Weather and waves: <a href="https://open-meteo.com/">Open-Meteo</a> (CC BY 4.0). Tides: <a href="https://data.gov.ie/dataset/marine-institute-tide-prediction">Marine Institute tide predictions</a> (CC BY 4.0), shown for the nearest station. Waves and sea temperature come from a coarse regional model, so nearby beaches can show similar values.</div>' +
      '<div>A planning aid, not a safety tool. Always check lifeguard flags and local advice before going in the water.</div></div>';

    // keep keyboard focus after a re-render
    if (focus && focus.a) {
      const el = app.querySelector('[data-act="' + focus.a + '"]' + (focus.v ? '[data-v="' + focus.v + '"]' : ''));
      if (el && !el.disabled) el.focus({ preventScroll: true });
    }
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act, v = el.dataset.v;
    if (act === 'beach') { state.beachId = v; }
    else if (act === 'hour') { state.hour = parseInt(v, 10); }
    else if (act === 'day') {
      state.dayIdx = parseInt(v, 10);
      if (isPast(state.hour)) state.hour = HOURS.find((h) => !isPast(h)) || 20;
    }
    else if (act === 'retry') { load(); return; }
    else if (act === 'geo') { locate(); return; }
    writeHash();
    render();
  });

  function locate() {
    if (!navigator.geolocation) { state.geoMsg = 'Your browser does not support location.'; render(); return; }
    state.geoMsg = 'Finding you…'; render();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.user = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Your location', isDefault: false };
        state.geoMsg = '';
        load();
      },
      () => { state.geoMsg = 'Location was blocked, so Dublin city centre is still used.'; render(); },
      { timeout: 10000, maximumAge: 600000 }
    );
  }

  // ---------- start ----------
  const hashHour = readHash();
  const now = BC.nowLocal();
  if (hashHour != null) state.hour = hashHour;
  else if (now.hour > 20) { state.dayIdx = 1; state.hour = 6; }
  else state.hour = HOURS.find((h) => h >= now.hour) || 20;
  if (isPast(state.hour)) {
    const ok = HOURS.find((h) => !isPast(h));
    if (ok) state.hour = ok; else { state.dayIdx = 1; state.hour = 6; }
  }
  load();
})();
