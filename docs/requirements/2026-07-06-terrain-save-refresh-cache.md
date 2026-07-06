# Requirement / 需求

English: Ensure saved terrain heightmap edits remain visible after refreshing the page.

中文：确保保存后的地形高度图编辑在刷新页面后仍然可见。

# Summary / 概要

English: Add a cache-busting query to the editable heightmap image request so the browser reloads the latest `height.webp` from disk after a save, while keeping the existing save endpoint, file path, terrain algorithm, and material texture loading unchanged.

中文：为可编辑高度图图片请求添加缓存绕过查询参数，让浏览器在保存后重新从磁盘加载最新的 `height.webp`，同时保持现有保存接口、文件路径、地形算法和材质贴图加载不变。

# User Request / 用户需求

English: The user reported that terrain edits disappear after saving and refreshing the page.

中文：用户反馈保存地形后再次刷新页面，地形编辑就没有了。

# Scope / 范围

English: Update only the heightmap image loading URL used by terrain data initialization. Do not change the save endpoint, saved file location, terrain editing brush behavior, heightmap asset contents, terrain material textures, water, vegetation, player behavior, or unrelated pending work.

中文：只更新地形数据初始化使用的高度图图片加载 URL。不修改保存接口、保存文件位置、地形编辑笔刷行为、高度图资产内容、地形材质贴图、水体、植被、玩家行为或无关未提交改动。

# Acceptance Criteria / 验收标准

English:
- Heightmap loading appends a cache-busting query when requesting `height.webp`.
- `HEIGHT_MAP_PATH` remains `/assets/terrain/height.webp`.
- The save endpoint still writes `public/assets/terrain/height.webp`.
- Normal terrain material texture loading is unchanged.
- The production build completes successfully.

中文：
- 加载 `height.webp` 时会追加缓存绕过查询参数。
- `HEIGHT_MAP_PATH` 仍为 `/assets/terrain/height.webp`。
- 保存接口仍写入 `public/assets/terrain/height.webp`。
- 普通地形材质贴图加载保持不变。
- 生产构建成功完成。
