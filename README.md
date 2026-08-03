# Cold Mountain

Cold Mountain 是一个基于 Three.js 和 Vite 的第三人称山地开放世界原型。项目包含分块地形、湖泊与河流、瀑布、植被 LOD、动态光照与后处理、第三人称角色、敌人与基础战斗，以及可在浏览器中使用的地形编辑工具。

仓库地址：[Kai-Tiger/WorldDemo](https://github.com/Kai-Tiger/WorldDemo)

## 环境要求

- Node.js `20.19+` 或 `22.12+`
- npm
- 支持 WebGL 的现代桌面浏览器

项目包含较多模型和纹理资源，首次克隆和启动时需要预留一定的下载、安装与场景加载时间。

## 本地运行

```bash
git clone git@github.com:Kai-Tiger/WorldDemo.git
cd WorldDemo
npm ci
npm run dev
```

Vite 启动后会在终端输出访问地址，默认通常为 <http://localhost:5173>。如果该端口已被占用，Vite 会自动选择其他端口，请以终端输出为准。

## 操作方式

| 操作 | 按键或方式 |
| --- | --- |
| 移动 | `W` / `A` / `S` / `D` |
| 旋转镜头 | 在画面中按住鼠标并拖动 |
| 调整镜头距离 | 鼠标滚轮 |
| 普通攻击 / 连击 | `J` |
| 防御 | 按住 `K` |
| 火球 | `E` |
| 上升 / 悬停 | `Alt` |
| 下降 | `Control` |
| 显示或隐藏调试面板 | `` ` `` |

右上角面板可以切换草地、树木和渲染质量。点击 `Edit` 可进入地形编辑模式，选择 `Raise` 或 `Lower` 后拖动鼠标修改地形。

> [!CAUTION]
> 地形编辑器中的 `Save` 仅在开发服务器下可用，并会写入 `public/assets/terrain/height.webp`。首次保存还会创建 `height.original.webp` 备份。只想体验项目时不要点击保存。

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 运行 Node.js 测试
npm test

# 生成生产构建，输出到 dist/
npm run build

# 本地预览生产构建
npm run preview

# 检查低地区域高度图是否需要重新烘焙
npm run check:lowlands

# 写入重新烘焙后的低地区域高度图
npm run bake:lowlands
```

生产构建的完整验证流程：

```bash
npm ci
npm test
npm run build
npm run preview
```

## 仓库结构

```text
.
├── index.html              # 页面结构、HUD 与游戏入口
├── src/
│   ├── main.js             # 场景初始化、游戏循环和运行时连接
│   ├── scene.js            # 世界场景组装
│   ├── terrain.js          # 地形加载、分块与采样
│   ├── player.js           # 玩家移动与战斗
│   ├── thirdPersonCamera.js # 第三人称镜头
│   ├── waterSystem.js      # 水体系统
│   ├── grassManager.js     # 草地加载与 LOD
│   └── treeManager.js      # 树木加载与 LOD
├── public/
│   ├── assets/             # 地形、角色、植被、纹理和模型资源
│   └── basis/              # KTX2/Basis 纹理解码文件
├── tests/                  # Node.js 单元与回归测试
├── tools/                  # 高度图和纹理等离线处理工具
├── docs/
│   ├── requirements/       # 历史需求与验收标准
│   └── prompts/            # 项目相关提示词记录
├── model-evaluation-2026-08-02/  # 模型实现评估材料
├── package.json            # 依赖与 npm 脚本
└── vite.config.js          # Vite 配置与地形保存接口
```

## 技术与功能概览

- Three.js `0.179.x` 负责 3D 渲染，Vite `7.x` 负责开发与构建。
- 地形、水体、植被、阴影和后处理按独立模块组织。
- 提供 `performance`、`balanced` 和 `quality` 三档渲染质量。
- HUD 会显示 FPS、帧耗时、draw calls、三角形数量和显存资源统计。
- 测试覆盖地形、水系、植被 LOD、碰撞、战斗、镜头、阴影和性能采样等核心逻辑。

## 开发约定

- 运行时资源通过 `/assets/...` 和 `/basis/...` 路径访问。
- 修改生成式地形数据后，应运行对应的烘焙或检查命令。
- 提交代码前应先运行相关测试和生产构建。
- 代码变更需要在 `docs/requirements/` 中附带同一提交的中英文需求文档；具体格式见 [AGENTS.md](./AGENTS.md)。

## 许可证

仓库当前未提供独立的 `LICENSE` 文件。在复制、分发或商用代码与资源前，请先向仓库所有者确认授权范围。
