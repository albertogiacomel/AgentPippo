// Consumer-specific defaults and migrations are separate from the generic core.
const field=(from,to)=>({from,to});
const theme=()=>({key:'theme',encoding:'text',fields:[field('','theme')]});
export const BUILTIN_PROFILES=[
  {gameId:'agent-pippo',difficulties:['easy','normal','challenge'],difficulty:'normal',channels:['effects','voice'],defaults:{theme:'dark'},messages:{it:{voice:'Lettura automatica'},en:{voice:'Read dialogues aloud'}},legacy:[
    {key:'agent_pippo_settings',fields:[field('language','language'),field('sounds','effects'),field('difficulty','difficulty')]},
    {key:'porto_buffo_v2',fields:[field('voice','voice')]}]},
  {gameId:'battleship',difficulties:['easy','medium','hard'],difficulty:'medium',channels:['effects'],legacy:[theme()]},
  {gameId:'f1-paper-circuit',difficulties:['normal'],difficulty:'normal',channels:[],defaults:{theme:'light'}},
  {gameId:'hangman',difficulties:['easy','medium','hard'],difficulty:'easy',channels:['effects','voice'],defaults:{theme:'light'},legacy:[theme(),
    {key:'appLanguage',encoding:'text',fields:[field('','language')]},
    {key:'sfxEnabled',fields:[field('','effects')]},
    {key:'italianHangmanState',fields:[field('currentDifficulty','difficulty')]}]},
  {gameId:'ruota-del-tempo',difficulties:['easy','medium'],difficulty:'easy',channels:['effects','voice'],defaults:{theme:'light'}},
  {gameId:'salti-magici',difficulties:['relaxed','normal'],difficulty:'relaxed',channels:['effects','music'],defaults:{theme:'light'},legacy:[
    {key:'salti_magici_v1',fields:[field('language','language'),field('sound','effects'),field('sound','music'),field('difficulty','difficulty')]}]},
  {gameId:'word-chain',difficulties:['2','3'],difficulty:'2',channels:[],legacy:[theme()]},
];
