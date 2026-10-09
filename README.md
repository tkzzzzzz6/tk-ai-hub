# TK 的 AI 工具箱

项目源码保存在 `E:\\code\\tk-ai-hub`。使用 Sites 构建、保存源码版本和发布，目标自定义域名为 ai.tanke.asia，尚未绑定。

## 当前功能

- 雷姆角色插画、蓝白界面、分类、场景筛选、搜索、资源详情与提示词复制。
- D1 数据库存储资源、来源、收藏、用户角色、修改版本和同步记录。
- 授权管理员添加、编辑、审核、隐藏与拒绝；站长授予或撤销管理员。
- 来源身份、规范化 URL、内容指纹、疑似重复提示和数据库唯一约束。
- GitHub 已有项目元数据同步与关键词发现；新资源进入候选列表。拒绝记录保留，重采集不重新发布。
- 内容修改的版本控制与历史恢复；编辑使用版本号防止覆盖并发修改。

## 初版边界

GitHub／邮箱登录经用户同意留待配置，当前使用平台账户身份供初版测试。GitHub／邮箱登录尚未实现；不得把登录入口的说明视为该能力已接通。

AI 摘要与全网检索尚未配置外部服务。当前自动采集保留 GitHub 上游说明，管理员编辑中文摘要后确认发布。首次部署为站长私有测试版；公开访问需后续调整访问策略并完善服务写入授权。

## 本地运行

Node >=22.13.0。保留 package-lock.json：

```sh
npm run install:ci
npm run dev
npm run db:generate
npm run build
```

Windows Volta shim 在插件命令中出现 npm 入口定位问题时，直接使用实际 Node 安装目录下的 npm-cli.js，或 `node scripts/run-framework.mjs dev/build`。不要改动全局运行时配置。

本地数据库迁移按顺序执行 drizzle 中未应用的 SQL：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_broken_iron_patriot.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_massive_catseye.sql
```

部署通过 Sites 插件的 site-workflow.mjs：构建、推送对应源码、打包并保存该版本，再发布和查询终态。发布配置中的 project_id 必须沿用，不要新建另一个 Site。

## 自动更新操作

当前部署必须经 get_site 确认只有站长可访问（custom、无协作者或外部访客），且 SITE_OWNER_PRIVATE=true。POST /api/sync 允许平台服务凭证通过私有站点入口完成公共来源同步；凭证不提供用户身份，接口不能用于授权用户或读取个人收藏。

每次任务运行：
1. Sites get_site 读取 .openai/hosting.json 中同一个 project_id，确认站长私有访问策略，并获取当次服务凭证与 current_live_url。缺少凭证或访问已变更时停止，不调用同步。
2. 将 get_site 的 siwc_bypass_bearer_token 仅以 OAI-Sites-Authorization: Bearer <token> 发送到此 Site 的 POST /api/sync，不存入文件或任务提示。
3. 不发送自定义来源或用户信息；接口只读取 lib/sync.ts 中公开 GitHub 来源，写入候选，已有人工说明保留。
4. 读取同步响应，并通过平台 read_database_table_rows 读取 sync_runs、resources 与 sources 验证保存；同步错误保留原内容，不批量发布。
5. 保持安静，仅在任务失败、需用户操作或有待审核的新候选时通知。

短时间重试由 last-sync-start 限制；外部失败记录在 sync_runs。定时任务是否已建立以 Sites get_site 返回的 automations 和实际创建结果为准。

**公开访问前必须先禁用 SITE_OWNER_PRIVATE，并为后台服务配置独立、可撤销的写入认证。** 不能只改变 Sites 分享设置而保留私有入口信任。人员权限始终由服务端检查。新增身份服务时需把账户关联到稳定身份 ID，并验证权限和收藏隔离。

## 配置

生产运行时值由 Sites 管理：OWNER_EMAIL 为已验证的站长平台邮箱；SITE_ORIGIN 为当前实际站点地址；SITE_OWNER_PRIVATE 只适用于已验证的站长私有部署。可选 GITHUB_TOKEN 提高公开 GitHub API 配额。密钥不写入源码。

## 检查

`node node_modules/typescript/bin/tsc --noEmit` 检查类型；`node scripts/verify-local.mjs` 验证本地授权、收藏、候选、去重、并发版本控制与实际 GitHub 同步，不能对生产地址运行该脚本。

## 图片

public/rem.png 使用内置 imagegen 生成，为雷姆蓝白风格的动漫半身插画；具体提示词见 docs/image-notes.md。

## 链接

博客 https://tanke.asia/；GitHub https://github.com/tkzzzzzz6。其余用户提供的社交链接在 lib/catalog.ts 中。

## 双语内容
提示词和 Skills 的中文、英文标题／简介／正文独立保存，详情桌面左右两栏，手机上下排列，两种语言可分别复制。管理员在公开前需要补齐英文内容。自动采集候选不会自动获得翻译，人工审核后发布。初始 Skills 条目为集合和规范参考，复制的是使用说明。

## 浏览器代理入口
支持 WebMCP 的浏览器可搜索已公开资源并打开详情；不支持时正常使用界面。已在本机浏览器验证两个工具的注册、有效调用和无效输入处理，并读回可见详情。
