# Requirement / 需求

## Summary / 概要

中文：参考 LAAS 网页的森林地面风格，增强本地地形的近景厚度、坡面细节和草层覆盖，同时保持远景、道路与水体边缘稳定。

English: Use the LAAS forest-ground style as a reference to strengthen local near-ground depth, slope detail, and grass coverage while keeping distant terrain, trails, and water edges stable.

## User Request / 用户需求

中文：打开并实机观察参考网页的 WASD 移动和飞行视角，分析其视觉与地面实现，再迭代修改本地项目，直到整体风格和地面效果更接近参考。

English: Open and interactively inspect the reference page using its movement and flight views, analyze its visual and terrain implementation, then iterate on the local project until its style and ground treatment are closer to the reference.

## Scope / 范围

中文：为统一地形材质增加 45–85 米内淡出的程序微起伏；水道、湖床和山路不产生位移；让实际使用的 Medium 地形材质启用岩石三平面颜色与法线；将森林底土和岩石调为暗橄榄与暖灰；适度放大现有草模型以提高视觉覆盖。保留现有地形块材质统一规则，不引入新贴图、地形系统或全局环境重构。

English: Add procedural micro-relief fading between 45 and 85 meters to the shared terrain material; keep rivers, lake beds, and mountain trails undisplaced; enable triplanar rock color and normals in the actually used Medium material; grade forest floor and rock toward dark olive and warm gray; and moderately enlarge the existing grass model for denser visual coverage. Preserve the unified chunk-material rule and avoid new textures, a new terrain system, or a global environment rewrite.

## Acceptance Criteria / 验收标准

中文：近景地面不再呈现完全平坦的贴图铺面；微起伏在 85 米外平滑消失且不会破坏水道或山路；陡坡岩石没有明显的 XZ 投影拉伸并使用现有岩石法线；森林底土、岩石和草层颜色及覆盖更接近参考画面；所有地形块仍共享 Medium 材质；相关测试、完整测试套件和生产构建通过。

English: Near ground no longer reads as a completely flat textured sheet; relief fades smoothly beyond 85 meters without disturbing water corridors or trails; steep rock slopes avoid obvious XZ projection stretching and use the existing rock normal; forest floor, rock, and grass coverage are closer to the reference; every terrain chunk still shares the Medium material; and targeted tests, the full test suite, and the production build pass.
