# Requirement / 需求

Change riverbed texture sampling so the river bottom no longer shows regular world-space tiling.

修改河底贴图采样方式，避免河底继续显示规律性的世界坐标平铺。

# Summary / 概要

The riverbed texture should sample from river-local coordinates based on distance along the channel and lateral offset from the centerline. Underwater river terrain should remain covered by river materials instead of falling back to the grass ground texture.

河底贴图应基于沿河道方向的距离和相对中心线的横向偏移进行局部采样。水下河道地形应继续由河流材质覆盖，不能回落显示草地地表贴图。

# User Request / 用户需求

The user asked whether the riverbed sampling method could be changed after identifying regular riverbed patterns and grass texture appearing in the river bottom.

用户在定位出河底规律性斑纹和草地贴图出现在河底的问题后，询问是否可以修改河底采样方式。

# Scope / 范围

This change updates terrain river material sampling and underwater material coverage only. It does not replace texture assets, change terrain carving, alter water mesh geometry, or modify player, grass, or tree logic.

本次只修改地形河流材质采样和水下材质覆盖。不替换贴图资源，不修改地形雕刻，不改变水面网格，也不修改玩家、草丛或树木逻辑。

# Acceptance Criteria / 验收标准

- Riverbed texture sampling uses river-local distance and lateral coordinates instead of direct world-space `xz` tiling.
- Riverbed sampling includes slight variation to reduce visible repetition.
- Underwater river terrain remains covered by riverbed or riverbank materials instead of exposed grass ground texture.
- Build verification passes.

- 河底贴图使用河道局部距离和横向坐标采样，而不是直接使用世界坐标 `xz` 平铺。
- 河底采样包含轻微变化，用于降低可见重复感。
- 水下河道地形由河床或河岸材质覆盖，不露出草地地表贴图。
- 构建验证通过。
