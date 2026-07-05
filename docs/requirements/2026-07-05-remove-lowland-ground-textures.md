# Requirement / 需求

Remove lowland dirt, dry grass, and gravel image textures from the terrain material.

从地形材质中移除低地泥土、干草和砾石图片贴图。

# Summary / 概要

Lowland terrain no longer loads or samples the dirt, dry grass, and gravel albedo/normal texture files. The lowland ground color is now generated procedurally in the shader, while alpine, riverbank, and riverbed textures remain unchanged.

低地地形不再加载或采样泥土、干草和砾石的底色/法线贴图文件。低地地面颜色改为在 shader 中程序化生成，同时保留高山、河岸和河床贴图不变。

# User Request / 用户需求

The user showed that the ground still displayed image-texture detail after asking to remove ground textures and asked why it was still present.

用户截图指出要求删除地面贴图后，地面仍显示图片贴图细节，并询问为什么还在。

# Scope / 范围

Update only the lowland terrain material texture loading and shader sampling. Do not delete asset files, change terrain geometry, water, alpine material textures, river material textures, vegetation placement, player behavior, camera behavior, or post-processing.

仅更新低地地形材质的贴图加载和 shader 采样。不删除资源文件，不修改地形几何、水体、高山材质贴图、河流材质贴图、植被放置、玩家行为、相机行为或后处理。

# Acceptance Criteria / 验收标准

- The terrain material no longer loads lowland dirt, dry grass, or gravel albedo textures.
- The terrain material no longer loads lowland dirt, dry grass, or gravel normal textures.
- Lowland ground uses procedural shader colors instead of image-texture sampling.
- Riverbed, riverbank, alpine rock, scree, frozen dirt, and snow texture sampling remain in place.
- The project build succeeds.

- 地形材质不再加载低地泥土、干草或砾石底色贴图。
- 地形材质不再加载低地泥土、干草或砾石法线贴图。
- 低地地面使用 shader 程序化颜色，而不是采样图片贴图。
- 河床、河岸、高山岩石、碎石坡、冻土和雪的贴图采样保持不变。
- 项目构建成功。
