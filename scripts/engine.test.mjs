import assert from 'node:assert';
import { normalize, matchAnswer } from '../src/engine/match.ts';
import { scoreQuestion, rankFor } from '../src/engine/scoring.ts';
import { newItem, grade, levelForBox, buildQueue } from '../src/engine/srs.ts';

// --- match
assert.equal(normalize('  Die Schweiz '), 'schweiz');
assert.equal(normalize('Vereinigtes Königreich'), 'vereinigtes konigreich');
assert.equal(normalize('groß'), 'gross');
assert.deepEqual(matchAnswer('kopenhagen','Kopenhagen'), {correct:true, almost:false});
assert.deepEqual(matchAnswer('Warschau','Warschau'), {correct:true, almost:false});
assert.equal(matchAnswer('Kopenhaen','Kopenhagen').correct, true); // 1 typo
assert.equal(matchAnswer('Kopenhaen','Kopenhagen').almost, true);
assert.equal(matchAnswer('Berlin','Kopenhagen').correct, false);
assert.equal(matchAnswer('weissrussland','Belarus',['Weißrussland']).correct, true);
assert.equal(matchAnswer('kiew','Kiew',['Kyjiw']).correct, true);
assert.equal(matchAnswer('tbilisi','Tiflis',['Tbilissi','Tbilisi']).correct, true);

// --- scoring
const s1 = scoreQuestion({correct:true, almost:false, isMapAnswer:false, level:'hard', timeLeftFraction:1, streakBefore:0});
assert.ok(s1 > 0);
assert.equal(scoreQuestion({correct:false, almost:false, isMapAnswer:false, level:'hard', timeLeftFraction:1, streakBefore:5}), 0);
const easy = scoreQuestion({correct:true, almost:false, isMapAnswer:false, level:'easy', timeLeftFraction:0, streakBefore:0});
const hard = scoreQuestion({correct:true, almost:false, isMapAnswer:false, level:'hard', timeLeftFraction:0, streakBefore:0});
assert.ok(hard > easy, 'hard worth more');
assert.equal(rankFor(0).rank.name, 'Anfänger');
assert.ok(rankFor(999999).next === null);

// --- srs
let it = newItem('de','map->country', 0);
assert.equal(it.box, 0);
it = grade(it, {correct:true}, 1000);
assert.equal(it.box, 1);
assert.ok(it.due > 1000);
it = grade(it, {correct:false}, 2000);
assert.equal(it.box, 0);
assert.equal(levelForBox(0), 'easy');
assert.equal(levelForBox(2), 'medium');
assert.equal(levelForBox(4), 'hard');

const q = buildQueue({}, ['de','fr','it','es','pl'], ['map->country','map->capital'], 8, 5000);
assert.equal(q.length, 8);
for (let i=1;i<q.length;i++) assert.notEqual(q[i].country, q[i-1].country, 'no repeat country back-to-back');

console.log("engine tests passed");
