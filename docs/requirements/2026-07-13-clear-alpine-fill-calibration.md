# Requirement / 需求

Calibrate the completed clear-alpine lighting against the fixed Balanced forest capture without increasing exposure.

在不提高曝光的前提下，依据固定的 Balanced 森林截图校准已完成的清朗高山光照。

# Summary / 概要

Increase only physical environment fill: environment IBL intensity becomes 1.20 and hemisphere-light intensity becomes 2.15, while exposure remains 1.14.

仅提高物理环境填充：环境 IBL 强度调整为 1.20，半球光强度调整为 2.15，同时曝光保持 1.14。

# User Request / 用户需求

The user required a clear alpine morning in which ground and trees are normally lit, with a forest lower-half mean luminance of 75–95 and no clipped sky.

用户要求清朗高山上午中的地面与树木具有正常亮度，森林下半区平均亮度达到 75–95，且天空不得剪白。

# Scope / 范围

Change only the shared environment-map and hemisphere-light intensities plus their focused assertions. Preserve sun direction, exposure, color grading, materials, geometry, gameplay, and unrelated pending work.

仅修改共享环境贴图与半球光强度及其定向断言。保持太阳方向、曝光、调色、材质、几何、玩法和无关待处理改动不变。

# Acceptance Criteria / 验收标准

- Balanced forest lower-half mean luminance is at least 75.
- Pixels below luminance 64 remain at or below 45% of the lower half.
- Near-white clipping remains below 1%.
- Exposure remains 1.14, and focused tests plus the production build pass.

- Balanced 森林下半区平均亮度至少为 75。
- 下半区低于亮度 64 的像素比例不超过 45%。
- 近白剪裁比例低于 1%。
- 曝光保持 1.14，定向测试与生产构建通过。
