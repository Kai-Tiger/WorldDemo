---
name: gravel-terrain-materials
description: Build layered PBR workflows for gravel-heavy game terrain materials. Use when designing or generating game ground textures, gravel terrain, dirt/grass/moss material layers, terrain splat maps, height/normal/roughness/AO texture sets, parallax/ displacement setups, or mesh scatter plans for rocks, pebbles, grass, leaves, and other ground detail.
---

# Gravel Terrain Materials

## Overview

Use this skill to plan or generate game terrain materials that look rich up close without baking every visual element into one noisy texture. Prefer layered PBR materials plus selective mesh scatter over a single image that mixes dirt, moss, grass, stones, leaves, and roots.

## Core Rule

Separate surface categories into reusable layers:

```text
base ground: dirt, dry soil, wet soil, sand, compacted path
coverage: moss, dry grass, sparse green grass, leaf litter
aggregate: gravel, pebbles, cracked rock, scree
details: decals, instanced stones, grass clumps, twigs, roots
```

Do not generate one texture that permanently contains all elements unless the user explicitly wants a unique, non-repeating set dressing patch.

## Workflow

1. Identify camera distance.
   - Far terrain: use broad albedo variation, low-frequency masks, and simple normal maps.
   - Playable mid-range: use layered PBR materials, macro variation, splat maps, and occasional decals.
   - Close-up ground: add height/parallax, stronger normals, AO, and real instanced detail meshes.

2. Split the material set.
   - Create each layer as a mostly pure material: dirt alone, gravel alone, moss alone, dry grass alone.
   - Keep each layer tile-friendly and avoid unique hero stones or obvious stains.
   - Put composition decisions into masks, vertex color, terrain paint, decals, or procedural scatter.

3. Build PBR maps per layer.

```text
*_albedo     base color; avoid baked lighting, hard shadows, highlights
*_normal     fine bump response for grains, pebbles, cracks, fibers
*_roughness  matte/wet/shiny response; gravel and dry dirt are usually rough
*_ao         contact darkening in cracks and between stones
*_height     height/parallax/displacement source for visible relief
```

Use `metallic` only when the material actually contains metal; most terrain layers use black/non-metal.

4. Blend layers spatially.
   - Use splat maps, weight maps, vertex colors, or shader masks.
   - Use height-based blending for transitions such as gravel sitting above dirt or moss settling in cracks.
   - Add macro noise/color variation so tiled materials do not reveal repetition over large areas.

5. Add geometry only where silhouette matters.
   - Use normal and height maps for dense tiny stones.
   - Use instanced pebble meshes for stones that must catch real light, cast shadows, or break the ground silhouette.
   - Use decals for local patches such as rock clusters, muddy ruts, leaf piles, or worn paths.

## Gravel-Specific Guidance

For gravel-heavy terrain, create at least:

```text
gravel_albedo
gravel_normal
gravel_roughness
gravel_ao
gravel_height
```

Make `gravel_albedo` mostly color information: stone colors, dust, dirt between pebbles, subtle variation. Avoid strong directional light, cast shadows, large unique stones, or obvious repeated clusters.

Make `gravel_height` high contrast enough to describe pebble relief, but keep the range believable. Small pebbles can use parallax or normal only; larger stones should become meshes.

## Prompting Image Generation

When generating source textures, ask for a single material layer:

```text
Square top-down photorealistic game terrain material, gravel only, tile-friendly, no large unique stones, no grass, no moss, no leaves, no baked shadows, diffuse daylight, rich fine detail, random pebble sizes, suitable for albedo source.
```

For base dirt:

```text
Square top-down photorealistic dirt ground material, compacted dry soil only, tile-friendly, no grass, no moss, no stones larger than tiny grit, no baked shadows, high-frequency soil granules, suitable for albedo source.
```

Generate color/albedo sources separately from technical maps when possible. If generating technical-looking maps, label the target map explicitly, but verify before production use.

## Validation Checklist

- Tile the texture 4x4 and check for repeated shapes, seams, grids, or recognizable clusters.
- View the material under at least two lighting directions.
- Confirm albedo does not contain strong baked shadows or highlights.
- Confirm normal intensity is readable but not inflated.
- Confirm roughness matches the material: dry soil and gravel are mostly matte; wet patches are localized.
- Confirm height/parallax does not make small gravel look like tall cobblestones.
- Confirm large silhouette details are handled by meshes or decals, not only flat texture.

## Common Mistakes

- Baking grass, moss, rocks, leaves, and dirt into one busy texture, then losing artistic control.
- Using one 8K texture instead of several reusable 1K/2K tileable layers.
- Adding strong shadows into albedo, causing the material to look wrong under dynamic lighting.
- Relying on normal maps for stones that need visible silhouettes.
- Making every layer high contrast; blended terrain needs some quiet base layers.
