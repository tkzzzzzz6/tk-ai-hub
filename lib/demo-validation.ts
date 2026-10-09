import { z } from "zod";
import { demoTypes, validDemoUrl } from "./demo";

export const demoFormFields = {
  demoUrl: z.string().trim().max(2000).refine(value => !value || !!validDemoUrl(value), "效果展示链接应为不含账号密码的 HTTPS 地址").optional(),
  demoType: z.enum(demoTypes).optional(),
};
