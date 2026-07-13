import { existsSync } from 'node:fs';
import { copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { defineConfig } from 'vite';

const HEIGHTMAP_ENDPOINT = '/__terrain-heightmap';
const HEIGHTMAP_PATH = path.resolve('public/assets/terrain/height.webp');
const HEIGHTMAP_BACKUP_PATH = path.resolve('public/assets/terrain/height.original.webp');
const MAX_HEIGHTMAP_BYTES = 64 * 1024 * 1024;

export default defineConfig({
  plugins: [terrainHeightmapWriter()],
});

function terrainHeightmapWriter() {
  return {
    name: 'terrain-heightmap-writer',
    configureServer(server) {
      server.middlewares.use(HEIGHTMAP_ENDPOINT, async (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('POST only');
          return;
        }

        try {
          const body = await readRequestBody(request);

          if (!existsSync(HEIGHTMAP_BACKUP_PATH)) {
            await copyFile(HEIGHTMAP_PATH, HEIGHTMAP_BACKUP_PATH);
          }

          const encoded = await encodeHeightmapForStorage(body);

          await writeFile(HEIGHTMAP_PATH, encoded);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ ok: true, bytes: encoded.length }));
        } catch (error) {
          response.statusCode = 500;
          response.end(error instanceof Error ? error.message : 'Failed to save heightmap');
        }
      });
    },
  };
}

export async function encodeHeightmapForStorage(image) {
  return sharp(image).webp({ lossless: true, effort: 6 }).toBuffer();
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > MAX_HEIGHTMAP_BYTES) {
      throw new Error('Heightmap payload is too large');
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
