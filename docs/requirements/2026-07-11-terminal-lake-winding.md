# Requirement / 需求

Ensure every radial lake surface uses consistent upward triangle winding, and provide a fixed overhead diagnostic shot for the new circular river-terminal lake.

确保所有径向湖面网格采用一致的朝上三角形绕序，并为新增的圆形河道终点湖提供固定俯视诊断镜头。

# Summary / 概要

Reverse the two outer-ring index triples that previously faced downward while retaining the upward center fan. Add regression coverage for triangle counts, face normals, computed vertex normals, and the terminal-lake overhead Golden Shot.

反转原先朝下的两组外圈索引顺序，同时保留朝上的中心扇形。新增回归测试，覆盖三角形数量、面法线、计算后顶点法线以及终点湖俯视 Golden Shot。

# User Request / 用户需求

Remove the visible dark ring from the newly added circular lake, specifically the river-terminal lake rather than the lake beside the spawn point.

消除新增圆形湖面上可见的暗环；目标明确为河道终点湖，而非出生点旁的湖泊。

# Scope / 范围

- Correct only the radial lake surface index winding; preserve radial resolution, attributes, water levels, materials, shoreline logic, and terrain carving.
- Add a deterministic overhead Golden Shot centered on the river-terminal lake at `(690, -340)` with the player outside its shore band.
- Add automated geometry and Golden Shot regression tests.
- Do not change GTAO behavior, river-tail geometry, water shaders, lighting, vegetation, terrain textures, or unrelated assets in this change.

- 仅修正径向湖面的索引绕序；保留现有径向分辨率、顶点属性、水位、材质、岸线逻辑和地形挖掘。
- 在 `(690, -340)` 的河道终点湖中心增加确定性俯视 Golden Shot，玩家位于湖岸过渡带之外。
- 新增几何与 Golden Shot 自动化回归测试。
- 本变更不修改 GTAO 行为、河道尾部几何、水体 Shader、光照、植被、地形贴图或无关资源。

# Acceptance Criteria / 验收标准

- Every indexed triangle generated for a radial lake has a strictly positive geometric Y normal.
- Every computed lake vertex normal points upward.
- Each lake retains `769` vertices and `1,472` triangles (`64` angular segments and `12` radial rings).
- `?shot=terminal-lake-overhead` places the camera directly above the new circular lake and aims at its water surface.
- Targeted tests and the production build pass without shader or asset-loading regressions.

- 径向湖面生成的每个索引三角形都具有严格大于零的几何 Y 法线。
- 每个计算后的湖面顶点法线均朝上。
- 每个湖面保持 `769` 个顶点和 `1,472` 个三角形（`64` 个角向分段、`12` 个径向环）。
- `?shot=terminal-lake-overhead` 将相机置于新增圆形湖正上方，并朝向其水面。
- 针对性测试与生产构建通过，且无 Shader 或资源加载回归。
