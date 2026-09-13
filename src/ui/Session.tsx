/**
 * Runs one session: walks the spaced-repetition queue, shows each question in
 * the right form for its direction and level, grades the answer, updates score
 * / streak / hearts, and commits everything to the profile at the end.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AnsweredQuestion, Question, SessionConfig, SessionSummary, SrsItem } from '../types';
import { DIRECTION_LABEL } from '../types';
import { BY_ID, COUNTRIES } from '../data/countries.js';
import { activeProfile, commitSession } from '../store/store';
import { buildQueue, grade } from '../engine/srs';
import { scoreQuestion } from '../engine/scoring';
import {
  checkAnswer,
  makeQuestion,
  optionLabel,
  promptText,
  showsMapPrompt,
  usesFreeText,
  usesList,
  usesMap,
} from '../engine/session';
import { sfx, setSoundEnabled } from '../engine/sound';
import { MapView } from '../map/MapView';
import { Button, Hearts, ProgressBar, TimerBar } from './widgets';

const FEEDBACK_MS = 1700;
const START_HEARTS = 5;

export function Session({
  config,
  onDone,
  onQuit,
}: {
  config: SessionConfig;
  onDone: (s: SessionSummary) => void;
  onQuit: () => void;
}) {
  const profile = activeProfile();
  const queue = useMemo<SrsItem[]>(() => {
    const srs = profile?.srs ?? {};
    const ids = COUNTRIES.map((c) => c.id);
    return buildQueue(srs, ids, config.directions, config.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [pick, setPick] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ correct: boolean; almost: boolean; timedOut: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [hearts, setHearts] = useState(config.hearts ? START_HEARTS : Infinity);

  const answers = useRef<AnsweredQuestion[]>([]);
  const graded = useRef<SrsItem[]>([]);
  const startedAt = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const advanced = useRef(false);
  // Typed as `number` (not ReturnType<typeof setTimeout>): @types/node, pulled in
  // transitively by other devDependencies, shadows the browser setTimeout's
  // return type globally even though this always runs in a browser.
  const advanceTimer = useRef<number>();
  const finalScore = useRef(0);

  const item = queue[index];
  const question = useMemo<Question>(
    () => makeQuestion(item, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index]
  );

  useEffect(() => {
    questionStart.current = Date.now();
    advanced.current = false;
    setPick(null);
    setText('');
    setResult(null);
    setPhase('answering');
  }, [index]);

  useEffect(() => {
    setSoundEnabled(profile?.settings.sound ?? true);
    return () => clearTimeout(advanceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (finalPts = score) => {
    const list = answers.current;
    const summary: SessionSummary = {
      at: startedAt.current,
      mode: config.mode,
      score: finalPts,
      xp: finalPts,
      total: list.length,
      correct: list.filter((a) => a.correct).length,
      almost: list.filter((a) => a.almost).length,
      bestStreak,
      answers: list.slice(),
    };
    commitSession(graded.current.slice(), list.slice(), summary);
    sfx.finish();
    onDone(summary);
  };

  const submit = (value: string | null, timedOut = false) => {
    if (phase === 'feedback') return;
    const ms = Math.min(Date.now() - questionStart.current, question.timeLimit ?? 999_999);
    const check = timedOut || value === null ? { correct: false, almost: false } : checkAnswer(question, value);
    const timeLeftFraction = question.timeLimit ? Math.max(0, (question.timeLimit - ms) / question.timeLimit) : 0;
    const points = scoreQuestion({
      correct: check.correct,
      almost: check.almost,
      isMapAnswer: usesMap(question),
      level: question.level,
      timeLeftFraction,
      streakBefore: streak,
    });

    graded.current.push(
      grade(item, { correct: check.correct, shaky: check.almost || (check.correct && timeLeftFraction === 0) }, Date.now())
    );
    answers.current.push({
      key: question.key,
      direction: question.direction,
      level: question.level,
      correct: check.correct,
      almost: check.almost,
      timedOut,
      ms,
      points,
    });

    const nextScore = score + points;
    const nextStreak = check.correct ? streak + 1 : 0;
    const nextHearts = check.correct ? hearts : hearts - 1;

    if (!check.correct) sfx.wrong();
    else if (check.almost) sfx.almost();
    else if (nextStreak > 0 && nextStreak % 5 === 0) sfx.streak();
    else sfx.correct();
    setScore(nextScore);
    setStreak(nextStreak);
    setBestStreak((b) => Math.max(b, nextStreak));
    setHearts(nextHearts);
    setPick(value);
    setResult({ correct: check.correct, almost: check.almost, timedOut });
    setPhase('feedback');

    finalScore.current = nextScore;
    const out = config.hearts && nextHearts <= 0;
    advanceTimer.current = window.setTimeout(() => advance(out), FEEDBACK_MS);
  };

  /** Move to the next question or end the session. Guarded against double-fire
   *  (auto-advance timer + a manual "Weiter" tap). */
  const advance = (out = false) => {
    if (advanced.current) return;
    advanced.current = true;
    clearTimeout(advanceTimer.current);
    if (out || index >= queue.length - 1) finish(finalScore.current);
    else setIndex((i) => i + 1);
  };
  const advanceNow = () => {
    if (phase === 'feedback') advance(config.hearts && hearts <= 0);
  };

  // --- map wiring
  const feedback = phase === 'feedback';
  // Free-text and the searchable list both open the on-screen keyboard, so the
  // session screen is allowed to scroll then instead of being pinned, keeping
  // the input reachable above the keyboard.
  const textInput = !feedback && (usesFreeText(question) || usesList(question));
  const needMap = showsMapPrompt(question) || usesMap(question) || feedback;
  const mapMode = usesMap(question) && !feedback ? 'select' : 'prompt';
  const spotlight = showsMapPrompt(question) ? question.country : null;
  const reveal = feedback ? question.country : null;
  const wrong = feedback && usesMap(question) && pick && pick !== question.country ? pick : null;

  return (
    <div class={`screen session${textInput ? ' has-text' : ''}`}>
      <header class="session-bar">
        <button type="button" class="icon-btn" aria-label="Beenden" onClick={onQuit}>
          ✕
        </button>
        <ProgressBar value={index + (feedback ? 1 : 0)} max={queue.length} />
        {config.hearts ? (
          <Hearts total={START_HEARTS} left={Math.max(0, hearts)} />
        ) : (
          <span class="score-pill">{score}</span>
        )}
      </header>

      {question.timeLimit && !feedback && (
        <TimerBar duration={question.timeLimit} runId={index} onExpire={() => submit(null, true)} />
      )}

      <div class="q-head">
        <span class="q-dir">{DIRECTION_LABEL[question.direction]}</span>
        {streak >= 3 && !feedback && <span class="streak-flame">🔥 {streak}</span>}
      </div>

      <p class="q-prompt">{promptText(question)}</p>

      {needMap && (
        <div class="q-map">
          <MapView
            key={index}
            viewKey={index}
            mode={mapMode}
            spotlightId={spotlight}
            selectedId={usesMap(question) ? pick : null}
            revealId={reveal}
            wrongId={wrong}
            locked={feedback || mapMode === 'prompt'}
            onPick={(id) => setPick(id)}
          />
        </div>
      )}

      <div class="q-answer">
        {!feedback && question.level === 'easy' && !usesMap(question) && (
          <div class="choices">
            {question.choices.map((id) => (
              <button key={id} type="button" class="choice" onClick={() => submit(id)}>
                {optionLabel(question, id)}
              </button>
            ))}
          </div>
        )}

        {!feedback && usesList(question) && (
          <ListPicker question={question} onPick={(id) => submit(id)} />
        )}

        {!feedback && usesFreeText(question) && (
          <form
            class="freetext"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) submit(text.trim());
            }}
          >
            <input
              class="text-input"
              placeholder="Antwort eingeben…"
              value={text}
              autoFocus
              autocomplete="off"
              autocapitalize="words"
              spellcheck={false}
              onInput={(e) => setText((e.target as HTMLInputElement).value)}
            />
            <Button type="submit" disabled={!text.trim()}>
              Prüfen
            </Button>
          </form>
        )}

        {!feedback && usesMap(question) && (
          <div class="map-confirm">
            {/* Never name the tapped country here — that would hand over the
                answer. The map highlights the pick so its shape/location is
                clear without a label. */}
            <span class="pick-label">
              {pick
                ? 'Dein Tipp ist markiert – bestätigen oder ein anderes Land tippen.'
                : 'Tippe das Land auf der Karte.'}
            </span>
            <Button disabled={!pick} onClick={() => pick && submit(pick)}>
              Bestätigen
            </Button>
          </div>
        )}

        {feedback && result && (
          <div class={`feedback ${result.correct ? (result.almost ? 'is-almost' : 'is-correct') : 'is-wrong'}`}>
            <div class="feedback-line">
              {result.correct
                ? result.almost
                  ? 'Fast! Richtig geschrieben:'
                  : 'Richtig!'
                : result.timedOut
                  ? 'Zeit abgelaufen.'
                  : 'Leider falsch.'}
            </div>
            <div class="feedback-answer">
              {BY_ID[question.country].name} — {BY_ID[question.country].cap}
            </div>
            <Button size="lg" onClick={advanceNow}>
              Weiter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Searchable list of every country (medium level). */
function ListPicker({ question, onPick }: { question: Question; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const asCapital = question.direction === 'map->capital';
  const items = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return COUNTRIES.map((c) => ({ id: c.id, label: asCapital ? c.cap : c.name }))
      .filter((x) => !norm || x.label.toLowerCase().includes(norm))
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [q, asCapital]);

  return (
    <div class="listpicker">
      <input
        class="text-input"
        placeholder="Suchen…"
        value={q}
        autoFocus
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
      />
      <ul class="listpicker-list">
        {items.map((x) => (
          <li key={x.id}>
            <button type="button" class="choice" onClick={() => onPick(x.id)}>
              {x.label}
            </button>
          </li>
        ))}
        {!items.length && <li class="muted">Nichts gefunden</li>}
      </ul>
    </div>
  );
}
