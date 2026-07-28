# Reflex

A Geometry Dash style one-tap runner built as a reaction trainer. Every level is
generated as you play, so there is nothing to memorise and every obstacle is a
fresh reaction.

Expo + React Native, TypeScript. Runs in Expo Go - no Mac needed.

## Running it on your iPhone

```bash
npm start
```

Install **Expo Go** from the App Store, then scan the QR code in the terminal.
Phone and PC need to be on the same Wi-Fi. If your network blocks it (guest
Wi-Fi, corporate AP), use:

```bash
npx expo start --tunnel
```

It also runs in a browser with `npm run web`, which is handy for quick checks on
the PC. The browser build is not the target though - see "Frame driver" below.

## The three modes

| Mode | Trains | How it works |
| --- | --- | --- |
| **BLIND** | Simple reaction time | Spikes pop into view with a shrinking amount of warning. Straight visual reaction test with a jump attached. |
| **GATE** | Choice reaction + impulse control | Red spike = jump. Blue bar = hold. A go/no-go task - you have to identify before you act. |
| **FLOW** | Timing, and fun | Everything visible, track accelerates until you die. The warm-up. |

## Why it is built the way it is

**Procedural, not designed levels.** Geometry Dash trains memorisation - you die
until you know the level. That is the opposite of reaction training. Here the
gaps between obstacles are randomised every spawn, specifically so you can never
settle into a rhythm.

**Difficulty is measured in milliseconds, not pixels.** Each mode declares how
much *warning* you get (`warnStart` -> `warnEnd` in `src/game/config.ts`) and the
engine converts that to pixels against the current speed. Pixels would make
difficulty depend on screen width - a "620px late reveal" is not late at all on
a 375pt phone, which only has ~300pt of track ahead of the player.

**Jumping at a blue bar kills you immediately.** Not on collision - on the tap.
Physically an early jump clears a bar, because you land before it arrives, which
would leave the impulsive tap completely unpunished. In a go/no-go task,
responding to the no-go stimulus *is* the failure regardless of what the
geometry does afterwards.

**Flow does not log reaction times.** Its obstacles are visible from the moment
they spawn, so "reaction time" there is just a spawn-to-tap interval and means
nothing. Those runs store `null` rather than junk.

## How reaction time is measured

The engine timestamps the frame an obstacle becomes visible, and the frame your
tap lands. The difference is the reaction time.

Both timestamps come off the frame clock, so readings are quantised to roughly
8ms and carry a small consistent bias - absolute numbers will read a touch
optimistic against a proper lab test. The bias is constant, so the trend line is
the honest part, and that is what the Progress screen plots.

Verified against a synthetic player with a fixed 250ms reaction: the engine
reported 256ms on every trial.

## Frame driver

`src/game/useFrameLoop.ts` picks a driver per platform.

On native it uses Reanimated's `useFrameCallback`, so the entire game loop -
physics, spawning, collision, timing - runs on the UI thread. That matters more
here than in a normal game: JS-thread jitter would land straight in the
reaction numbers.

On web it falls back to `requestAnimationFrame`, because Reanimated's frame
callback registry is scheduled onto a UI runtime that does not exist there.
Same `step` function either way - babel makes it a worklet on native, and it
stays an ordinary function on web.

Note that `requestAnimationFrame` does not fire at all in a hidden browser tab,
so the web build only animates while its tab is actually visible.

## Layout

```
src/
  game/config.ts        tunables - speeds, gaps, warning times, geometry
  game/engine.ts        the simulation. pooled obstacles, zero allocation per frame
  game/useFrameLoop.ts  per-platform frame driver
  components/Field.tsx  renders the world. transforms only, no per-frame layout
  screens/              menu, game, results, progress
  storage.ts            run history + derived bests (AsyncStorage)
```

The obstacle pool is fixed at 16 slots and both shapes stay mounted, toggled by
opacity. A spawn never changes layout, so the only thing animating per frame is
a transform.

## Testing the simulation

In dev the engine is exposed as `globalThis.__reflex`, so the sim can be driven
by hand instead of by frames:

```js
const e = window.__reflex.engine;
e.start();
for (let i = 0; i < 300; i++) e.step(16);   // 16ms per step
console.log(e.dist.value, e.cleared.value);
```

`e.tap()` fires a jump. Reaction trials are delivered asynchronously via
`runOnJS`, so await a tick before reading `window.__reflex.trials.current`.
