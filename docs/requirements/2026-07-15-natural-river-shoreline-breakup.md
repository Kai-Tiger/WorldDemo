# Requirement / 需求

## Summary / 概要

**中文：** 打散过于干净的河流水面边界，并加强水面、浅水、湿岸和砾石之间的自然过渡。

**English:** Break up overly clean river-water boundaries and improve the natural transition between water, shallows, wet banks, and gravel.

## User Request / 用户需求

**中文：** 用户指出河水边界线过于干净整齐，并要求重新应用代码修改，使岸线看起来更自然。

**English:** The user reported that the river boundary looked too clean and regular and requested that the code change be reapplied to make the shoreline appear more natural.

## Scope / 范围

**中文：** 在统一水面着色器中加入静态、多尺度的河岸覆盖扰动、0.08–0.22 米的向内侵蚀和按河宽缩放的 0.18–0.50 米透明过渡；在现有地形材质中扰动湿岸与砾石遮罩。保留河道几何、湖泊覆盖、流向、水深、碰撞和现有泡沫逻辑。

**English:** Add static multi-scale riverbank coverage breakup, 0.08–0.22 meters of inward erosion, and a river-width-scaled 0.18–0.50 meter transparency transition to the unified water shader; perturb the existing wet-bank and gravel masks in the terrain material. Preserve river geometry, lake coverage, flow direction, water depth, collision, and existing foam behavior.

## Acceptance Criteria / 验收标准

**中文：** 河岸不再呈现连续的一像素硬轮廓；岸线扰动不会随时间漂移；窄支流和主河道保持可读宽度；湿岸与砾石边缘不再是均匀平行带；湖泊岸线、河流玩法数据和泡沫行为保持不变；相关自动化测试和生产构建通过。

**English:** Riverbanks no longer render as a continuous one-pixel hard outline; shoreline breakup does not drift over time; tributaries and the main river retain readable width; wet-bank and gravel edges no longer form uniform parallel bands; lake shorelines, river gameplay data, and foam behavior remain unchanged; relevant automated tests and the production build pass.
