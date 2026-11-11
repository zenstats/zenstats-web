# ZenStats 追踪脚本

ZenStats 追踪脚本是一个按功能构建的 JavaScript 代码片段（默认 script.js 约 6.2 KB，gzip 约 2.6 KB），可追踪页面浏览、停留时间、滚动深度、自定义事件、站外链接、文件下载和表单提交。支持 React、Vue、Angular 和纯 HTML 等所有框架。

## 目录

- [安装](#安装)
- [可选分析模块接入](#可选分析模块接入)
- [点击热力图](#点击热力图)
- [可选滚动深度热力图](#可选滚动深度热力图)
- [Core Web Vitals](#core-web-vitals)
- [脚本版本（功能选择）](#脚本版本功能选择)
- [脚本标签属性](#脚本标签属性)
- [自动追踪](#自动追踪)
- [自定义事件（Tagged Events）](#自定义事件tagged-events)
- [JavaScript 手动追踪](#javascript-手动追踪)
- [SPA 路由](#spa-路由)
- [目标与转化](#目标与转化)
- [漏斗分析](#漏斗分析)
- [隐私与数据](#隐私与数据)
- [集成指南](#集成指南)
- [常见问题](#常见问题)
- [API 参考](#api-参考)

---

## 安装

### 快速开始

1. 在 ZenStats 后台进入站点的 **安装统计代码** 页面
2. 勾选需要的功能
3. 复制生成的 `<script>` 代码片段
4. 粘贴到每个页面的 `<head>` 中：

```html
<script defer crossorigin="anonymous" data-domain="yourdomain.com" src="https://your-zenstats-domain.com/js/script.js"></script>
```

将 `yourdomain.com` 替换为在 ZenStats 中注册的域名，`your-zenstats-domain.com` 替换为 ZenStats 实例的域名。

---

## 可选分析模块接入

进入 **站点设置 → 安装统计代码**，先选择基础脚本功能，再按需勾选 **点击／滚动热力图** 和 **Core Web Vitals 性能监控**。两项默认不勾选，支持分别开启或组合接入。选择可选项会切换为对应预编译脚本变体，并加入发布版本等属性；基础功能和 Hash 路由会一并保留。默认 `script.js`、`script.hash.js` 不含热力图或性能加载器，即使添加属性也不会加载模块。

**勾选安装选项只生成代码，不保存站点采集开关。** 还需在热力图「采集设置」或「性能监控设置」开启服务端采集，并配置各自的路径白名单和采样率。两类采集默认关闭，初始采样率均为10%。滚动深度在热力图设置中单独开启，沿用 `data-heatmap="true"`，没有 `data-scroll` 属性。

```html
<script defer crossorigin="anonymous"
  data-domain="example.com"
  src="https://your-zenstats-domain.com/js/script.heatmap.performance.js"
  data-heatmap="true"
  data-heatmap-version="release-1"
  data-heatmap-variant="default"
  data-performance="true"
  data-performance-version="release-1"></script>
```

- 只安装一个 Tracker 标签，替换为安装页生成的脚本地址并保留属性。Hash 站点选择对应 Hash 能力变体，例如 `script.hash.heatmap.performance.js`；自定义 `data-api`、页面排除等配置继续保留。旧的 `script.js` / `script.hash.js` 加属性接入方式需重新生成代码。
- 更新 API 和 Tracker 资源。热力图模块为 `heatmap.js`；性能模块为 `vitals.js`，同时提供 `web-vitals.LICENSE.txt`。模块默认从基础脚本的同目录加载，自托管或代理时需要一并提供。
- 每次发布更新 `release-1`。安装页面为两种模块生成相同的初始版本值，但两个属性独立，可以手动设置不同版本。
- 热力图聚合标识可选，仅为布局相同的页面设置。全站公共模板建议留空，并在热力图设置中用路径规则分组，避免把不相关页面混在一起；首条匹配规则优先于 `data-heatmap-key`。
- 发布版本、聚合标识和变体最长120字符，支持英文字母、数字及 `_.:/@-`；请勿填入用户身份或敏感信息。
- 可选分析不增加普通PV、UV、Session和业务事件数。服务器返回202仅表示进入内存队列，需通过管理员的「采集质量」核对持久化、待写、重试和丢弃。

## 脚本版本（功能选择）

ZenStats 根据你选择的功能编译优化的脚本变体。与传统分析脚本打包所有功能不同，ZenStats 只包含你实际需要的代码——保持网站加载速度。

在 **安装统计代码** 页面勾选功能复选框即可。代码片段中的脚本 URL 会自动更新为对应的预编译文件。

| 功能 | 勾选框 | 脚本 URL 示例 | 说明 |
|------|--------|-------------|------|
| **自定义事件** | ☑ 自定义事件 | `script.te.js` | 通过 CSS 类名（`event-name=...`）追踪点击和表单 |
| **站外链接** | ☑ 站外链接 | `script.ol.js` | 自动追踪指向外部域名的链接点击 |
| **文件下载** | ☑ 文件下载 | `script.fd.js` | 自动追踪文档/媒体/压缩包链接点击 |
| **Hash 路由** | ☑ Hash 路由模式 | `script.ha.js` | 使用 `hashchange` 而非 History API 追踪 SPA 导航 |
| **页面排除规则** | ☑ 页面排除规则 | `script.ex.js` | 按路径模式包含/排除页面追踪 |
| **手动 Pageview URL** | ☑ 手动 Pageview URL | `script.ma.js` | 通过 `options.u` / `options.url` 覆盖追踪的 URL |

### 脚本文件命名

```
script.js                            ← 全部基础功能，不含 Hash（向后兼容别名）
script.hash.js                       ← 全部基础功能，含 Hash
script.bare.js                       ← 基础页面浏览与参与度
script.{ex}.{fd}.{ha}.{hm}.{ma}.{ol}.{pf}.{te}.js   ← 任意组合，按字母排序
```

**缩写对照：** `ex` = 页面排除, `fd` = 文件下载, `ha` = Hash 路由, `hm` = 点击／滚动热力图, `pf` = 性能监控, `ma` = 手动 URL, `ol` = 站外链接, `te` = 自定义事件。

### 常用可选构建组合

| 选择 | 普通路由 | Hash 路由 |
|------|----------|-----------|
| 不选热力图／性能 | `script.js` | `script.hash.js` |
| 热力图 | `script.heatmap.js` | `script.hash.heatmap.js` |
| 性能监控 | `script.performance.js` | `script.hash.performance.js` |
| 两项都选 | `script.heatmap.performance.js` | `script.hash.heatmap.performance.js` |

这些别名包含其余全部基础功能。自定义组合按8个构建标识排序，例如仅热力图为 `script.hm.js`，仅性能为 `script.pf.js`，两项为 `script.hm.pf.js`。共256种组合；`hm` 与 `pf` 默认不选，未选择的加载器及生命周期钩子会在构建时移除。

### 文件体积

以下为可选构建调整后的近似大小，实际以构建输出为准。可选模块不包含在基础脚本体积中；热力图需显式添加属性才加载模块，性能模块还需通过服务端配置、路径和采样检查。

| 资源 | 压缩前 | gzip |
|------|--------|------|
| `script.bare.js` | 4.4 KB | 1.8 KB |
| `script.js` | 6.2 KB | 2.6 KB |
| `script.hash.js` | 6.1 KB | 2.6 KB |
| `script.heatmap.js` | 7.1 KB | 2.9 KB |
| `script.performance.js` | 7.7 KB | 3.2 KB |
| `script.heatmap.performance.js` | 8.6 KB | 3.4 KB |
| `heatmap.js`（点击与滚动共用） | 9.0 KB | 3.4 KB |
| `vitals.js`（含官方标准库） | 13.0 KB | 5.1 KB |

---

## 脚本标签属性

| 属性 | 必填 | 对应功能 | 说明 |
|------|------|---------|------|
| `data-domain` | 是 | — | 在 ZenStats 中注册的域名 |
| `data-api` | 否 | — | 自定义 API 端点（默认：脚本同源的 `/api/event`） |
| `data-include` | 否 | 页面排除规则 | 逗号分隔的路径模式。设置后 **仅** 匹配页面被追踪。支持 `*`（单段）和 `**`（多段）。 |
| `data-exclude` | 否 | 页面排除规则 | 逗号分隔的路径模式。匹配页面 **排除** 追踪。支持 `*` 和 `**`。 |
| `data-file-types` | 否 | 文件下载 | 逗号分隔的文件扩展名（默认：`pdf,xlsx,docx,…`）。 |
| `data-heatmap` | 否 | 热力图 | 需先选择含 `hm` 能力的变体；设为 `true` 接入点击／滚动模块，服务端采集仍需开启。 |
| `data-heatmap-version` | 否 | 热力图 | 页面布局发布版本，默认 `unknown`；建议显式设置并随发布更新。 |
| `data-heatmap-key` | 否 | 热力图 | 同类页面聚合标识；首条匹配路径规则优先，未配置时按具体页面查看。 |
| `data-heatmap-variant` | 否 | 热力图 | 变体标识，默认 `default`。 |
| `data-heatmap-api` | 否 | 热力图 | 可选API根路径，不带 `/config`、`/clicks` 或 `/scroll`；默认由 `data-api` 推导。 |
| `data-heatmap-src` | 否 | 热力图 | 模块地址，默认基础脚本同目录的 `heatmap.js`。 |
| `data-performance` | 否 | 性能监控 | 需先选择含 `pf` 能力的变体；设为 `true` 接入Core Web Vitals，还需服务端开启、路径匹配及采样命中。 |
| `data-performance-version` | 否 | 性能监控 | 性能发布版本，默认 `unknown`。 |
| `data-performance-api` | 否 | 性能监控 | 可选API根路径，不带 `/config` 或 `/reports`；默认由 `data-api` 推导。 |
| `data-performance-src` | 否 | 性能监控 | 模块地址，默认基础脚本同目录的 `vitals.js`。 |

> **注意：** 旧文档中的 `data-outbound-links` 和 `data-file-downloads` 属性不再存在——这些功能通过安装页面的勾选框启用，由脚本文件名决定包含哪些代码。


可选模块默认把事件端点末尾 `/event` 替换为 `/heatmap` 或 `/performance`，例如 `/collect/event` 对应 `/collect/heatmap` 与 `/collect/performance`。如果事件路径不以 `/event` 结尾，则默认使用该源的 `/api/heatmap` 和 `/api/performance`。使用自定义转发路径时应显式填写对应 `*-api` 属性，并代理这些配置和上报路由；只代理 `/js/` 并不能转发采集请求。

### 页面排除规则示例

```html
<!-- 只追踪 /blog/ 和 /docs/ 子页面 -->
<script defer data-domain="example.com" data-include="/blog/**, /docs/**" src="...script.ex.js"></script>

<!-- 追踪除 /admin/ 和 /internal/ 之外的所有页面 -->
<script defer data-domain="example.com" data-exclude="/admin/**, /internal/**" src="...script.ex.js"></script>

<!-- 通配符：排除所有 .php 页面 -->
<script defer data-domain="example.com" data-exclude="*.php" src="...script.ex.js"></script>
```

排除检查在每个 pageview 事件发生时运行。不匹配的页面会被静默忽略（回调中 `ignored: true`）。

### 自定义文件类型

```html
<script defer data-domain="example.com" data-file-types="pdf,zip,csv" src="...script.fd.js"></script>
```

### 代理设置（推荐）

从你的域名提供脚本，绕过广告拦截器：

**Caddy：**

```
example.com {
    handle /js/* {
        reverse_proxy your-zenstats-domain.com
    }
}
```

**Nginx：**

```nginx
location /js/ {
    proxy_pass https://your-zenstats-domain.com/js/;
    proxy_set_header Host your-zenstats-domain.com;
}
```

---

## 自动追踪

安装脚本后，ZenStats 会自动追踪：

### 页面浏览

- 初始页面加载
- 浏览器前进/后退导航
- SPA 路由变化（History API 或 Hash 路由，取决于脚本版本）

### 用户参与（停留时间与滚动深度）

- **活跃时间**：仅在标签页可见且有焦点时计算
- **滚动深度**：达到的最大滚动百分比
- 活跃期间每 10 秒记录一次时长增量；切换页面、失去焦点、隐藏标签页或离开页面时补记剩余时长
- 页面隐藏或触发 `pagehide` 时立即发送队列，短于 2 秒的访问也会尝试上报
- `time_on_page` = 上报的活跃时长总和 / 页面浏览量；没有参与事件的浏览按 0 秒计入。后台时间不计入活跃时长
- engagement 心跳不计入事件总数，也不会单独改变跳出状态

### 站外链接点击

启用 **站外链接** 功能后，指向外部域名的 `<a>` 元素点击会被追踪为 `Outbound Link: Click`，附带 `url` 属性。伪协议（`javascript:`、`mailto:`、`tel:`）自动排除。

### 文件下载

启用 **文件下载** 功能后，结尾为已知文件扩展名的链接点击被追踪为 `File Download`，附带 `url` 属性。

### 表单提交

启用 **自定义事件**、**站外链接** 或 **文件下载** 功能时，`<form>` 提交会被追踪为 `Form: Submission`。如果表单带有 `event-name=…` CSS 类名，则使用该自定义名称。

---

## 自定义事件（Tagged Events）

"自定义事件"功能通过 CSS 类名实现 **零代码事件追踪**。

**格式：** `event-name=事件名称`

```html
<!-- 追踪按钮点击 -->
<button class="event-name=注册">注册</button>

<!-- 追踪链接点击 -->
<a href="/pricing" class="event-name=定价+点击">查看定价</a>

<!-- 追踪表单提交 -->
<form class="event-name=联系+表单">
  <input type="email" />
  <button type="submit">提交</button>
</form>
```

### 通过类名添加附加属性

```html
<button class="event-name=购买 event-plan=Pro event-amount=99">
  购买专业版
</button>
```

发送事件名 `购买`，属性 `{ plan: "Pro", amount: "99" }`。

**规则：**
- 用 `+` 表示空格（`按钮+点击` → "按钮 点击"）
- 在点击元素及其最多 3 层父元素上检查类名
- 对链接，`url` 属性自动设为链接的 `href`

---

## JavaScript 手动追踪

```javascript
// 基础自定义事件
zenstats('Signup')

// 带属性的事件
zenstats('Purchase', {
  props: { plan: 'Business', amount: 99 }
})

// 带回调的事件
zenstats('Download', {
  callback: function(result) {
    console.log('状态:', result.status)
  }
})

// 非交互事件（不影响跳出率）
zenstats('Scroll Depth', { interactive: false })

// 手动覆盖 pageview URL（需要启用 Manual URL 功能）
zenstats('pageview', {
  u: '/virtual-path',
  props: { section: 'docs' }
})
// 或使用 options.url：
zenstats('pageview', { url: '/virtual-path' })
```

---

## SPA 路由

默认情况下，脚本使用 **History API**（pushState / replaceState / popstate）追踪 SPA 页面浏览；同一路径仅查询参数变化时不新增 PV。

如果 SPA 使用 **Hash 路由**（`#/path`），在安装页面勾选 **Hash 路由模式**。脚本监听 `hashchange`，所有事件均携带 `h: 1` 标记，保证页面浏览和停留时间归到同一页面。Hash 内的查询参数不计入页面路径，也不会单独增加 PV。

---

## 目标与转化

在 ZenStats 界面中创建目标来追踪转化：

1. **站点设置** → **转化** → **目标**
2. 点击 **添加目标**
3. 选择类型：
   - **自定义事件** — 匹配事件名称如 `Signup`、`Purchase`
   - **页面浏览** — 匹配 URL 路径如 `/thank-you`
4. 输入显示名称并创建

创建目标后，匹配的事件将显示在仪表板中。

---

## 漏斗分析

追踪多步骤转化流程：

1. **站点设置** → **转化** → **漏斗** → **添加漏斗**
2. 命名漏斗（如 "注册流程"）
3. 选择已有目标，添加 2–8 个步骤
4. 在 **漏斗分析** 中查看结果：每步访客数、流失率、转化率

---

## 隐私与数据

### 机器人过滤

ZenStats 自动忽略：

- 无头浏览器（`_phantom`、`__nightmare`、`webdriver`、`Cypress`）
- `localStorage.zenstats_ignore = 'true'` 的页面

### 忽略自己的访问

```javascript
// 在浏览器控制台中执行
localStorage.setItem('zenstats_ignore', 'true')

// 重新启用
localStorage.removeItem('zenstats_ignore')
```

### 数据收集说明

| 收集 | 不收集 |
|------|--------|
| 页面 URL | 个人信息 |
| 来源（Referrer） | |
| 浏览器与操作系统 | Cookie |
| 屏幕尺寸 | |
| 国家/城市（基于 IP） | |
| UTM 参数 | |

---

## 集成指南

### React / Next.js

**React Router** — 无需设置，基于 History 的 SPA 追踪自动生效。

**Next.js（App Router）：**

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script defer crossorigin="anonymous"
          data-domain="yourdomain.com"
          src="https://stats.example.com/js/script.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Vue / Nuxt

**Vue Router** — History 模式下自动生效。

**Nuxt**（`nuxt.config.ts`）：

```ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [{
        defer: true,
        crossorigin: 'anonymous',
        'data-domain': 'yourdomain.com',
        src: 'https://stats.example.com/js/script.js'
      }]
    }
  }
})
```

### WordPress

在 `header.php` 中添加：

```php
<script defer crossorigin="anonymous" data-domain="yourdomain.com" src="https://stats.example.com/js/script.js"></script>
```

或使用 **Insert Headers and Footers** 插件。

### 纯 HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script defer crossorigin="anonymous" data-domain="yourdomain.com"
          src="https://stats.example.com/js/script.js"></script>
</head>
<body><!-- 你的内容 --></body>
</html>
```

---

## 常见问题

### 事件未显示

1. **检查脚本是否加载**：开发者工具 → 网络 → 查找脚本文件
2. **域名匹配**：`data-domain` 必须与注册的站点域名完全一致
3. **正确的变体**：确认脚本 URL 与功能选择匹配
4. **控制台错误**：检查 CSP、CORS 或网络错误
5. **目标已创建**：自定义事件需先创建匹配的目标

### SPA 导航未追踪

- 默认版本使用 History API；如果 SPA 使用 Hash 路由，请在安装页面勾选 **Hash 路由模式**
- 自定义路由方案可手动调用 `zenstats('pageview')`

### 参与数据缺失

- 活跃期间每 10 秒记录增量，离开或隐藏页面时会补记不足 10 秒的部分
- 短访问会尝试在页面隐藏或 `pagehide` 时发送；进程被强制终止、断网或拦截器仍可能导致上报缺失

### 调试模式

```javascript
window.__zenstats = true  // 测试时绕过机器人过滤
```

---

### 可选分析没有数据

- 确认安装页已选择所需构建项，使用对应脚本变体（默认脚本不含两项加载器）。仅安装一个标签，并包含 `data-domain` 与所需的 `data-heatmap="true"` / `data-performance="true"`。安装页勾选不会自动保存站点开关。
- 检查对应服务端开关、页面白名单、允许的来源和采样率；热力图与性能白名单独立，`*` 只匹配一个路径段。验收时可临时把测试站点的采样率调为100%。
- 检查 `heatmap.js` / `vitals.js`、配置及上报请求是否成功，代理路径是否完整；检查是否设置了 `localStorage.zenstats_ignore`。
- 检查版本／聚合标识／变体是否合法；性能指标需等待浏览器回调或页面隐藏，无交互时INP可以缺失，CLS为0有效。
- 管理员通过点击、滚动及性能各自的采集质量卡检查持久化与丢弃，不要把202或 `sendBeacon=true` 当作落库成功。

## API 参考

### `window.zenstats(eventName, options?)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `eventName` | `string` | 事件名称（"pageview"、"engagement" 或自定义） |
| `options` | `object` | 可选配置 |

**选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `props` | `object` | `{}` | 附加到事件的自定义属性 |
| `callback` | `function` | — | 请求完成后调用 |
| `interactive` | `boolean` | `true` | `false` 表示不影响跳出率 |
| `u` / `url` | `string` | — | 手动 URL 覆盖（需启用 **手动 Pageview URL** 功能） |
| `meta` | `any` | — | 任意元数据（JSON 序列化） |

**回调响应：**

```javascript
{ status: 200, ignored: false }
// status: HTTP 状态码（网络失败时为 0）
// ignored: 事件被过滤时为 true（机器人、排除规则、localStorage 标志）
```

### 事件负载（发往 `/api/event`）

```javascript
{
  n: "pageview",              // 事件名称
  v: "1",                     // 脚本版本
  t: "2025-01-01T00:00:00.000Z", // 客户端时间戳（ISO 8601，UTC）
  u: "https://example.com/",  // 完整 URL
  d: "example.com",           // 域名
  r: "https://google.com/",   // 来源（直接访问为 null）
  p: { key: "value" },        // 自定义属性
  m: "{\"key\":\"value\"}",   // 元数据（JSON 字符串，可选）
  e: 15000,                   // 停留时间（毫秒，仅 engagement）
  sd: 85,                     // 滚动深度（百分比，仅 engagement）
  i: false,                   // 交互标志
  h: 1                        // Hash 路由标记（启用 Hash 路由功能时）
}
```

**关于 `t`（客户端时间戳）：** 追踪脚本在事件发生时用客户端时间（`new Date().toISOString()`）为每个事件打上时间戳。由于事件可能在客户端缓存后延迟发送（见下方「批量负载」）或在页面卸载时才发出，`t` 用于保留真实的事件时间。服务端仅在 `t` 处于最近一小时内且不晚于当前时间时采用它，否则回退到服务端接收时间。旧版脚本不发送 `t` 时同样回退到服务端时间，因此完全向后兼容。

### 批量负载

为减少请求数，追踪脚本会将事件排队最多约 2 秒后合并发送。当队列中有多个事件时，它们会作为单个 `batch` 请求发出：

```javascript
{
  n: "batch",                 // 标记为批量信封
  v: "1",                     // 脚本版本
  e: [                        // 子事件数组（每个都是普通负载）
    { n: "pageview", t: "2025-01-01T00:00:00.000Z", u: "...", d: "example.com", ... },
    { n: "Signup",   t: "2025-01-01T00:00:01.200Z", u: "...", d: "example.com", ... }
  ]
}
```

说明：
- 批量信封中的 `e` 是**子事件数组**——而非停留时间。每个子事件带有自己的 `t`，因此批量发送后仍保留各事件的顺序与时间。
- 子事件未指定 `d`（域名）时，继承批量信封层级的 `d`。
- 队列中只有单个事件时，按普通（非批量）负载发送，不包裹在 `batch` 中。

### 内置事件名称

| 事件 | 来源 |
|------|------|
| `pageview` | 页面加载/导航时自动发送 |
| `engagement` | 自动发送（滚动深度 + 活跃时间） |
| `Outbound Link: Click` | 站外链接功能 |
| `File Download` | 文件下载功能 |
| `Form: Submission` | 表单提交自动追踪 |
| `batch` | 多个排队事件合并发送 |


## 点击热力图

在 **站点设置 → 热力图设置** 新增热力图，可选择具体路径或聚合标识，并配置范例URL截图。在「采集设置」开启总开关、点击采集，设置路径白名单、采样率和保留周期。Tracker需使用包含热力图能力的脚本变体，并添加 `data-heatmap="true"`；点击默认子开关不代表热力图总开关已开启。

点击位置使用40×80比例网格，按设备组、主机、发布版本及变体聚合，旨在观察大致区域。聚合页需有相近布局，截图版本和设备组应与数据相符。为关键元素设置 `data-zs-id="signup.submit"` 可稳定语义标识；用 `data-zs-ignore` 排除敏感区域点击。滚动深度复用同一个模块，接入方式见下文。

## 可选滚动深度热力图

在 **热力图设置 → 采集设置 → 采集滚动深度** 开启，安装页选择热力图构建项，替换为对应脚本变体并保留 `data-heatmap="true"`，同步更新 API 与自托管 `heatmap.js`。旧 API 不发布滚动能力。点击与滚动可分别开关，同时受总开关、路径白名单和页面采样率控制。

热力图工作台新增“滚动深度”模式，支持80段纵向触达率、路径或聚合标识、设备组、发布版本、截图及最近最多7个自然日（或更短的原始数据保留期）。没有点击和没有滚动的页面浏览也会上报初始可见样本；重试与revision更新不会增加浏览数。

比例表示实际采集浏览样本的几何触达，不代表独立访客或阅读完成。文档高度增长超过25%、报告超限及不支持布局的浏览会被标记并排除出有效分母，延迟初始化单独提示。滚动使用独立有界队列，不增加普通PV、UV、Session或自定义事件。202仅表示进入内存，管理员可查看“滚动采集质量”。历史汇总按后续阶段实施；Core Web Vitals已提供独立接入选项，见下文。

## Core Web Vitals

入口为 **Stats → Core Web Vitals** 或 **站点设置 → 性能监控设置 → 查看性能监控**。开启性能采集、配置独立白名单，再在安装页选择性能监控构建项，使用对应脚本变体与属性：

```html
<script defer src="https://your-instance.com/js/script.performance.js"
  data-domain="example.com"
  data-performance="true"
  data-performance-version="release-1"></script>
```

保留已有脚本变体、Hash路由及data-api配置。API与Tracker资产需同步更新，包含`vitals.js`和`web-vitals.LICENSE.txt`。使用锁定的官方标准库采集LCP、INP、CLS及辅助FCP、TTFB，仅在开关、路径和采样通过后加载可选模块。

SPA切换保留文档初始URL，BFCache恢复新建生命周期；不启用软导航或DOM归因。覆盖率为有效指标样本／前台采样导航，无回调的INP保留缺失，CLS=0有效。核心三项各自不足100样本时整体显示数据不足（产品展示门槛）。按固定站点时区查询配置内最近1～7个自然日，暂不提供历史封账汇总；性能配置独立于热力图。
