# Beach Check Ireland

A live web app that answers one question: **"It's warm where I am. Is it actually a good idea to go to the beach right now?"**

It shows tide, wind, gusts, waves, rain chance and "feels like" for nine Irish beaches at a chosen time (06:00 to 20:00, today or tomorrow), next to the weather where you are, and gives a plain verdict: *A good beach window / Go, but plan for it / Maybe not right now*.

## Run it

No build step, no API keys, no backend.

```bash
cd beach-check
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly also works in most browsers.)

## Deploy it free (so you can share a link in interviews)

- **Netlify Drop**: go to app.netlify.com/drop and drag the `beach-check` folder in. Done.
- **GitHub Pages**: push the folder to a repo, Settings → Pages → deploy from the main branch.

## Files

| File | Job |
|---|---|
| `beaches.js` | The beach list. Add a beach by adding one object. |
| `logic.js` | Fetches data and makes the decision. All thresholds are in one `RULES` object. |
| `app.js` | The interface: map, hour picker, cards, location button. |
| `index.html`, `style.css` | Page shell and styling. |

## Data sources (all free, no key, allowed from the browser)

- **Open-Meteo Forecast API**: air temperature, feels-like, wind, gusts, rain probability.
- **Open-Meteo Marine API**: wave height, sea temperature.
- **Marine Institute (Ireland) tide predictions**, via ERDDAP: predicted water level at the nearest tide station. CC BY 4.0.

Open-Meteo's free tier is for **non-commercial use**, which fits a portfolio project. If this ever becomes a product, switch to a paid plan or another provider.

## Known limits (say these out loud in an interview)

- **Waves and sea temperature come from a coarse regional model.** Nearby beaches, such as the two Dublin ones, can show the same wave height.
- **"Extra sand showing" is an estimate.** It uses a per-beach `slope` number in `beaches.js` that I guessed. No dataset gives distance to the water directly. Next step: real beach-profile data or user reports.
- **Tides are predictions** and exclude storm surge. Stations are the nearest available, not always on the beach itself.
- **The thresholds are assumptions** (for example "wind over 32 km/h is poor"). They have not been tested with real beach-goers yet.
- **The map outline is hand-drawn and simplified.** Good for placing pins, not for navigation.
- **It is a planning aid, not a safety tool.** It does not know about lifeguard flags, rip currents or water quality.

## Product notes for interviews

**Problem.** People decide on a beach trip from the weather where they are. That misses things that only matter at the beach: wind chill on the sand, and a tide so far out that the sea is a long walk away. Result: a wasted trip.

**Who.** Dublin and other city dwellers deciding on a same-day trip, families with children, casual swimmers and walkers (not surfers, who already have tools).

**Hypothesis.** A single comparison of "where I am vs the beach" plus a clear go / plan / skip verdict helps people make a better decision than a weather app alone.

**What I'd measure.**
- Decision usefulness: after viewing, did people go, pick another beach, or change the time? (one-question prompt)
- Return rate on warm, dry days
- Share of sessions that use the time picker or compare beaches
- Verdict accuracy: a follow-up "was this right?" after the trip

**How I'd test the verdict.** Show five to ten local beach-goers past forecasts and what the app said. Ask whether the verdict matches their own call. Tune `RULES` from that.

**Trade-offs I made.**
- No backend: free to host and instant to ship, but no accounts, no saved beaches and no caching across users.
- One simple verdict instead of separate swim / walk / surf modes: easier to understand, but less accurate for each activity.
- Nine beaches by hand: enough to prove the idea, not a full directory.

**Roadmap ideas.**
1. Activity modes (swim, walk with kids, surf) with separate thresholds
2. Bathing-water quality and lifeguard-season info
3. "Tell me when": alert when a chosen beach hits a good window
4. All beaches from an open dataset, with a search box
5. Crowd and parking signals
6. Better wave data from a nearshore source, plus real sand-distance estimates

## Install it as an app (PWA)

The site is an installable web app. Files involved: `manifest.webmanifest` (name, icons, colours), `sw.js` (service worker) and the `icons/` folder.

- **iPhone (Safari):** Share button → Add to Home Screen.
- **Android (Chrome):** menu → Install app (or Add to Home Screen).
- **Desktop (Chrome/Edge):** install icon in the address bar.

The service worker keeps a copy of the app's own files only. Weather, wave and tide data are never stored, so they are always live. Files are fetched from the network first, so changes you publish appear straight away. If you change the list of files in `sw.js`, also change the `CACHE` version name.
