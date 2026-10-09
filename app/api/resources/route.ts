import {topics,inferTopic,topicOf} from "@/lib/taxonomy";
import {z} from "zod";
import {requireUser,protectOrigin,ApiError,errorResponse} from "@/lib/auth";
import {db,listResources,getResource} from "@/lib/store";
import {canonicalUrl,fingerprint,similarity} from "@/lib/dedupe";
export const resourceForm=z.object({id:z.string().max(100).optional(),submissionId:z.string().uuid().optional(),title:z.string().trim().min(1).max(120),category:z.enum(["提示词","Skills","MCP"]),topic:z.enum(topics).optional(),description:z.string().trim().min(1).max(1500),url:z.string().max(2000),tags:z.array(z.string().trim().min(1).max(40)).max(10),content:z.string().max(50000),titleEn:z.string().trim().max(120).default(""),descriptionEn:z.string().trim().max(1500).default(""),contentEn:z.string().trim().max(50000).default(""),source:z.string().trim().min(1).max(150),status:z.enum(["pending","published","hidden","rejected","deleted"]),revision:z.number().int().positive().optional()});
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const all=new URL(request.url).searchParams.get("all")==="1";if(all)await requireUser(true);return Response.json({resources:await listResources(all)},{headers:{"Cache-Control":"no-store"}});}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{
 protectOrigin(request);const user=await requireUser(true);const parsed=resourceForm.safeParse(await request.json());if(!parsed.success)throw new ApiError(400,"请检查标题、分类、正文、标签和来源");const input=parsed.data;
 if(input.content&&!/[\u4e00-\u9fff]/.test(input.content)&&!input.contentEn){input.contentEn=input.content;input.titleEn=input.titleEn||input.title;input.descriptionEn=input.descriptionEn||input.description;input.content="";input.description="等待翻译";}
 if(!input.content&&!input.contentEn)throw new ApiError(400,"至少提供一种语言的正文");
 if(input.status==="published"&&(!input.content||!input.titleEn||!input.descriptionEn||!input.contentEn))throw new ApiError(400,"公开前，请补齐中英标题、简介和正文");
 if(input.category!=="提示词"&&!input.url)throw new ApiError(400,"请填写资源链接");
 let url:string;try{url=canonicalUrl(input.url);}catch(error){throw new ApiError(400,error instanceof Error?error.message:"链接无效");}
 const existing=input.id?await getResource(input.id):null;if(input.id&&!existing)throw new ApiError(404,"资源不存在");
 if(existing?.status==="deleted"&&!['deleted','pending'].includes(input.status))throw new ApiError(400,"请先恢复到候选列表，再审核公开");
 if(!existing&&input.status==="deleted")throw new ApiError(400,"请先添加资源，再移入回收站");
 if(input.submissionId){if(input.id)throw new ApiError(400,"投稿只能转为新候选");const submitted=await db().prepare("SELECT id FROM submissions WHERE id=? AND status='pending'").bind(input.submissionId).first();if(!submitted)throw new ApiError(409,"投稿已经处理，请刷新");}
 input.topic=input.topic||(existing?topicOf(existing):inferTopic(input));const originalLanguage=existing?.originalLanguage||(input.content&&/[\u4e00-\u9fff]/.test(input.content)?"zh":"en");
 const others=(await listResources(true)).filter(resource=>resource.status!=="deleted");const duplicate=others.find(resource=>resource.id!==input.id&&url&&canonicalUrl(resource.url)===url);if(duplicate)throw new ApiError(409,`相同链接已收录：${duplicate.title}，请编辑已有条目`);
 const hash=await fingerprint(JSON.stringify([input.content,input.contentEn]));const exact=others.find(resource=>resource.id!==input.id&&resource.category===input.category&&resource.content===input.content&&resource.contentEn===input.contentEn);let related=exact?.id||null,score=exact?100:0;
 if(!exact&&!existing){for(const resource of others.filter(resource=>resource.category===input.category)){const overlap=Math.round(similarity(input.title+" "+input.description,resource.title+" "+resource.description)*100);if(overlap>score&&overlap>=45){related=resource.id;score=overlap;}}}
 const now=new Date().toISOString(),id=existing?.id||(input.submissionId?"submitted-"+input.submissionId:crypto.randomUUID());
 if(existing){
  if(input.revision!==existing.revision)throw new ApiError(409,"条目已被其他管理员修改，请刷新后重试");
  const result=await db().batch([db().prepare("INSERT INTO versions (id,resource_id,revision,snapshot,actor,created_at) SELECT ?,id,revision,?,?,? FROM resources WHERE id=? AND revision=? ON CONFLICT(resource_id,revision) DO NOTHING").bind(crypto.randomUUID(),JSON.stringify(existing),user.userId,now,id,input.revision),db().prepare("UPDATE resources SET title=?,category=?,topic=?,description=?,url=?,canonical_url=?,tags=?,content=?,title_en=?,description_en=?,content_en=?,content_hash=?,original_language=?,source=?,status=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?").bind(input.title,input.category,input.topic,input.description,input.url,url,JSON.stringify(input.tags),input.content,input.titleEn,input.descriptionEn,input.contentEn,hash,originalLanguage,input.source,input.status,now,id,input.revision)]);
  if(!result[1].meta.changes)throw new ApiError(409,"条目已被修改，请刷新后重试");
 }else{
  const values=[id,input.title,input.category,input.topic,input.description,input.url,url,JSON.stringify(input.tags),input.content,input.titleEn,input.descriptionEn,input.contentEn,hash,originalLanguage,input.source,input.status,now,related,score||null];
  const columns="id,title,category,topic,description,url,canonical_url,tags,content,title_en,description_en,content_en,content_hash,original_language,source,status,updated_at,duplicate_of,similarity";
  if(input.submissionId){
   const results=await db().batch([db().prepare(`INSERT INTO resources (${columns}) SELECT ${values.map(()=>"?").join(",")} FROM submissions WHERE id=? AND status='pending' ON CONFLICT(id) DO NOTHING`).bind(...values,input.submissionId),db().prepare("UPDATE submissions SET status='processed',resource_id=?,revision=revision+1,reviewed_at=?,reviewed_by=? WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM resources WHERE id=?)").bind(id,now,user.userId,input.submissionId,id)]);
   if(!results[0].meta.changes)throw new ApiError(409,"投稿已由其他管理员处理，请刷新");
  }else{await db().prepare(`INSERT INTO resources (${columns}) VALUES (${values.map(()=>"?").join(",")})`).bind(...values).run();}
 }
 return Response.json({resource:await getResource(id)});
 }catch(error){return errorResponse(error);}}
