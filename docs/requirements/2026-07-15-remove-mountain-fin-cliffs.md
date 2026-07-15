# Remove Mountain Fin Cliffs / 移除山体刀片断崖

## Requirement / 需求

**中文**

修复中央山区出现的竖直岩板、刀片峰和等高带断崖，使山体高程连续且符合自然山脊形态。

**English**

Remove vertical rock slabs, fin-like peaks, and contour-band cliffs from the central mountains so elevation remains continuous and follows natural ridge forms.

## Summary / 概要

**中文**

上一版削峰同时使用高斜率抬升曲线、稀疏宽尺度采样和绝对高度山路平台，导致中高海拔坡度最高被放大约 2.72 倍，并把部分山路及峰顶抬成数百米高的岩柱。本修复将抬升改为最大约 1.66 倍的连续曲线，以约 4 米间距的坡度约束场削平高度断层，并限制山路及峰顶最多只高出自然地表 4 米。

**English**

The previous peak reduction combined a high-slope uplift curve, sparse broad-scale sampling, and absolute-height trail platforms. This amplified mid-highland slopes by up to approximately 2.72× and raised some trails and summits into rock pillars hundreds of meters tall. This fix uses a continuous uplift capped near 1.66×, removes source-height walls through a slope-limited field sampled at approximately four-meter spacing, and limits trail and summit fill to four meters above the natural surface.

## User Request / 用户需求

**中文**

用户指出当前山峰像错误实现生成的竖直刀片，自然界不存在这种山体形态，要求修正。

**English**

The user reported that the mountains looked like vertical fins from an incorrect implementation and requested a natural terrain correction.

## Scope / 范围

**中文**

- 保持中央自然地形最高峰 350 米、185 米以下地形和外围山环不变。
- 使用 `H = h + 50 × smoothstep(t)` 替代中段过陡的顶部压缩曲线。
- 从原始 4096×4096 高度图生成约 4 米采样间距的中央山体约束场，将源高程最大坡度限制为 0.55 米/米，再双线性约束全分辨率采样。
- 山路与峰顶平台仍可切入过高地表，但最多只可填高到自然地表以上 4 米，禁止使用旧绝对高程生成石柱。
- 不修改高度图资产、河湖、低地、材质或地标坐标。

**English**

- Keep the 350-meter natural central summit cap, terrain below 185 meters, and the outer mountain ring unchanged.
- Replace the overly steep midrange summit-compression curve with `H = h + 50 × smoothstep(t)`.
- Build a central mountain constraint field from the 4,096×4,096 source heightmap at approximately four-meter spacing, limit source-elevation slope to 0.55 meters per meter, and bilinearly constrain full-resolution samples with that field.
- Trails and summit platforms may still cut into terrain that is too high, but may fill no more than four meters above the natural surface; obsolete absolute elevations must not create pillars.
- Do not modify the heightmap asset, rivers, lakes, lowlands, materials, or landmark coordinates.

## Acceptance Criteria / 验收标准

**中文**

- 中央高程映射单调，任意相邻 1 米源高程的输出差小于 1.66 米。
- 人工垂直高度断层经完整中央映射后，相邻约 4 米采样的高差小于 4 米。
- 山路和峰顶塑形在低于旧绝对目标高度时，填高量不超过 4 米。
- 同一山景机位不再出现竖直岩板、刀片峰或沿固定海拔形成的断崖。
- 完整测试、低地一致性检查和生产构建通过。

**English**

- Central elevation mapping is monotonic, and every adjacent one-meter source step produces less than 1.66 meters of output change.
- After the complete central mapping, an artificial vertical source wall produces less than four meters of elevation change between samples approximately four meters apart.
- Trail and summit shaping fills no more than four meters when the natural surface lies below an obsolete absolute target.
- The same mountain vista no longer shows vertical slabs, fin peaks, or cliffs aligned to a fixed elevation band.
- The full test suite, lowland consistency check, and production build pass.
