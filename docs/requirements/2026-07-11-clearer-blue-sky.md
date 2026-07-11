# Requirement / 需求

Make the scene sky visibly bluer while preserving its existing cold mountain-morning atmosphere.

让场景天空呈现更清晰的蓝色，同时保留现有湿冷高山清晨氛围。

# Summary / 概要

Increase the blue saturation of the shared sky zenith and horizon colors without changing fog, clouds, lighting, exposure, or post-processing.

提高共享天空天顶色和地平线色的蓝色饱和度，不修改雾、云层、光照、曝光或后期处理。

# User Request / 用户需求

The user reported that the current sky is not blue enough and looks gray and hazy.

用户反馈当前天空不够蓝，整体有灰蒙蒙的感觉。

# Scope / 范围

Update only the shared sky zenith and horizon colors in the visual environment. Preserve the existing fog parameters, cloud coverage, sun settings, environment intensity, exposure, and post-processing.

仅调整视觉环境中共享的天空天顶色和地平线色。保留现有雾参数、云量、太阳设置、环境强度、曝光和后期处理。

# Acceptance Criteria / 验收标准

- The visible sky is clearly bluer and less gray.
- The sky retains a natural zenith-to-horizon gradient.
- Clouds, sun, fog, and scene exposure remain unchanged.
- Water reflections remain visually consistent with the sky.
- Automated tests and the production build succeed.
- Browser verification succeeds from deterministic review cameras.

- 可见天空明显更蓝，灰蒙感减弱。
- 天空仍保留自然的天顶到地平线渐变。
- 云层、太阳、雾和场景曝光保持不变。
- 水面反射与天空视觉保持一致。
- 自动化测试和生产构建成功。
- 使用固定验收机位完成浏览器视觉检查。
