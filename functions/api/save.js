import {handleSave} from '../../backend/save.mjs';
export function onRequest({request,env}){return handleSave(request,env);}
