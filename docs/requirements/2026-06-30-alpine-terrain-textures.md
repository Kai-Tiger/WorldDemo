# Requirement / 需求

## English

Generate high-quality terrain texture assets for future alpine and snowy mountain material blending.

## 中文

为后续雪山和高山地形材质混合生成高质量地表贴图资源。

# Summary / 概要

## English

Add five seamless base color terrain textures: alpine snow, alpine rock, alpine scree, frozen dirt, and alpine grass. The assets are intended for the existing Three.js terrain shader pipeline and do not change runtime behavior in this step.

## 中文

新增五张可平铺的基础颜色地形贴图：高山积雪、高山岩石、高山碎石坡、冻土、高山草地。本阶段贴图用于现有 Three.js 地形 shader 管线的后续扩展，不修改当前运行时代码行为。

# User Request / 用户需求

## English

The user asked to generate the planned high-quality terrain textures for a snowy mountain environment.

## 中文

用户要求根据计划生成高质量雪山地形贴图。

# Scope / 范围

## English

- Add new generated texture assets under `public/assets/terrain/`.
- Keep the current terrain material logic unchanged.
- Do not replace existing terrain textures.
- Do not add normal or roughness maps in this step.

## 中文

- 在 `public/assets/terrain/` 下新增生成的贴图资源。
- 保持当前地形材质逻辑不变。
- 不替换已有地形贴图。
- 本阶段不新增 normal 或 roughness 贴图。

# Acceptance Criteria / 验收标准

## English

- Five new terrain texture files exist in the project assets directory.
- The textures are suitable as tileable base color terrain materials.
- The project still builds successfully.
- The commit includes only the new terrain textures and this requirement document.

## 中文

- 项目资源目录中存在五张新的地形贴图文件。
- 贴图适合作为可平铺的地形基础颜色材质。
- 项目仍然可以成功构建。
- 提交中只包含新增地形贴图和本需求文档。
