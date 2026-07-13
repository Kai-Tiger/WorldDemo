# Lake Reflection and Refraction / 湖泊反射与折射

## Requirement / 需求

**English:** Extend the existing Single Layer Water scene-color/depth optics from flowing water to static lakes while preserving physical water Fresnel, bounded refraction, tiered reflection quality, and the current world and gameplay layout.

**中文：** 将现有流动水的 Single Layer Water 场景颜色/深度光学扩展到静态湖泊，同时保留物理水体菲涅耳、受限折射、分档反射质量以及当前世界与玩法布局。

## Summary / 概要

**English:** Static lakes now reconstruct water thickness from authored and screen depth, apply Beer-Lambert absorption and scattering, validate screen-space refraction against bounds and depth discontinuities, and composite reflection with water `F0 = 0.0204`. Quality keeps planar reflection only on the main alpine lake; other lakes use a local cube probe that refreshes after meaningful viewer movement.

**中文：** 静态湖泊现在结合人工深度和屏幕深度重建水体厚度，应用 Beer-Lambert 吸收与散射，依据屏幕边界及深度不连续验证折射，并以水体 `F0 = 0.0204` 合成反射。Quality 仅主高山湖使用平面反射，其他湖泊使用在观察者明显移动后刷新的局部立方体探针。

## User Request / 用户需求

**English:** The user reported missing reflection and air-to-water refraction and requested visible but physically restrained lake optics in Balanced and Quality without making head-on water mirror-like.

**中文：** 用户反馈缺少反射与空气到水体的折射，并要求在 Balanced 与 Quality 中获得可见但物理上克制的湖泊光学，避免正视水面变成镜子。

## Scope / 范围

- **English:** Add scene color/depth uniforms and Single Layer Water composition to static lake materials. / **中文：** 为静态湖泊材质增加场景颜色/深度 uniforms 和 Single Layer Water 合成。
- **English:** Use 0/2/3-pixel Performance/Balanced/Quality refraction with edge, finite-depth, behind-water, and depth-continuity rejection. / **中文：** Performance/Balanced/Quality 使用 0/2/3 像素折射，并进行边界、有限深度、水后深度和深度连续性拒绝。
- **English:** Keep planar reflection on `AlpineLakeSurface` only; cap all other static lakes at the probe tier. / **中文：** 仅 `AlpineLakeSurface` 使用平面反射；所有其他静态湖泊最高使用 probe。
- **English:** Reposition and refresh the cube probe after 64 meters of viewer movement rather than every frame. / **中文：** 观察者移动 64 米后重新定位并刷新立方体探针，不逐帧更新。
- **English:** Preserve the pending flowing-river environment-reflection contract and all water geometry, levels, foam, collision, and gameplay behavior. / **中文：** 保留待提交流动河流的环境反射约定，以及全部水体几何、水位、泡沫、碰撞和玩法行为。

## Acceptance Criteria / 验收标准

- **English:** Static lakes expose and receive scene color/depth buffers, use bounded refraction and Beer-Lambert coefficients shared with flowing water, and retain a transparent Performance fallback. / **中文：** 静态湖泊暴露并接收场景颜色/深度缓冲，使用受限折射和与流动水一致的 Beer-Lambert 系数，并保留透明的 Performance 回退。
- **English:** Water reflection uses `F0 = 0.0204`; low-angle reflection is visible while head-on underwater detail remains readable. / **中文：** 水体反射使用 `F0 = 0.0204`；低角度反射可见，而正视时水下细节仍可阅读。
- **English:** Refraction never samples outside the screen, pulls foreground depth across discontinuities, or samples geometry in front of the water surface. / **中文：** 折射不得采样屏幕外区域、跨深度断层拖拽前景，或采样水面前方几何。
- **English:** The main alpine lake may select planar reflection in Quality; terminal, small, lowland, and cirque lakes never select the alpine planar target. / **中文：** 主高山湖可在 Quality 选择平面反射；终点湖、小湖、低地湖和冰斗湖不得选择高山湖平面目标。
- **English:** Focused tests, full tests, production build, lowland check, and `git diff --check` pass, excluding only pre-existing unrelated dirty-worktree failures. / **中文：** 定向测试、完整测试、生产构建、低地检查和 `git diff --check` 通过；仅允许既有无关工作树差异导致的失败。
