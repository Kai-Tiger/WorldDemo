import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const TRANSCODER_PATH = '/basis/';

export function createCompressedTextureLoader(renderer) {
  return new KTX2Loader()
    .setTranscoderPath(TRANSCODER_PATH)
    .detectSupport(renderer);
}
