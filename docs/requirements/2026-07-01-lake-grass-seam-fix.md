# Requirement / 需求

Fix the remaining lake issues where grass still appears under the lake surface and snowmelt or stream strips show visible boundaries against the lake.

修复湖区残留问题：湖面下仍有草地实例，以及融雪/小河水带与湖面之间仍有明显分界线。

# Summary / 概要

This change applies water-system vegetation exclusion to the actual grass zone generator, increases tree water exclusion padding, removes the extra lake reflection layer, and fades stream surfaces where they enter or leave the lake.

本次将水系植被排除接入实际使用的草地区块生成器，扩大树木水系排除缓冲，移除额外湖面反射层，并让入湖/出湖水带渐隐。

# User Request / 用户需求

The user reported that the previous fix did not resolve the visible grass inside the lake and that the river/lake boundary was still obvious.

用户反馈上一次修复没有解决湖内可见草地，并且河水与湖水分界仍然明显。

# Scope / 范围

Update grass and tree placement exclusions plus water-system mesh/material blending. Do not change player controls, cloud rendering, terrain asset files, or the existing waterfall layout.

更新草和树的放置排除，以及水系网格/材质融合。不修改玩家控制、云层渲染、地形资源文件或现有瀑布布局。

# Acceptance Criteria / 验收标准

- Grass generated through grass zones is excluded from the lake, wet shore, outlet stream, snowmelt channels, and plunge pool.
- Clustered grass placement cannot pull accepted candidates back into water-covered areas.
- Trees use a larger water-system exclusion buffer than grass.
- Lake water uses a single custom surface layer rather than stacked transparent lake layers.
- Snowmelt and outlet stream surfaces fade at lake transitions, avoiding hard visible water-strip seams.
- Build verification passes.
- Screenshot QA checks lake grass removal and stream/lake blending.

- 通过草地区块生成的草会避开湖面、湿岸、湖口小河、融雪水道和瀑布冲击池。
- 草地聚类偏移不会把已通过候选点重新拉回水面覆盖区域。
- 树木使用比草更大的水系排除缓冲。
- 湖水使用单一自定义水面层，而不是多层透明湖面叠加。
- 融雪和湖口小河在湖面过渡处渐隐，避免清晰水带接缝。
- 构建验证通过。
- 截图验收覆盖湖区草地移除和河湖融合。
