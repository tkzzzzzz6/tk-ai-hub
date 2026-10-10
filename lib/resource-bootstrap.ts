import {configuredResources,catalogImports} from "./resource-catalog";
import {canonicalUrl,fingerprint} from "./dedupe";

/** Apply owner-approved file imports once. Existing IDs and admin edits win. */
export async function importConfiguredResources(database:D1Database){
 const resources=new Map(configuredResources.map(resource=>[resource.id,resource]));
 for(const batch of catalogImports){
  if(await database.prepare("SELECT value FROM settings WHERE key=?").bind(batch.key).first())continue;
  const now=new Date().toISOString();
  const statements:D1PreparedStatement[]=[];
  for(const id of batch.resourceIds){
   const resource=resources.get(id)!;
   const url=canonicalUrl(resource.url);
   const values=[resource.id,resource.title,resource.category,resource.topic||"未分类",resource.description,resource.url,resource.demoUrl||"",resource.demoType||"auto",url,JSON.stringify(resource.tags),resource.content,resource.titleEn,resource.descriptionEn,resource.contentEn,await fingerprint(JSON.stringify([resource.content,resource.contentEn])),resource.originalLanguage,resource.source,batch.status,now];
   const sourceGuard=batch.dedupeSourceUrl&&url?" AND NOT EXISTS (SELECT 1 FROM resources WHERE canonical_url=? AND status<>'deleted')":"";
   statements.push(database.prepare(`INSERT INTO resources (id,title,category,topic,description,url,demo_url,demo_type,canonical_url,tags,content,title_en,description_en,content_en,content_hash,original_language,source,status,updated_at) SELECT ${values.map(()=>"?").join(",")} WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key=?)${sourceGuard} ON CONFLICT(id) DO NOTHING`).bind(...values,batch.key,...(sourceGuard?[url]:[])));
  }
  statements.push(database.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING").bind(batch.key,JSON.stringify({resourceIds:batch.resourceIds,status:batch.status,addedAt:now})));
  // D1 batches are transactional: the marker cannot survive a failed resource insert.
  await database.batch(statements);
 }
}
