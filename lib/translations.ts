import {db,getResource,ensureCollectionReady} from "./store";
import {fingerprint} from "./dedupe";
import {ApiError} from "./auth";
import type {Resource} from "./catalog";

export type TextVersion={title:string;description:string;content:string};
export type TranslationJob={id:string;kind:"resource"|"update";revision:number;sourceLanguage:"zh"|"en";targetLanguage:"zh"|"en";key:string;text:TextVersion;missingFields:(keyof TextVersion)[];existingTarget:TextVersion};
export const sourceText=(r:Resource,lang:"zh"|"en"):TextVersion=>lang==="en"?{title:r.titleEn||r.title,description:r.descriptionEn||r.description,content:r.contentEn||""}:{title:r.title,description:r.description,content:r.content};
export async function translationKey(text:TextVersion,target:string){return fingerprint(JSON.stringify({text,target,version:1}));}

export async function makeJob(r:Resource,kind:"resource"|"update"="resource",id=r.id):Promise<TranslationJob|null>{
 if(r.status==="deleted")return null;
 const source=r.originalLanguage==="en"?"en":"zh",target=source==="en"?"zh":"en";
 const text=sourceText(r,source);if(!text.content)return null;
 const existingTarget:TextVersion=target==="en"?{title:r.titleEn||"",description:r.descriptionEn||"",content:r.contentEn||""}:{title:r.title,description:r.description,content:r.content};
 // Older English imports used the source title and an explicit placeholder in Chinese fields.
 if(target==="zh"){
  if(!r.content&&r.title===text.title&&!/[\u4e00-\u9fff]/.test(r.title))existingTarget.title="";
  if(["等待翻译","等待自动翻译"].includes(r.description)||(!r.content&&r.description===text.description&&!/[\u4e00-\u9fff]/.test(r.description)))existingTarget.description="";
 }
 const missingFields=(Object.keys(existingTarget) as (keyof TextVersion)[]).filter(field=>!existingTarget[field].trim());
 if(!missingFields.length)return null;
 return {id,kind,revision:r.revision||1,sourceLanguage:source,targetLanguage:target,key:await translationKey(text,target),text,missingFields,existingTarget};
}

export async function translationJobs(){
 await ensureCollectionReady();
 const result=await db().prepare("SELECT * FROM resources WHERE category IN ('提示词','Skills','MCP') AND status IN ('pending','published') ORDER BY updated_at,id").all();
 const {mapResource}=await import("./store");const jobs:TranslationJob[]=[];
 for(const row of result.results){const job=await makeJob(mapResource(row));if(job)jobs.push(job);}
 const updates=await db().prepare("SELECT u.* FROM upstream_updates u JOIN resources r ON r.id=u.resource_id WHERE u.status='pending' AND r.status<>'deleted' ORDER BY u.created_at").all();
 for(const row of updates.results){const r=JSON.parse(String(row.payload)) as Resource;const job=await makeJob(r,"update",String(row.id));if(job)jobs.push(job);}
 return jobs;
}

export function validatePlaceholders(source:string,target:string){
 const original=[...source.matchAll(/\{\{([^{}]+)\}\}/g)].map(m=>m[1].trim());const translated=[...target.matchAll(/\{\{([^{}]+)\}\}/g)].map(m=>m[1].trim());
 if(original.length!==translated.length)throw new ApiError(400,"翻译必须保留全部 {{变量}} 占位符");
 const pairs=new Map<string,string>();for(let i=0;i<original.length;i++){if(pairs.has(original[i])&&pairs.get(original[i])!==translated[i])throw new ApiError(400,"重复变量必须采用一致的翻译名称");pairs.set(original[i],translated[i]);}
}

export async function saveTranslation(input:{id:string;kind:"resource"|"update";revision:number;key:string;translated:TextVersion},actor:string){
 let resource:Resource|null=null;
 if(input.kind==="resource")resource=await getResource(input.id);
 else{const row=await db().prepare("SELECT u.payload FROM upstream_updates u JOIN resources r ON r.id=u.resource_id WHERE u.id=? AND u.status='pending' AND r.status<>'deleted'").bind(input.id).first<{payload:string}>();if(row)resource=JSON.parse(row.payload);}
 if(!resource)throw new ApiError(404,"待翻译资源不存在");
 if(resource.status==="deleted")throw new ApiError(409,"资源已删除，请先恢复到候选列表");
 const job=await makeJob(resource,input.kind,input.id);if(!job)return {skipped:true,message:"对应语言已存在，已复用"};
 if(job.key!==input.key||job.revision!==input.revision)throw new ApiError(409,"原文已改变，请重新读取翻译任务");
 if(job.missingFields.includes("content")){
  validatePlaceholders(job.text.content,input.translated.content);
  if(job.targetLanguage==="en"&&/[\u4e00-\u9fff]/.test([...input.translated.content.matchAll(/\{\{([^{}]+)\}\}/g)].map(m=>m[1]).join("")))throw new ApiError(400,"英文版的 {{变量}} 名称也必须翻译为英文");
 }
 const target={...job.existingTarget};for(const field of job.missingFields)target[field]=input.translated[field];
 const now=new Date().toISOString();const r=job.targetLanguage==="en"?{...resource,titleEn:target.title,descriptionEn:target.description,contentEn:target.content}:{...resource,...target};
 const statements=[db().prepare("INSERT INTO translation_cache (id,source_language,target_language,source_text,translated,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(job.key,job.sourceLanguage,job.targetLanguage,JSON.stringify(job.text),JSON.stringify(target),now)];
 if(input.kind==="resource"){
  statements.push(db().prepare("INSERT INTO versions (id,resource_id,revision,snapshot,actor,created_at) SELECT ?,id,revision,?,?,? FROM resources WHERE id=? AND revision=? ON CONFLICT(resource_id,revision) DO NOTHING").bind(crypto.randomUUID(),JSON.stringify(resource),actor,now,input.id,input.revision),db().prepare("UPDATE resources SET title=?,description=?,content=?,title_en=?,description_en=?,content_en=?,content_hash=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?").bind(r.title,r.description,r.content,r.titleEn||"",r.descriptionEn||"",r.contentEn||"",await fingerprint(JSON.stringify([r.content,r.contentEn])),now,input.id,input.revision));
 }else{statements.push(db().prepare("UPDATE upstream_updates SET payload=? WHERE id=? AND status='pending' AND payload=? AND EXISTS (SELECT 1 FROM resources WHERE id=upstream_updates.resource_id AND status<>'deleted')").bind(JSON.stringify({...r,revision:(r.revision||1)+1}),input.id,JSON.stringify(resource)));}
 const writes=await db().batch(statements);if(!writes.at(-1)?.meta.changes)throw new ApiError(409,"资源已修改，译文缓存已保存，请重新读取任务");
 return {saved:true,id:input.id,targetLanguage:job.targetLanguage,filledFields:job.missingFields};
}

export async function reuseTranslations(){let reused=0;for(const job of await translationJobs()){const cached=await db().prepare("SELECT translated FROM translation_cache WHERE id=?").bind(job.key).first<{translated:string}>();if(cached){try{await saveTranslation({...job,translated:JSON.parse(cached.translated)},"translation-cache");reused++;}catch(e){if(!(e instanceof ApiError&&e.status===409))throw e;}}}return {reused,remaining:(await translationJobs()).length};}
