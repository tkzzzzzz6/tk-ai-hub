import {z} from "zod";
import resourceData from "@/data/resources.json";
import importData from "@/data/catalog-imports.json";
import {catalogResourceSchema} from "./resource-schema";

/** Data is imported here, never embedded in a page or a database handler. */
export const configuredResources=z.array(catalogResourceSchema).parse(resourceData);
export const catalogImports=z.array(z.object({
 key:z.string().min(1),
 resourceIds:z.array(z.string().min(1)).min(1),
 status:z.enum(["pending","published"]),
 dedupeSourceUrl:z.boolean(),
})).parse(importData);

const byId=new Map(configuredResources.map(resource=>[resource.id,resource]));
if(byId.size!==configuredResources.length)throw new Error("Resource catalog contains duplicate IDs");
for(const batch of catalogImports){
 for(const id of batch.resourceIds){
  const resource=byId.get(id);
  if(!resource)throw new Error(`Catalog import references missing resource: ${id}`);
  if(batch.status==="published"&&(!resource.content||!resource.titleEn||!resource.descriptionEn||!resource.contentEn))throw new Error(`Public import lacks bilingual content: ${id}`);
 }
}
