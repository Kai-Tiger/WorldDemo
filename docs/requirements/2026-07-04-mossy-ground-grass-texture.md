# Requirement / 需求

Apply the user's high-resolution mossy grass ground texture to the project without reducing its source resolution.

将用户提供的高清苔藓草地地面贴图应用到项目中，并保留源图分辨率。

# Summary / 概要

Replace the existing lowland grass ground texture with the provided mossy texture converted to WebP at its original dimensions, and improve terrain texture clarity at angled viewing directions.

用用户提供的苔藓贴图替换现有低地草地地面贴图，按原始尺寸转换为 WebP，并提升斜视角下的地形贴图清晰度。

# User Request / 用户需求

The user provided a high-resolution grass texture and asked to apply it to the project, then clarified that it should not be downscaled to 1024 because that could lose detail.

用户提供了一张高清草地贴图并要求应用到项目中，随后明确表示不希望缩小到 1024，以免损失细节。

# Scope / 范围

This change replaces only the base lowland grass terrain texture and texture sampling quality. It does not change terrain blending, grass clump models, water, trees, lighting, or texture world scale.

本次只替换低地基础草地地形贴图并调整贴图采样质量。不改变地形混合、草丛模型、水体、树木、光照或贴图世界尺寸。

# Acceptance Criteria / 验收标准

- The base grass terrain texture uses the provided mossy ground image converted to WebP at original resolution.
- Terrain textures use anisotropic sampling to reduce angled-view blur.
- The project build succeeds.

- 基础草地地形贴图使用用户提供的苔藓地面图，并按原始分辨率转换为 WebP。
- 地形贴图使用各向异性采样以减少斜视角模糊。
- 项目构建成功。
