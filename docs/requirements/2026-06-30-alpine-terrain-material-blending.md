# Requirement / 需求

## English

Use the generated alpine terrain textures to expand terrain material coverage without changing the existing grass textures.

## 中文

使用已生成的高山地形贴图扩展地形材质覆盖，同时不修改现有草地贴图。

# Summary / 概要

## English

Extend the terrain shader so low flat areas keep the current grass, dirt, and dry grass textures, while higher or steeper terrain blends into frozen dirt, scree, rock, and snow. River bed and wet bank materials remain the final visual override.

## 中文

扩展地形 shader：低海拔平缓区域继续使用当前草地、泥土和干草贴图；中高海拔或更陡的区域混合为冻土、碎石、岩石和积雪。河床和湿河岸材质继续作为最终视觉覆盖层。

# User Request / 用户需求

## English

The user asked to implement the alpine texture coverage plan, with the explicit constraint that existing grass textures must not be changed.

## 中文

用户要求实现雪山贴图覆盖规划，并明确要求不要修改已经存在的草地贴图。

# Scope / 范围

## English

- Add terrain shader sampling for frozen dirt, scree, rock, and snow textures.
- Preserve the existing `ground-grass.webp`, `ground-dirt.webp`, and `ground-dry-grass.webp` lowland blend.
- Keep river channel, river bed, and river bank logic unchanged.
- Do not add normal maps, roughness maps, or new terrain geometry.

## 中文

- 为地形 shader 新增冻土、碎石、岩石和积雪贴图采样。
- 保留现有 `ground-grass.webp`、`ground-dirt.webp`、`ground-dry-grass.webp` 的低地混合逻辑。
- 保持河道、河床和河岸逻辑不变。
- 不新增 normal 贴图、roughness 贴图或新的地形几何。

# Acceptance Criteria / 验收标准

## English

- Low flat terrain continues to use the existing grass texture blend.
- Mid and high terrain can display frozen dirt, scree, rock, and snow based on height and slope.
- River bed and wet bank textures still override terrain materials in river areas.
- The project builds successfully.

## 中文

- 低海拔平缓地形继续使用现有草地混合效果。
- 中高海拔地形可以根据高度和坡度显示冻土、碎石、岩石和积雪。
- 河道区域仍由河床和湿河岸贴图覆盖。
- 项目可以成功构建。
