/**
 * Single source of truth: the countries taught by the trainer.
 *
 * Scope: sovereign states generally counted as "Europa" in German school
 * geography — all UN members in/adjacent to Europe, the six microstates,
 * Cyprus, Kosovo, the European parts of Russia and Turkey, and the three
 * South-Caucasus states.
 *
 * Fields
 *   id     stable short key used everywhere (storage, geometry, SRS items)
 *   ne     Natural Earth ADM0_A3 code, used only by scripts/build-geo.mjs
 *   name   canonical German country name (shown to the learner)
 *   cap    canonical German capital name (shown to the learner)
 *   alt    accepted alternative spellings for free-text answers; matching is
 *          already case-, accent-, "ß/ss"-, hyphen- and article-insensitive,
 *          so only genuinely different word forms belong here
 *
 * Capitals follow current German school atlases; where a traditional German
 * exonym is still common (Kiew, Tiflis, Eriwan ...) it is the canonical form
 * and the endonym is accepted as an alternative.
 *
 * This file is plain ESM so both Vite and the Node build scripts can import it.
 * Types live in countries.d.ts.
 */

/** @type {import('./countries').Country[]} */
export const COUNTRIES = [
  { id: 'al', ne: 'ALB', name: 'Albanien', cap: 'Tirana' },
  { id: 'ad', ne: 'AND', name: 'Andorra', cap: 'Andorra la Vella', altCap: ['Andorra'] },
  { id: 'am', ne: 'ARM', name: 'Armenien', cap: 'Eriwan', altCap: ['Jerewan', 'Yerevan'] },
  { id: 'at', ne: 'AUT', name: 'Österreich', cap: 'Wien' },
  { id: 'az', ne: 'AZE', name: 'Aserbaidschan', altName: ['Aserbeidschan'], cap: 'Baku' },
  { id: 'by', ne: 'BLR', name: 'Belarus', altName: ['Weißrussland'], cap: 'Minsk' },
  { id: 'be', ne: 'BEL', name: 'Belgien', cap: 'Brüssel' },
  {
    id: 'ba',
    ne: 'BIH',
    name: 'Bosnien und Herzegowina',
    altName: ['Bosnien-Herzegowina', 'Bosnien und Herzegovina', 'Bosnien'],
    cap: 'Sarajevo',
    altCap: ['Sarajewo'],
  },
  { id: 'bg', ne: 'BGR', name: 'Bulgarien', cap: 'Sofia' },
  { id: 'hr', ne: 'HRV', name: 'Kroatien', cap: 'Zagreb' },
  { id: 'cy', ne: 'CYP', name: 'Zypern', cap: 'Nikosia', altCap: ['Nicosia'] },
  { id: 'cz', ne: 'CZE', name: 'Tschechien', altName: ['Tschechische Republik'], cap: 'Prag' },
  { id: 'dk', ne: 'DNK', name: 'Dänemark', cap: 'Kopenhagen' },
  { id: 'ee', ne: 'EST', name: 'Estland', cap: 'Tallinn' },
  { id: 'fi', ne: 'FIN', name: 'Finnland', cap: 'Helsinki' },
  { id: 'fr', ne: 'FRA', name: 'Frankreich', cap: 'Paris' },
  { id: 'ge', ne: 'GEO', name: 'Georgien', cap: 'Tiflis', altCap: ['Tbilissi', 'Tbilisi'] },
  { id: 'de', ne: 'DEU', name: 'Deutschland', cap: 'Berlin' },
  { id: 'gr', ne: 'GRC', name: 'Griechenland', cap: 'Athen' },
  { id: 'hu', ne: 'HUN', name: 'Ungarn', cap: 'Budapest' },
  { id: 'is', ne: 'ISL', name: 'Island', cap: 'Reykjavík', altCap: ['Reykjavik'] },
  { id: 'ie', ne: 'IRL', name: 'Irland', cap: 'Dublin' },
  { id: 'it', ne: 'ITA', name: 'Italien', cap: 'Rom' },
  { id: 'xk', ne: 'KOS', name: 'Kosovo', cap: 'Pristina', altCap: ['Prishtina', 'Priština'] },
  { id: 'lv', ne: 'LVA', name: 'Lettland', cap: 'Riga' },
  { id: 'li', ne: 'LIE', name: 'Liechtenstein', cap: 'Vaduz' },
  { id: 'lt', ne: 'LTU', name: 'Litauen', cap: 'Vilnius' },
  { id: 'lu', ne: 'LUX', name: 'Luxemburg', cap: 'Luxemburg', altCap: ['Luxemburg-Stadt'] },
  { id: 'mt', ne: 'MLT', name: 'Malta', cap: 'Valletta' },
  {
    id: 'md',
    ne: 'MDA',
    name: 'Moldau',
    altName: ['Republik Moldau', 'Moldawien', 'Moldova'],
    cap: 'Chișinău',
    altCap: ['Chisinau', 'Kischinau', 'Kischinjow'],
  },
  { id: 'mc', ne: 'MCO', name: 'Monaco', cap: 'Monaco', altCap: ['Monaco-Stadt', 'Monaco-Ville'] },
  { id: 'me', ne: 'MNE', name: 'Montenegro', cap: 'Podgorica' },
  { id: 'nl', ne: 'NLD', name: 'Niederlande', altName: ['Holland'], cap: 'Amsterdam' },
  {
    id: 'mk',
    ne: 'MKD',
    name: 'Nordmazedonien',
    altName: ['Mazedonien', 'Nord-Mazedonien'],
    cap: 'Skopje',
  },
  { id: 'no', ne: 'NOR', name: 'Norwegen', cap: 'Oslo' },
  { id: 'pl', ne: 'POL', name: 'Polen', cap: 'Warschau' },
  { id: 'pt', ne: 'PRT', name: 'Portugal', cap: 'Lissabon' },
  { id: 'ro', ne: 'ROU', name: 'Rumänien', cap: 'Bukarest' },
  { id: 'ru', ne: 'RUS', name: 'Russland', altName: ['Russische Föderation'], cap: 'Moskau' },
  { id: 'sm', ne: 'SMR', name: 'San Marino', cap: 'San Marino' },
  { id: 'rs', ne: 'SRB', name: 'Serbien', cap: 'Belgrad' },
  { id: 'sk', ne: 'SVK', name: 'Slowakei', cap: 'Bratislava' },
  { id: 'si', ne: 'SVN', name: 'Slowenien', cap: 'Ljubljana', altCap: ['Laibach'] },
  { id: 'es', ne: 'ESP', name: 'Spanien', cap: 'Madrid' },
  { id: 'se', ne: 'SWE', name: 'Schweden', cap: 'Stockholm' },
  { id: 'ch', ne: 'CHE', name: 'Schweiz', cap: 'Bern' },
  { id: 'tr', ne: 'TUR', name: 'Türkei', cap: 'Ankara' },
  { id: 'ua', ne: 'UKR', name: 'Ukraine', cap: 'Kiew', altCap: ['Kyjiw', 'Kyiv'] },
  {
    id: 'gb',
    ne: 'GBR',
    name: 'Vereinigtes Königreich',
    altName: ['Großbritannien', 'Vereinigtes Koenigreich', 'UK'],
    cap: 'London',
  },
  { id: 'va', ne: 'VAT', name: 'Vatikanstadt', altName: ['Vatikan', 'Vatikanstaat'], cap: 'Vatikanstadt', altCap: ['Vatikan', 'Vatikanstaat'] },
];

/** Countries whose land area is too small to tap reliably without an assist. */
export const MICROSTATES = new Set(['ad', 'li', 'lu', 'mc', 'mt', 'sm', 'va']);

/** @type {Record<string, import('./countries').Country>} */
export const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
