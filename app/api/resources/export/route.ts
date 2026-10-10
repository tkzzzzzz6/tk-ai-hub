import {listResources} from "@/lib/store";
import {exportResource} from "@/lib/resource-export";
import {ApiError,errorResponse} from "@/lib/auth";

export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{
  const id=new URL(request.url).searchParams.get("id");
  const resources=(await listResources()).filter(resource=>!id||resource.id===id);
  if(id&&!resources.length)throw new ApiError(404,"公开资源不存在");
  return new Response(JSON.stringify(resources.map(exportResource),null,2)+"\n",{headers:{
   "Content-Type":"application/json; charset=utf-8",
   "Content-Disposition":'attachment; filename="tk-ai-hub-resources.json"',
   "Cache-Control":"no-store",
   "X-Content-Type-Options":"nosniff",
  }});
 }catch(error){return errorResponse(error);}
}
