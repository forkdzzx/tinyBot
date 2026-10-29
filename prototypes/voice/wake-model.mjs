import {fileURLToPath} from 'node:url';
export const MODEL_DIR=fileURLToPath(new URL('../../runtime/models/kws-zh-en-20251220/',import.meta.url));
export const MODEL_SOURCE='https://modelscope.cn/models/pkufool/icefall-kws-zipformer-zh-en-3M-2025-12-20';
export const MODEL_REVISION='541d04e28be57efc6fdf46a341da09e043a37b52';
export const MODEL_FILES=[
  ['onnx/encoder-epoch-13-avg-2-chunk-16-left-64.int8.onnx','408bbd740838c42d5bf6d1c5b80b3c88b616c7860b92d980328b5b068c76ae48'],
  ['onnx/decoder-epoch-13-avg-2-chunk-16-left-64.onnx','63a22dd60f40fff082ac3e09afa507f6787da36df76ded2fbe145fa233e22c21'],
  ['onnx/joiner-epoch-13-avg-2-chunk-16-left-64.int8.onnx','190d4067b4cc20b72a42a1916e69d92052000fb7051a427ebb1bc72a69207dc1'],
  ['data/lang_phone/tokens.txt','2d3f32311f9b692b964da3c90e830258d3e78e013cb0c992dbfb15cd5a1a71b0'],
  ['data/lang_phone/g2p.dict','e1974e152321ba247126f8808b7db201d7fc5d5b99723e702d10bd6f21510821'],
];
