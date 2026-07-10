# Requirement / 需求

## Summary / 概要

**中文：** 将全局复合照片地表替换为纯材质分层 PBR，并为地形建立连续法线和近中远 LOD。

**English:** Replace the globally tiled composite ground photograph with layered pure-material PBR and add continuous normals plus near/mid/far terrain LOD.

## User Request / 用户需求

**中文：** 用户要求解决地形发灰、重复、缺乏真实材质响应和高密网格挤占性能预算的问题。

**English:** The user requested fixes for gray, repetitive terrain, inconsistent material response, and dense geometry consuming the rendering budget.

## Scope / 范围

**中文：** 接入 dirt、moss、dry grass、gravel、rock、snow 分层；保留河道与湖泊遮罩；采用标准 PBR 光照；按质量档生成地形 LOD；使用全局高度采样法线避免 chunk 接缝；保持地形编辑器可用。

**English:** Integrate dirt, moss, dry grass, gravel, rock, and snow layers; preserve river and lake masks; use standard PBR lighting; generate quality-dependent terrain LOD; use global height-derived normals to avoid chunk seams; preserve terrain editor behavior.

## Acceptance Criteria / 验收标准

**中文：** 构建和 GPU Shader 编译通过；地形接受环境反射、阴影和雾；近景不再由 forest-floor 复合照片主导；chunk 边缘无亮线；质量切换能改变 LOD 且不破坏高度编辑和水体地形衔接。

**English:** Build and GPU shader compilation pass; terrain receives environment lighting, shadows, and fog; close ground is no longer dominated by the composite forest-floor photograph; chunk borders show no lighting seams; quality switching changes LOD without breaking height editing or water-terrain alignment.
