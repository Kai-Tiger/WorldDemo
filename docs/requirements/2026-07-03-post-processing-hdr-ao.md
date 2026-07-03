# Requirement / 需求

English: Add a foundational visual quality pipeline with ACES exposure, optional HDR environment lighting, ambient occlusion, anti-aliasing, and light color grading.

中文：添加基础画质管线，包括 ACES 曝光、可选 HDR 环境光、环境遮蔽、抗锯齿和轻量色彩分级。

# Summary / 概要

English: Replace direct scene rendering with a Three.js post-processing composer and configure renderer color management. Add optional HDR environment loading that preserves the existing sky when no HDR asset is present.

中文：用 Three.js 后处理 composer 替代直接场景渲染，并配置渲染器色彩管理。新增可选 HDR 环境贴图加载，在没有 HDR 资源时保留现有天空和灯光。

# User Request / 用户需求

English: Implement the proposed plan for ACES exposure, HDR environment lighting, AO, anti-aliasing, and color grading.

中文：实现关于 ACES 曝光、HDR 环境光、AO、抗锯齿和色彩分级的方案。

# Scope / 范围

English: Update the renderer setup and render loop, add post-processing and environment lighting helpers, and keep gameplay, terrain, water, vegetation, and asset content unchanged.

中文：更新渲染器设置和渲染循环，增加后处理与环境光辅助模块，不改玩法、地形、水体、植被和已有资产内容。

# Acceptance Criteria / 验收标准

English:
- The app renders through `EffectComposer` instead of direct `renderer.render`.
- ACES tone mapping, exposure, GTAO, SMAA, and color grading are configured.
- HDR environment loading uses `/assets/environment/outdoor.hdr` when available and does not break startup when missing.
- The production build completes successfully.

中文：
- 应用通过 `EffectComposer` 渲染，而不是直接调用 `renderer.render`。
- 已配置 ACES 色调映射、曝光、GTAO、SMAA 和色彩分级。
- HDR 环境光在 `/assets/environment/outdoor.hdr` 存在时启用，缺失时不影响启动。
- 生产构建成功完成。
