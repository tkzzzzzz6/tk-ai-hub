import type { Metadata } from "next"; import "./globals.css";
export const metadata:Metadata={title:"TK 的 AI 工具箱 · 提示词、Skills 与 MCP",description:"收藏、搜索和管理提示词、Skills 与 MCP，跟踪仓库更新并保存双语版本。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}