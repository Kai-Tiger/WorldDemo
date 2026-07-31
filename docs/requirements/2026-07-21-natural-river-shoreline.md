# Natural River Shoreline / 自然河流岸线

## Requirement / 需求

River water edges must avoid long, uniformly smooth boundary lines while preserving the authored channel path, width envelope, and connected-water seams.

河流水面边缘需要避免长距离、过度均匀的平滑边界线，同时保留原有河道走向、宽度范围和水体连接接缝。

## Summary / 概要

Add bounded, deterministic, low-frequency inward variation to the left and right river banks. Fade the variation near reach endpoints and authored rock disturbances so connected-water seams and wake placement remain exact.

为左右河岸加入有界、确定性的低频内收变化，并在河段端点和已设置的岩石扰流附近淡出，以保持水体接缝与尾流位置准确。

## User Request / 用户需求

The river boundary lines look slightly too regular and should feel more natural.

河流的边界线有点太规整，需要表现得更自然。

## Scope / 范围

- Update only generated river-strip geometry and its metric lateral/shore attributes.
- Keep the authored centerline, water levels, terrain carving, lake geometry, and confluence patch topology unchanged.
- Add regression coverage for bounded asymmetric shoreline variation and exact endpoint seams.

- 仅修改生成的河流条带几何及其横向、岸边距离属性。
- 保持原有中心线、水位、地形雕刻、湖泊几何和汇流补片拓扑不变。
- 新增回归测试，覆盖有界的非对称岸线变化和精确的端点接缝。

## Acceptance Criteria / 验收标准

- Left and right banks retreat independently instead of forming a uniform ribbon or expanding into dry terrain.
- Width variation stays within 18% of the authored width.
- Variation fades to zero at reach endpoints, preserving lake and confluence seams.
- Lateral flow coordinates and shore distances continue to match the deformed geometry.
- River geometry tests, the full test suite, and the production build pass without runtime warnings or errors.

- 左右河岸独立内收，不再形成宽度均匀的规则带状边界，也不会扩张到干燥地形中。
- 河宽变化保持在原设定宽度的 18% 以内。
- 变化在河段端点处淡出为零，保持湖口和汇流接缝连续。
- 横向流动坐标和岸边距离继续与变形后的几何匹配。
- 河流几何测试、完整测试集和生产构建全部通过，运行时无警告或错误。
