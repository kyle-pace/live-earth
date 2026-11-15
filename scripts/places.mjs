// Builds the place list for Live Earth's search and the time zone map it uses to open near
// a first-time visitor. Run with `npm run places`; the output is committed, so this only
// needs rerunning to change the list.
//
//   src/data/places.json     every country and U.S. state, plus continents and oceans: [name, lat, lon, rank]
//
// No cities: the satellites' regions are hundreds of miles across, so a city would only
// promise more detail than the picture has.
//   src/data/timezones.json  each IANA time zone's main city: { "America/Los_Angeles": [lat, lon] }
//
// Cities come from GeoNames via the all-the-cities package (CC BY 4.0; credited on the About
// page). Time zone locations come from the IANA tz database via moment-timezone (public
// domain). Country names come from the browser-standard Intl.DisplayNames, in English.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cities = require('all-the-cities');
const tz = require('moment-timezone/data/meta/latest.json');

const round = (n) => Math.round(n * 100) / 100;
const country = new Intl.DisplayNames(['en'], { type: 'region' });

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico',
};

// A place's spot on the map for a whole country or state: the population-weighted middle of
// its cities, which lands on where people live rather than an empty geographic center.
function middle(list) {
  let w = 0, lat = 0, x = 0, y = 0;
  for (const c of list) {
    const [lon, la] = c.loc.coordinates;
    const p = Math.max(c.population, 1);
    w += p;
    lat += la * p;
    x += Math.cos((lon * Math.PI) / 180) * p;
    y += Math.sin((lon * Math.PI) / 180) * p;
  }
  return [round(lat / w), round((Math.atan2(y, x) * 180) / Math.PI)];
}

const places = [];
const byCountry = new Map();
const byState = new Map();
for (const c of cities) {
  if (c.population < 1000) continue;
  (byCountry.get(c.country) ?? byCountry.set(c.country, []).get(c.country)).push(c);
  if (c.country === 'US' && STATES[c.adminCode]) (byState.get(c.adminCode) ?? byState.set(c.adminCode, []).get(c.adminCode)).push(c);
}

for (const [code, list] of byCountry) {
  let name;
  try { name = country.of(code); } catch { continue; }
  if (!name || name === code) continue;
  const pop = list.reduce((n, c) => n + c.population, 0);
  // The contiguous U.S. reads better than a point pulled toward the coasts.
  const at = code === 'US' ? [39.5, -98.35] : middle(list);
  places.push([name, ...at, pop]);
}
for (const [code, list] of byState) {
  places.push([`${STATES[code]}, United States`, ...middle(list), list.reduce((n, c) => n + c.population, 0)]);
}

// Continents and oceans, by hand: a point near the middle of each that a satellite sees well.
const BIG = 1e11;
for (const [name, lat, lon] of [
  ['North America', 45, -100], ['South America', -15, -60], ['Asia', 35, 100], ['Australia and Oceania', -25, 140],
  ['Pacific Ocean', 0, -160], ['Atlantic Ocean', 15, -40], ['Indian Ocean', -15, 75], ['Arctic', 75, 0],
  ['Antarctica', -80, 0], ['Mediterranean Sea', 36, 18], ['Caribbean Sea', 15, -75], ['Sahara', 23, 10],
  ['Himalayas', 29, 84], ['Amazon', -4, -62], ['Great Plains', 40, -100],
]) {
  places.push([name, lat, lon, BIG]);
}

places.sort((a, b) => b[3] - a[3]);
writeFileSync('src/data/places.json', JSON.stringify(places));

const zones = {};
for (const z of Object.values(tz.zones)) zones[z.name] = [round(z.lat), round(z.long)];
// Old names for the same zones: some browsers still report Asia/Calcutta, Europe/Kiev.
const { links } = require('moment-timezone/data/packed/latest.json');
for (const link of links) {
  const [to, from] = link.split('|');
  if (zones[to] && !zones[from]) zones[from] = zones[to];
}
writeFileSync('src/data/timezones.json', JSON.stringify(zones));

console.log(`${places.length} places, ${Object.keys(zones).length} time zones`);
