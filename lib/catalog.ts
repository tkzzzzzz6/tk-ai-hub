import type {DemoFields} from "./demo";
import siteConfig from "@/data/site.json";
export const categories = siteConfig.categories;
export type Resource = DemoFields & {id:string;title:string;category:string;topic?:string;submissionId?:string;description:string;url:string;tags:string[];content:string;titleEn?:string;descriptionEn?:string;contentEn?:string;originalLanguage?:string;source:string;status:string;updatedAt:string;stars?:number|null;revision?:number;duplicateOf?:string|null;similarity?:number|null};
export const socialLinks = siteConfig.socialLinks;
