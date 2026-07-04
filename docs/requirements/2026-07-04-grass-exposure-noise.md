# Requirement / 需求

Reduce overexposed grass and noisy distant grass cards.

降低草地过曝，并减少远处草片噪点。

# Summary / 概要

This change tunes only the grass instance material and far LOD filtering. Grass highlights are compressed and less saturated, grass emissive lift is reduced, and distant LOD grass uses fewer darker cards so it reads as a softer vegetation mass instead of noisy pale flags.

本次仅调整草实例材质和远处 LOD 筛选。草地高光会被压低并降低饱和度，草的自发光补光被削弱，远处 LOD 草片数量减少并变暗，让远景更像柔和的植被块面，而不是发白的旗帜状噪点。

# User Request / 用户需求

The user showed a screenshot where grass looked overexposed and lacked AAA-quality depth, with noisy flag-like distant grass.

用户提供截图，反馈草地过曝、缺少 3A 质感，并且远处看起来有很多像国旗一样的噪点。

# Scope / 范围

Update grass instance material shading and distant grass LOD density only. Do not change global post-processing, terrain textures, water, trees, player behavior, scene lighting, leaf decals, enemy assets, or unrelated pending work.

仅更新草实例材质着色和远处草地 LOD 密度。不修改全局后处理、地形贴图、水体、树木、玩家行为、场景灯光、落叶贴花、敌人资源或无关待提交改动。

# Acceptance Criteria / 验收标准

- Close grass no longer clips toward pale mint or white under direct light.
- Grass keeps blade readability and does not collapse into flat dark patches.
- Distant grass has less alpha-card speckle and fewer flag-like noisy shapes.
- Terrain, trees, player, water, and global exposure are not intentionally changed.
- Build verification passes.

- 近处草地在直射光下不再偏向苍白薄荷色或白色。
- 草叶仍有可读性，不变成平面暗块。
- 远处草地减少 alpha 草片闪点和旗帜状噪点。
- 地形、树木、玩家、水体和全局曝光不被主动修改。
- 构建验证通过。
