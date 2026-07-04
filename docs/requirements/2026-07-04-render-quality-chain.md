# Requirement / 需求

Improve the overall rendering quality so the scene feels closer to a modern game presentation.

提升整体渲染画质，让场景更接近现代游戏的表现。

# Summary / 概要

Add a procedural outdoor environment fallback, terrain micro-detail shading, and lightweight post-processing polish without changing gameplay, water layout, vegetation placement, or existing user edits in scene assembly.

增加程序化户外环境光兜底、地形微细节明暗和轻量后处理润色，同时不改变玩法、水体布局、植被放置或场景装配中的现有用户改动。

# User Request / 用户需求

The user felt the current image quality was still far from AAA quality and asked what could be done to enhance it, then requested implementation of the proposed quality-improvement plan.

用户认为当前画面距离 3A 质感仍有较大差距，询问还能如何增强画质，并要求实现提出的画质提升方案。

# Scope / 范围

This change covers environment lighting fallback, terrain material detail, and post-processing polish. It does not add new runtime UI, replace the renderer, download external HDR assets, or modify the user's uncommitted leaf/scene work.

本次覆盖环境光兜底、地形材质细节和后处理润色。不新增运行时 UI、不替换渲染器、不下载外部 HDR 资源，也不修改用户未提交的落叶/场景工作。

# Acceptance Criteria / 验收标准

- The scene receives a usable environment map even when `/assets/environment/outdoor.hdr` is missing.
- Terrain lighting has more local detail and less flat base-color appearance.
- Post-processing adds subtle sharpness and framing without heavy bloom.
- The project build succeeds.

- 即使缺少 `/assets/environment/outdoor.hdr`，场景也能获得可用环境贴图。
- 地形光照具备更多局部细节，减少纯颜色贴图的平面感。
- 后处理增加克制的清晰度和画面边缘聚焦，不使用过重 bloom。
- 项目构建成功。
