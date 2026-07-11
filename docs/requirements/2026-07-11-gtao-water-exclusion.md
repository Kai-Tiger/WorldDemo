# Requirement / 需求

Exclude explicit transparent water geometry from the GTAO normal and depth capture while preserving contact ambient occlusion on terrain, characters, rocks, trees, and alpha-tested vegetation.

将显式透明水体几何从 GTAO 法线与深度采集中排除，同时保留地形、角色、岩石、树木和 alpha-test 植被的接触环境遮蔽。

# Summary / 概要

Mark the river, shared water-system root, small-lake root, and planar-reflection capture explicitly. Temporarily hide only those roots while GTAO renders, restoring their previous visibility through `try/finally` without changing pass order or AO intensity.

显式标记河流、共享水体系统根节点、小湖根节点和平面反射采集面。GTAO 渲染时仅临时隐藏这些根节点，并通过 `try/finally` 恢复原可见性，不改变 Pass 顺序或 AO 强度。

# User Request / 用户需求

Remove the dark circular artifact from the newly added round terminal lake without masking the issue through water-color or global-lighting changes.

消除新增圆形终点湖上的深色圆环，不通过修改水色或全局光照来掩盖问题。

# Scope / 范围

- Tag only explicit water roots and the planar-reflection capture for GTAO exclusion.
- Cache excluded roots when the GTAO pass is created; do not traverse the scene every frame.
- Restore original visibility even when GTAO rendering throws.
- Preserve GTAO on terrain, characters, rocks, trees, grass, and other unmarked objects.
- Keep the existing RenderPass, GTAOPass, color-grade, anti-aliasing, and OutputPass order.

- 仅标记显式水体根节点和平面反射采集面。
- 在 GTAO Pass 创建时缓存排除对象，不在每帧遍历场景。
- 即使 GTAO 渲染抛错也恢复原可见性。
- 保留地形、角色、岩石、树木、草和其他未标记物体的 GTAO。
- 保持现有 RenderPass、GTAOPass、调色、抗锯齿和 OutputPass 顺序。

# Acceptance Criteria / 验收标准

- Explicit water roots are invisible only during GTAO capture and retain their prior visibility afterward.
- An exception during GTAO capture cannot leave water objects hidden.
- Unmarked vegetation and scene geometry continue to participate in GTAO.
- Performance, Balanced, and Quality keep their existing pass definitions and AO settings.
- Automated tests and the production build pass without new warnings.

- 显式水体根节点仅在 GTAO 采集期间不可见，随后恢复先前的可见性。
- GTAO 采集中抛出异常不会导致水体永久隐藏。
- 未标记的植被和场景几何继续参与 GTAO。
- Performance、Balanced 和 Quality 保持现有 Pass 定义与 AO 配置。
- 自动化测试和生产构建通过，且不新增警告。
