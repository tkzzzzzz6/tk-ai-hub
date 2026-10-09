import {ApiError} from "./auth";
// Collection is now curated from user-provided material; old repository ingestion is disabled.
export async function synchronize(){throw new ApiError(410,"旧仓库采集已停用，请通过投稿、手动添加或 GPT 导入收录资料");}
