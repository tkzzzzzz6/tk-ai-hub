import type {Resource} from "./catalog";

/** Export the public resource contract, without users, moderation or history data. */
export function exportResource(resource:Resource){
 return {
  id:resource.id,title:resource.title,titleEn:resource.titleEn||"",
  category:resource.category,topic:resource.topic,description:resource.description,
  descriptionEn:resource.descriptionEn||"",url:resource.url,
  demoUrl:resource.demoUrl||"",demoType:resource.demoType||"auto",
  tags:[...resource.tags],content:resource.content,contentEn:resource.contentEn||"",
  originalLanguage:resource.originalLanguage||"zh",source:resource.source,
  status:resource.status,updatedAt:resource.updatedAt,
 };
}
