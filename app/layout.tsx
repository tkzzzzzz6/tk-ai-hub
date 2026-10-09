import type { Metadata } from "next"; import "./globals.css"; import "./liquid-glass.css";
export const metadata:Metadata={title:"TK 的 AI 工具箱 · 提示词、Skills 与 MCP",description:"按用途分类浏览提示词、Skills 与 MCP，保留中英双语内容，搜索并收藏喜欢的资源。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
