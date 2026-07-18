# Requirement / 需求

中文：删除 `public` 目录中未被应用运行时、测试或资产生成工具使用的材质贴图文件。

English: Remove material texture files under `public` that are unused by the application runtime, tests, and asset-generation tools.

## Summary / 概要

中文：清理已被当前地形和植被管线替代的旧地形贴图、旧派生材质贴图和 Ribbon Grass 原始 4K 贴图，同时保留运行时资源、测试资产、生成工具输入以及用户尚未提交的九宫格地形资产。

English: Remove legacy terrain textures, obsolete derived material textures, and original Ribbon Grass 4K textures that have been superseded by the current terrain and vegetation pipelines, while preserving runtime assets, test fixtures, generator inputs, and the user's uncommitted nine-grid terrain asset.

## User Request / 用户需求

中文：删除没有使用的材质和贴图文件。

English: Delete unused material and texture files.

## Scope / 范围

中文：仅删除 `public/assets/terrain` 和 `public/assets/vegetation/ribbon-grass` 下经引用扫描确认无依赖的图片及 KTX2 文件；不修改应用代码、测试、模型文件或仍被工具使用的源贴图。

English: Delete only image and KTX2 files under `public/assets/terrain` and `public/assets/vegetation/ribbon-grass` that have no dependencies according to the reference scan; do not modify application code, tests, model files, or source textures still used by tools.

## Acceptance Criteria / 验收标准

中文：

- 已确认无运行时、测试或工具引用的 37 个贴图文件被删除。
- 当前运行时加载的地形和草地贴图全部保留。
- `nine-grid-height.png`、测试依赖和资产生成工具输入全部保留。
- 相关自动化测试通过，且提交中不包含用户已有的无关改动。

English:

- The 37 texture files confirmed to have no runtime, test, or tool references are deleted.
- All terrain and grass textures loaded by the current runtime remain available.
- `nine-grid-height.png`, test dependencies, and asset-generator inputs are preserved.
- Relevant automated tests pass, and the commit excludes the user's pre-existing unrelated changes.
