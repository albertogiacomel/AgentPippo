import { SettingsStore, SETTINGS_DEFAULTS } from './storage.mjs';
import { BUILTIN_PROFILES } from './presets.mjs';
const profiles=new Map();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export function registerGameProfile(definition){
  if(!definition||typeof definition.gameId!=='string'||!/^[a-z0-9][a-z0-9_-]*$/i.test(definition.gameId))throw new TypeError('Invalid game profile ID');
  if(profiles.has(definition.gameId))throw new Error('Game profile already registered: '+definition.gameId);
  const {gameId,difficulties=['normal'],difficulty=difficulties[0],channels=[],defaults={},messages={},legacy=[]}=definition;
  if(!difficulties.length||new Set(difficulties).size!==difficulties.length||!difficulties.every(v=>typeof v==='string'&&v)||!difficulties.includes(difficulty)||new Set(channels).size!==channels.length||channels.some(v=>!['effects','music','voice'].includes(v)))throw new TypeError('Invalid profile capabilities');
  if(Object.keys(defaults).some(key=>!Object.hasOwn(SETTINGS_DEFAULTS,key))||!Array.isArray(legacy)||legacy.some(adapter=>typeof adapter.key!=='string'||!adapter.key||!['text','json',undefined].includes(adapter.encoding)||!Array.isArray(adapter.fields)||adapter.fields.some(field=>typeof field.from!=='string'||!Object.hasOwn(SETTINGS_DEFAULTS,field.to))))throw new TypeError('Invalid profile defaults or legacy adapters');
  const profile=freeze(structuredClone({gameId,difficulties,difficulty,channels,defaults,messages,legacy}));
  new SettingsStore({gameId,difficulties,defaults:{...defaults,difficulty},storage:{getItem:()=>null,setItem:()=>{}}});
  profiles.set(gameId,profile);return profile;
}
for(const profile of BUILTIN_PROFILES)registerGameProfile(profile);
export const GAME_PROFILES=Object.freeze(Object.fromEntries(profiles));
export function getGameProfile(gameId){const profile=profiles.get(gameId);if(!profile)throw new RangeError('Unknown game profile: '+gameId);return profile;}
export const listGameProfiles=()=>Object.freeze([...profiles.values()]);
export function createGameSettings(gameId,options={}){
  const profile=getGameProfile(gameId);
  return new SettingsStore({...options,gameId,difficulties:[...profile.difficulties],defaults:{...profile.defaults,...options.defaults,difficulty:profile.difficulty}});
}
