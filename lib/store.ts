import {demoTypes,type DemoType} from "./demo";
import {inferTopic} from "./taxonomy";
import {importConfiguredResources} from "./resource-bootstrap";
import {env} from "cloudflare:workers";import {Resource} from "./catalog";
export function db(){if(!env.DB)throw new Error("数据库暂时不可用");return env.DB;}
export function mapResource(r:Record<string,unknown>):Resource{return {id:String(r.id),title:String(r.title),category:String(r.category),topic:String(r.topic||inferTopic({title:String(r.title),titleEn:String(r.title_en||""),description:String(r.description),descriptionEn:String(r.description_en||""),tags:JSON.parse(String(r.tags)),content:String(r.content),contentEn:String(r.content_en||"")})),description:String(r.description),url:String(r.url),demoUrl:String(r.demo_url||""),demoType:demoTypes.includes(r.demo_type as DemoType)?r.demo_type as DemoType:"auto",tags:JSON.parse(String(r.tags)),content:String(r.content),titleEn:String(r.title_en||""),descriptionEn:String(r.description_en||""),contentEn:String(r.content_en||""),originalLanguage:String(r.original_language||"zh"),source:String(r.source),status:String(r.status),updatedAt:String(r.updated_at),stars:r.stars===null?null:Number(r.stars),revision:Number(r.revision),duplicateOf:r.duplicate_of?String(r.duplicate_of):null,similarity:r.similarity?Number(r.similarity):null};}
export const COLLECTION_RESET_KEY="catalog-clear-2026-10-09-v1";
const RESET_CUTOFF="2026-10-09T15:28:06Z";
async function resetExistingCollection(){
 const database=db();
 if(await database.prepare("SELECT value FROM settings WHERE key=?").bind(COLLECTION_RESET_KEY).first())return;
 // One authorized reset of the existing collection; later additions and restores are untouched.
 const rows=(await database.prepare("SELECT * FROM resources WHERE category IN ('提示词','Skills','MCP') AND status<>'deleted' AND (updated_at='' OR julianday(updated_at)<=julianday(?))").bind(RESET_CUTOFF).all()).results;
 const now=new Date().toISOString(),statements=[];
 for(const row of rows){
  const resource=mapResource(row);
  statements.push(database.prepare("INSERT INTO versions (id,resource_id,revision,snapshot,actor,created_at) SELECT ?,id,revision,?,?,? FROM resources WHERE id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM settings WHERE key=?) ON CONFLICT(resource_id,revision) DO NOTHING").bind(crypto.randomUUID(),JSON.stringify(resource),"site-owner:collection-reset",now,resource.id,resource.revision,COLLECTION_RESET_KEY));
  statements.push(database.prepare("UPDATE resources SET status='deleted',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM settings WHERE key=?)").bind(now,resource.id,resource.revision,COLLECTION_RESET_KEY));
 }
 statements.push(database.prepare("UPDATE upstream_updates SET status='deleted' WHERE status='pending' AND resource_id IN (SELECT id FROM resources WHERE status='deleted') AND NOT EXISTS (SELECT 1 FROM settings WHERE key=?)").bind(COLLECTION_RESET_KEY));
 statements.push(database.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING").bind(COLLECTION_RESET_KEY,JSON.stringify({cutoff:RESET_CUTOFF,archived:rows.length,completedAt:now})));
 await database.batch(statements);
}
export async function listResources(all=false){await ensureCollectionReady();const result=await db().prepare(all?"SELECT * FROM resources WHERE category IN ('提示词','Skills','MCP') ORDER BY updated_at DESC,title":"SELECT * FROM resources WHERE category IN ('提示词','Skills','MCP') AND status='published' AND (category NOT IN ('提示词','Skills') OR (title_en<>'' AND description_en<>'' AND content_en<>'')) ORDER BY category,title").all();return result.results.map(r=>mapResource(r));}
export async function getResource(id:string){await ensureCollectionReady();const r=await db().prepare("SELECT * FROM resources WHERE id=?").bind(id).first<Record<string,unknown>>();return r?mapResource(r):null;}

export async function ensureCollectionReady(){await resetExistingCollection();await importConfiguredResources(db());}
