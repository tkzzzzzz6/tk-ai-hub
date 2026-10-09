import type { Metadata } from "next"; import "./globals.css";
export const metadata:Metadata={title:"TK 的 AI 工具箱 · 工具、提示词与 Skills",description:"发现和收藏 AI 工具、提示词、Skills、MCP 与工作流。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}