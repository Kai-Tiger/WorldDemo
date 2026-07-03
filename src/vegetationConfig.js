// ============================================================
// Map / Terrain  |  地图 / 地形
// ============================================================

/** 地图总边长（米）  |  Total map side length in meters */
export const MAP_SIZE = 2048;

/** 植被管理方块边长（米），草和树共用  |  Vegetation chunk side length, shared by grass and trees */
export const ZONE_SIZE = 64;

/** 方块保留距离（米），超出最大可见距离额外保留的缓冲  |  Keep-alive padding beyond max view distance */
export const KEEP_ALIVE_PADDING = ZONE_SIZE;

// ============================================================
// Grass  |  草
// ============================================================

/** 草地模型文件路径  |  Grass 3D model path */
export const GRASS_MODEL_PATH = '/assets/vegetation/grass-clumps.glb';

// --- 放置 (Placement) ---

/** LOD 各级密度（丛 / 平方米）  |  Density per LOD level (clumps / m²) */
export const GRASS_LOD_DENSITIES = [20, 5, 1.25];

/** LOD 距离阈值（米），距玩家超过此距离则使用对应级别的密度  |  LOD distance thresholds (m) */
export const GRASS_LOD_DISTANCES = [20, 50, 150];

/** 草在河道两侧的排除缓冲区（米）  |  River exclusion buffer for grass (m) */
export const GRASS_RIVER_BUFFER = 2;

/** 草地放置判定：地面遮罩阈值（低于此值不放置，值域 0-1）  |  Ground mask threshold for grass placement */
export const GRASS_GROUND_MASK_THRESHOLD = 0.3;

/** 低地渐隐高度范围（米），高于此区间草地纹理逐渐消失  |  Height range where lowland grass fades out (m) */
export const GRASS_LOWLAND_FADE_START = 130;
export const GRASS_LOWLAND_FADE_END = 185;

// --- 斑块聚类 (Patch clustering) ---

/** 每个方块生成的随机斑块数量  |  Random patches per zone chunk */
export const GRASS_PATCH_COUNT = 8;

/** 斑块半径范围（米）  |  Patch radius range (m) */
export const GRASS_PATCH_RADIUS_MIN = 1.5;
export const GRASS_PATCH_RADIUS_MAX = 4.0;

/** 斑块内空隙接受率（值域 0-1），越低斑块外越稀疏  |  Acceptance rate outside patches */
export const GRASS_PATCH_GAP_ACCEPTANCE = 0.75;

// --- 风动 (Wind sway) ---

/** 风吹摆动强度  |  Wind sway magnitude */
export const GRASS_SWAY_STRENGTH = 0.035;

/** 风向 X 分量  |  Wind direction X */
export const GRASS_WIND_X = 0.82;

/** 风向 Z 分量  |  Wind direction Z */
export const GRASS_WIND_Z = 0.38;

// --- 异步生成 (Async generation) ---

/** 每方块每帧最多生成的候选步数  |  Max generation steps per zone per frame */
export const GRASS_GENERATION_STEPS = 2000;

/** 每帧所有方块的总生成步数预算  |  Total generation step budget per frame */
export const GRASS_GENERATION_BUDGET = 8000;

/** 每帧最多激活/休眠的方块数  |  Max zone mutations (add/remove) per frame */
export const GRASS_ZONE_MUTATIONS = 4;

/** 每帧最多 LOD 重建的方块数  |  Max LOD rebuilds per frame */
export const GRASS_REBUILDS_PER_FRAME = 6;

/** LOD 重建触发阈值（米），玩家移动超过此距离才重建  |  Player movement threshold to trigger LOD rebuild (m) */
export const GRASS_REBUILD_THRESHOLD = 5;

// ============================================================
// Trees  |  树
// ============================================================

/** 树木模型文件路径列表  |  Tree model file paths */
export const TREE_MODEL_PATHS = [
  '/assets/vegetation/tree_01.glb',
  '/assets/vegetation/tree_02.glb',
  '/assets/vegetation/tree_03.glb',
  '/assets/vegetation/tree_04.glb',
];

/** 树木阴影可读性曝光倍率，1 = 基础补偿  |  Tree-only exposure multiplier for shadow readability, 1 = base lift */
export const TREE_EXPOSURE = 1.8;

// --- 放置 (Placement) ---

/** 树与树之间的最小间距（米）  |  Min spacing between trees (m) */
export const TREE_MIN_SPACING = 6;

/** 树在河道两侧的排除缓冲区（米）  |  River exclusion buffer for trees (m) */
export const TREE_RIVER_BUFFER = 5;

/** 树木密度（棵 / 平方米），按海拔分段  |  Tree density per m², by elevation band */
export const TREE_DENSITY_LOWLAND = 0.017;
export const TREE_DENSITY_MIDLAND = 0.010;
export const TREE_DENSITY_HIGHLAND = 0.0017;

/** 密度海拔分界高度（米）  |  Elevation thresholds for density bands (m) */
export const TREE_HEIGHT_THRESHOLD_LOW = 130;
export const TREE_HEIGHT_THRESHOLD_MID = 185;

/** 树木放置：地面遮罩阈值（低于此值不放置，值域 0-1）  |  Ground mask threshold for tree placement */
export const TREE_GROUND_MASK_THRESHOLD = 0.35;

/** 树木缩放范围（随机）  |  Tree scale range (uniform random) */
export const TREE_SCALE_MIN = 0.85;
export const TREE_SCALE_MAX = 1.20;

// --- FBM 分形噪声 (Fractal noise for natural clustering) ---

/** 噪声基础频率（越小簇越大，约 1/频率 = 特征波长米）  |  Base noise frequency (lower = larger clusters) */
export const TREE_NOISE_SCALE = 0.015;

/** 噪声倍频数（越多层次越丰富）  |  Noise octave count (more = richer detail) */
export const TREE_NOISE_OCTAVES = 6;

/** 噪声对密度的影响强度（0-1），1 = 最强，0 = 无影响  |  Noise influence on density (0-1) */
export const TREE_NOISE_INFLUENCE = 0.7;

/** 噪声调制下的最低密度倍率（0-1），影响范围 = [MIN_FACTOR, 1.0]  |  Min density multiplier under noise modulation */
export const TREE_NOISE_MIN_FACTOR = 0.3;
