import { SettingsStore } from './storage.mjs';

/** Capability profiles preserve the semantics of each game; they never rewrite saves. */
export const GAME_PROFILES = Object.freeze(Object.fromEntries([
  ['agent-pippo', ['easy','normal','challenge'], 'normal', ['effects','voice']],
  ['battleship', ['easy','medium','hard'], 'medium', ['effects']],
  ['f1-paper-circuit', ['normal'], 'normal', []],
  ['hangman', ['easy','medium','hard'], 'easy', ['effects','voice']],
  ['ruota-del-tempo', ['easy','medium'], 'easy', ['effects','voice']],
  ['salti-magici', ['relaxed','normal'], 'relaxed', ['effects','music']],
  ['word-chain', ['2','3'], '2', []],
].map(([gameId, difficulties, difficulty, channels]) => [gameId, Object.freeze({
  gameId, difficulties: Object.freeze(difficulties), difficulty, channels: Object.freeze(channels),
})])));

export function createGameSettings(gameId, options = {}) {
  const profile = GAME_PROFILES[gameId];
  if (!profile) throw new RangeError(`Unknown game profile: ${gameId}`);
  return new SettingsStore({ ...options, gameId, difficulties: [...profile.difficulties],
    defaults: { ...options.defaults, difficulty: profile.difficulty } });
}
