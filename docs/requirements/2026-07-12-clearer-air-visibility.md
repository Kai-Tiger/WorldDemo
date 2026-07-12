# Requirement / 需求

Improve long-range visibility in the mountain environment while preserving natural atmospheric perspective.

提升高山环境的远景可见度，同时保留自然的空气透视。

# Summary / 概要

Reduce the shared exponential fog density from `0.00135` to `0.0008` so valleys and distant terrain remain readable without exposing the map boundary.

将共享指数雾密度从 `0.00135` 降低至 `0.0008`，让谷地和远处地形保持可辨，同时避免暴露地图边界。

# User Request / 用户需求

The user reported that the environment has low visibility and requested clearer, more transparent air.

用户反馈当前环境可见度偏低，希望提高空气透明度。

# Scope / 范围

Update only the shared fog density used by the scene and custom water shaders. Preserve the existing fog model and color, sky, clouds, lighting, exposure, materials, post-processing, and unused linear or height-fog settings.

仅调整场景与自定义水体着色器共用的雾密度。保留现有雾模型与雾色、天空、云层、光照、曝光、材质、后期处理，以及尚未使用的线性雾和高度雾配置。

# Acceptance Criteria / 验收标准

- Terrain, water, and vegetation at roughly 600–1000 meters are visibly clearer.
- Distant mountains still fade naturally into atmospheric haze without a hard map or camera cutoff.
- Water and surrounding terrain retain consistent distance fogging.
- Near-field player, snow, rock, sky, cloud, lighting, and post-processing appearance remains unchanged.
- Automated tests and the production build succeed.
- Deterministic review cameras show no runtime or shader errors.

- 约 600–1000 米范围内的地形、水体和植被明显更加清晰。
- 远山仍自然淡入大气雾，不出现地图或相机远裁剪硬边。
- 水体与周围地形保持一致的远距雾化效果。
- 近景角色、积雪、岩石、天空、云层、光照和后期处理外观保持不变。
- 自动化测试和生产构建成功。
- 固定验收机位下无运行时或着色器错误。
