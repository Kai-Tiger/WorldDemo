# Triplanar Rock Texture / 三平面岩石贴图

## Requirement / 需求

Use triplanar sampling for the main terrain rock texture so steep rock surfaces avoid stretched or blurry world-XZ projection.

将主地形岩石贴图改为三平面采样，减少陡峭岩面因世界 XZ 投影导致的拉伸和模糊。

## Summary / 概要

The terrain shader now samples `rock-alpine.webp` from X/Y/Z projection planes and blends them by world normal direction. Other terrain textures and material masks remain unchanged.

地形 shader 现在会从 X/Y/Z 三个投影平面采样 `rock-alpine.webp`，并根据世界法线方向混合。其它地形贴图和材质遮罩保持不变。

## User Request / 用户需求

The user reported that the rock texture looked blurry and asked to change it to triplanar mapping.

用户反馈岩石贴图看起来有点糊，并要求改成三平面映射。

## Scope / 范围

- Update only the terrain shader rock texture sampling.
- Keep existing rock texture asset, scale, offsets, and material blend masks.
- Do not modify riverbank, riverbed, snow, grass, or terrain geometry.

- 只更新地形 shader 中岩石贴图的采样方式。
- 保持现有岩石贴图资源、缩放、偏移和材质混合遮罩不变。
- 不修改河岸、河床、雪、草地或地形几何。

## Acceptance Criteria / 验收标准

- Steep terrain rock surfaces use triplanar projection instead of only world-XZ UV sampling.
- Existing horizontal rock coverage remains visually consistent with the previous scale and offset.
- The project builds successfully.

- 陡峭地形岩面使用三平面投影，不再只依赖世界 XZ UV 采样。
- 水平岩石区域保留原有缩放和偏移下的视觉一致性。
- 项目可以成功构建。
