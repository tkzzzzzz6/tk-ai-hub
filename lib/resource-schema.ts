import {z} from "zod";
import {demoFormFields} from "./demo-validation";
import {topics} from "./taxonomy";

/** One data contract for file intake and authenticated API writes. */
export const resourceForm=z.object({
 ...demoFormFields,
 id:z.string().min(1).max(100).optional(),
 submissionId:z.string().uuid().optional(),
 title:z.string().trim().min(1).max(120),
 category:z.enum(["提示词","Skills","MCP"]),
 topic:z.enum(topics).optional(),
 description:z.string().trim().min(1).max(1500),
 url:z.string().max(2000),
 tags:z.array(z.string().trim().min(1).max(40)).max(10),
 content:z.string().max(50000),
 titleEn:z.string().trim().max(120).default(""),
 descriptionEn:z.string().trim().max(1500).default(""),
 contentEn:z.string().trim().max(50000).default(""),
 source:z.string().trim().min(1).max(150),
 status:z.enum(["pending","published","hidden","rejected","deleted"]),
 revision:z.number().int().positive().optional(),
});

export const catalogResourceSchema=resourceForm.extend({
 id:z.string().min(1).max(100),
 updatedAt:z.string(),
 originalLanguage:z.enum(["zh","en"]),
}).superRefine((resource,context)=>{
 if(!resource.content&&!resource.contentEn)context.addIssue({code:"custom",message:"At least one body is required"});
 if(resource.category!=="提示词"&&!resource.url)context.addIssue({code:"custom",message:"Skills and MCP require a source URL"});
 if(resource.status==="published"&&(!resource.content||!resource.titleEn||!resource.descriptionEn||!resource.contentEn))context.addIssue({code:"custom",message:"Published resources require complete Chinese and English content"});
});
