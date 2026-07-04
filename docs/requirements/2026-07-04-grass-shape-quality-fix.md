# Requirement / 需求

Fix the strange-looking grass quality after the previous visual upgrade, especially the oversized flat blade and spike-like near-field appearance.

修正上一次草地视觉升级后出现的奇怪质感，尤其是近景草片过大、过平、像尖刺的问题。

# Summary / 概要

The procedural grass variants are now narrower, shorter, less saturated, and less dominated by broad blades. Root shading and tip highlights were softened so the field keeps density without reading as a dark low-poly blade wall.

程序化草变体现在更窄、更矮、饱和度更低，并减少宽叶草占比。根部阴影和叶尖高光被削弱，让草地保留密度的同时不再像深色低模草片墙。

# User Request / 用户需求

The user provided a screenshot and reported that the grass texture and quality looked strange.

用户提供截图并反馈草地质感看起来很奇怪。

# Scope / 范围

In scope: procedural grass blade dimensions, variant distribution, instance scale, grass color palette, root darkening, tip highlights, and shader cache keys.

范围内：程序化草叶尺寸、变体分布、实例缩放、草色调色、根部压暗、叶尖高光，以及 shader 缓存键。

Out of scope: terrain textures, trees, water, character lighting, leaf decals, enemy assets, and unrelated dirty files.

范围外：地形贴图、树木、水体、角色光照、落叶贴花、敌人资源，以及无关未提交文件。

# Acceptance Criteria / 验收标准

- The project builds successfully with `npm run build`.
- Near grass no longer appears as oversized triangular spikes or a flat blade wall.
- Grass remains dense but has lower, more restrained silhouettes.
- Root shadows are softer and do not create large black gaps.
- The existing natural edge and near/mid-distance sway behavior remains intact.
- The commit includes only grass quality fix files and this requirement document.

- 项目可以通过 `npm run build` 构建。
- 近景草不再像过大的三角尖刺或平面草墙。
- 草地仍保持密度，但轮廓更低、更克制。
- 根部阴影更柔和，不再形成大片黑缝。
- 现有自然边界和近中景摆动行为保持不变。
- 提交只包含草地质感修正相关文件和本需求文档。
