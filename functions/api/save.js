import {handleSave} from '../../backend/save.js';
export function onRequest({request,env}){return handleSave(request,env);}
