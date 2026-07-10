# Requirement / 需求

## Summary / 概要

**中文：** 建立统一的湿冷高山清晨视觉环境、可分级后处理、动态分辨率、稳定阴影、可复现验收机位和生产化首屏。

**English:** Establish a unified cold mountain morning environment, tiered post-processing, dynamic resolution, stable shadows, reproducible review cameras, and a production-ready first frame.

## User Request / 用户需求

**中文：** 用户要求把当前 Three.js 环境从技术原型提升为面向桌面网页设备的冷峻写实 3A-like 视觉体验，同时保持实时性能。

**English:** The user requested that the current Three.js environment be upgraded from a technical prototype to a cold, realistic, AAA-like visual experience for desktop web devices while retaining real-time performance.

## Scope / 范围

**中文：** 统一太阳、天空、雾、环境反射和曝光；重建质量档与抗锯齿；加入动态分辨率、渲染统计、加载画面、隐藏式调试 UI、五个 Golden Shots、异步植被和英雄区岩石。玩法、音频和角色动画不在范围内。

**English:** Unify sun, sky, fog, environment reflections, and exposure; rebuild quality tiers and anti-aliasing; add dynamic resolution, renderer statistics, a loading screen, hidden debug UI, five Golden Shots, progressive vegetation, and hero-area rocks. Gameplay, audio, and character animation are excluded.

## Acceptance Criteria / 验收标准

**中文：** 构建通过；运行时不请求缺失 HDR；默认不显示调试 HUD；`?debug=1` 显示统计；`?shot=<name>` 固定验收机位；Balanced 可在 0.75–1.0 内自动调节分辨率；角色逆光仍能读出材质层次。

**English:** The build passes; runtime no longer requests a missing HDR file; debug HUD is hidden by default; `?debug=1` exposes metrics; `?shot=<name>` fixes a review camera; Balanced dynamically scales between 0.75 and 1.0; the character remains materially readable when backlit.
