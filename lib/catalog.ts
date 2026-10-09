export const categories = ["全部","提示词","Skills","MCP"] as const;
export type Resource = {id:string;title:string;category:string;topic?:string;submissionId?:string;description:string;url:string;tags:string[];content:string;titleEn?:string;descriptionEn?:string;contentEn?:string;originalLanguage?:string;source:string;status:string;updatedAt:string;stars?:number|null;revision?:number;duplicateOf?:string|null;similarity?:number|null};
export const seedResources:Resource[]=[];
export const socialLinks=[["博客","https://tanke.asia/"],["GitHub","https://github.com/tkzzzzzz6"],["B 站","https://space.bilibili.com/336136731"],["X","https://x.com/tkzzzzzz6"],["Telegram","https://t.me/ttkqwe"],["Email","mailto:tk2535550189@gmail.com"],["Steam","https://steamcommunity.com/id/ttkqwe/"]];
