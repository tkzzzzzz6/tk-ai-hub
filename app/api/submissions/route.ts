import {z} from "zod";
import {requireUser,protectOrigin,ApiError,errorResponse} from "@/lib/auth";
import {createSubmission,listSubmissions} from "@/lib/submissions";
import {db} from "@/lib/store";
export const dynamic="force-dynamic";
export async function GET(){try{await requireUser(true);return Response.json({submissions:await listSubmissions()},{headers:{"Cache-Control":"no-store"}});}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{protectOrigin(request);const text=await request.text();if(text.length>40000)throw new ApiError(413,"资料过长，请分次提交");return Response.json(await createSubmission(request,JSON.parse(text)));}catch(error){return errorResponse(error);}}
export async function PATCH(request:Request){try{protectOrigin(request);const user=await requireUser(true);const parsed=z.object({id:z.string().uuid(),revision:z.number().int().positive(),action:z.literal("reject")}).safeParse(await request.json());if(!parsed.success)throw new ApiError(400,"审核请求无效");const {id,revision}=parsed.data;const write=await db().prepare("UPDATE submissions SET status='rejected',revision=revision+1,reviewed_at=?,reviewed_by=? WHERE id=? AND revision=? AND status='pending'").bind(new Date().toISOString(),user.userId,id,revision).run();if(!write.meta.changes)throw new ApiError(409,"资料已由其他管理员处理，请刷新");return Response.json({saved:true});}catch(error){return errorResponse(error);}}
