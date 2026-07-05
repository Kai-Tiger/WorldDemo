// ============================================================
// Map / Terrain  |  地图 / 地形
// ============================================================

/** 地图总边长（米）  |  Total map side length in meters */
export const MAP_SIZE = 1536;

/** 植被管理方块边长（米），草和树共用  |  Vegetation chunk side length, shared by grass and trees */
export const ZONE_SIZE = 64;

/** 方块保留距离（米），超出最大可见距离额外保留的缓冲  |  Keep-alive padding beyond max view distance */
export const KEEP_ALIVE_PADDING = ZONE_SIZE;

// ============================================================
// Gravel overlay  |  碎石覆盖层
// ============================================================

/** 碎石覆盖层围绕玩家生成的半径（米）  |  Gravel overlay generation radius around player (m) */
export const GRAVEL_OVERLAY_RADIUS = 120;

/** 碎石覆盖层网格顶点间距（米）  |  Gravel overlay mesh vertex spacing (m) */
export const GRAVEL_OVERLAY_VERTEX_SPACING = 1;

/** 碎石覆盖层高出地形的距离（米），避免 z-fighting  |  Gravel overlay height offset above terrain (m) */
export const GRAVEL_OVERLAY_Y_OFFSET = 0.06;

/** 碎石贴图世界尺寸（米）  |  Gravel overlay texture world size (m) */
export const GRAVEL_OVERLAY_TEXTURE_WORLD_SIZE = 4.5;

/** 每帧最多新增/移除的碎石覆盖层方块数  |  Max gravel overlay chunks added/removed per frame */
export const GRAVEL_OVERLAY_CHUNK_MUTATIONS = 3;

/** 碎石 patch 候选密度（片 / 平方米）  |  Gravel patch candidate density (patches / m²) */
export const GRAVEL_PATCH_DENSITY = 0.024;

/** 碎石 patch 随机缩放范围  |  Gravel patch random scale range */
export const GRAVEL_PATCH_SCALE_MIN = 0.82;
export const GRAVEL_PATCH_SCALE_MAX = 1.28;

/** 碎石 patch 之间的近似最小间距（米）  |  Approximate minimum spacing between gravel patches (m) */
export const GRAVEL_PATCH_MIN_SPACING = 3.5;

// ============================================================
// Grass  |  草
// ============================================================

/** 草地模型文件路径  |  Grass 3D model path */
export const GRASS_MODEL_PATH = '/assets/vegetation/grass-clumps.glb';

// --- 放置 (Placement) ---

/** LOD 各级密度（丛 / 平方米）  |  Density per LOD level (clumps / m²) */
export const GRASS_LOD_DENSITIES = [16, 4, 1];

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

/** 出生点附近替换用树木模型路径  |  Tree model path used only for spawn-area replacements */
export const SPAWN_TREE_MODEL_PATH = '/assets/vegetation/tree_spawn.glb';

/** 出生点附近替换的现有树木数量  |  Existing tree count replaced near spawn */
export const SPAWN_TREE_REPLACEMENT_COUNT = 10;

/** 出生点替换树模型缩放倍率  |  Scale multiplier for the spawn replacement tree model */
export const SPAWN_TREE_SCALE_MULTIPLIER = 0.35;

/** 树木暗部补光颜色，保持偏绿避免逆光下发灰  |  Tree shadow lift color, green-tinted to avoid gray backlit trees */
export const TREE_SHADOW_LIFT_COLOR = 0x24351f;

/** 树木暗部补光强度；逆光过黑时提高，发亮发平时降低  |  Tree shadow lift intensity; raise for dark backlight, lower if trees look flat */
export const TREE_SHADOW_LIFT_INTENSITY = 0.68;

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
