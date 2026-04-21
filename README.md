# Violet

> 坠入爱河，而非落入算法。

Violet 是一款专为南京大学学生设计的破冰交友平台。基于 94 份真实问卷与 8 位用户深度访谈，以标签驱动的反算法匹配和军师辅助破冰机制，解决校园恋爱中"社交圈小"与"不敢开口"两大核心痛点。

## 在线预览

[https://cumulocumulo.github.io/Violet_ContactUs](https://cumulocumulo.github.io/Violet_ContactUs)

## 设计特色

- **Glassmorphism 玻璃态设计** — 半透明毛玻璃卡片 + 弥散光斑背景
- **胶片噪点纹理** — 全局 SVG 噪点叠加，营造质感
- **Violet 品牌色系** — 紫罗兰 / 春绿 / 奶油白三色体系
- **Bento Grid 布局** — 核心功能以不等宽网格呈现
- **响应式适配** — 移动端自动切换为单列布局
- **Fade-up 入场动画** — 基于 CSS animation 的优雅过渡

## 核心功能

### 预注册系统（NEW）

校园邮箱验证码认证 + 用户名/常用邮箱收集。数据存储于 NJU SeaTable，邮件通过 SendCloud 发送。

- **后端**：Vercel Serverless Functions（国内可访问）
- **数据**：NJU SeaTable (table.nju.edu.cn)
- **邮件**：SendCloud（免费额度）
- **完整部署指南**：查看 [backend/setup.md](backend/setup.md)

### 灵魂画廊 — 反算法匹配

不足 30% 的用户信任黑盒算法。Violet 将筛选权交还用户：列表直接平铺展示用户的校区、年级与具体兴趣标签（如摄影、小众乐队），喜欢就发起牵线。

### 军师系统 — 替你破冰

66.6% 的用户希望有人协助破冰。军师大厅让当事人发布任务，军师接单后在三方/四边聊天室介入。三种授权模式确保边界清晰：

| 模式 | 说明 |
|------|------|
| 私聊模式（默认） | 军师不可见主窗口，仅在私聊提供策略分析 |
| 辅助模式 | 军师可见主窗口，可代拟信息，需当事人确认后发送 |
| Solo 模式 | 军师直接接管破冰节奏，适用于初期活跃气氛 |

### 三阶段流转 — 见好就收

为防止军师过度介入引发好感错位，设计了严格的生命周期：

1. **牵线期** — 消耗信用币盲选发起，双方互不可见头像昵称，24 小时未回复自动静默失效
2. **破冰期** — 双方同意后解锁头像，军师介入协助聊天
3. **暧昧期** — 一键交换微信/QQ，聊天通道永久关闭，军师强制剥离并结算评价

### 信用经济 — 非对称互评

信用分即货币：发起牵线、发帖求助需消耗，军师接单可赚取。非对称互评机制（当事人可打 -2~+3，军师可打 -3~+3）净化生态，军师主页公开展示历史评价标签。

## 页面结构

```
index.html（单文件落地页）
├── 导航栏 — 固定顶部，毛玻璃渐隐效果
├── Hero — 品牌主张 + 邮箱认证入口 + 灵魂卡片预览
├── 市场洞察 — 三项核心数据（基于真实调研）
├── 功能网格 — Bento Grid 展示三大核心模块
│   ├── 三阶段流转（8/12 宽）
│   ├── 反算法匹配（4/12 宽）
│   ├── 军师系统（6/12 宽）
│   └── 信用经济（6/12 宽）
├── CTA 转化区 — 当事人/军师双入口
└── Footer — 品牌收尾
```

## 技术栈

- 纯 HTML + CSS，零依赖
- Google Fonts（Cormorant Garamond + Outfit）
- CSS Custom Properties 设计系统变量
- CSS Grid + Flexbox 响应式布局
- SVG 内联纹理（无需外部资源）

## 本地运行

```bash
git clone https://github.com/CumuloCumulo/Violet_ContactUs.git
cd Violet_ContactUs
open index.html
```

## 项目结构

```
Violet_ContactUs/
├── index.html        # 完整的单页落地页（HTML + CSS 内联）
├── api/              # Vercel Serverless Functions
│   ├── sendCode.js   # 发送验证码
│   ├── register.js   # 完成注册
│   └── checkUsername.js  # 检查用户名
├── backend/          # 后端配置和文档
│   ├── Code.gs       # (已弃用) GAS 后端
│   └── setup.md      # 部署指南
├── package.json      # Vercel 配置
├── vercel.json       # Vercel 路由配置
└── README.md
```

## License

MIT
