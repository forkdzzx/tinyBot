import './artwork.js';
import './frames.js';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';

const {defs, modes, paths, geometry} = globalThis.JarvisEyeArtwork;
const {sizes, renderSVG} = globalThis.JarvisEyeFrames;
const root = new URL('./', import.meta.url);

function makeManifest() {
    return {
        format: 'jarvis-eye-artwork/1',
        artwork: 'artwork.js',
        frameRenderer: 'frames.js',
        units: {time: 'ms', position: 'viewBox unit', rotation: 'degree', scale: 'unitless'},
        sizes,
        background: {on: '#03070c', off: '#000000'},
        face: {viewWidth: 720, eyeCenterX: [227, 493], eyeCenterY: {square: 294, small: 209},
            symbolOffsetY: {square: 0, small: -42}, fillRule: 'evenodd'},
        overlay: {caption: {leftFraction: .06, rightFraction: .06, bottomFraction: .07, maxLines: 2},
            status: {topFraction: .05, rightFraction: .06}},
        modes,
        paths,
        states: Object.fromEntries(Object.entries(defs).map(([state, def]) => [state, {
            ...def,
            variants: Object.fromEntries(Object.keys(modes).map(mode => [mode, {
                eyes: geometry(state, mode),
                frame: `frames/${mode}/${state}.svg`,
            }])),
        }])),
    };
}

function generate(verify) {
    function emit(relative, content) {
        const location = new URL(relative, root);
        if (verify) {
            if (readFileSync(location, 'utf8') !== content) throw new Error('请重新生成 ' + relative);
        } else {
            mkdirSync(new URL('.', location), {recursive: true});
            writeFileSync(location, content);
        }
    }
    emit('manifest.json', JSON.stringify(makeManifest(), null, 2) + '\n');
    let count = 0;
    for (const mode of Object.keys(modes)) {
        for (const state of Object.keys(defs)) {
            emit(`frames/${mode}/${state}.svg`, renderSVG(state, mode));
            count++;
        }
    }
    console.log(`${verify ? '已逐文件核对' : '已生成'} manifest.json 和 ${count} 个静帧。`);
}

const help = `node design/eyes/export.mjs check
node design/eyes/export.mjs generate
node design/eyes/export.mjs frame <state> <mode> [--size small|square] [--time ms] [--age ms] [--plain] --out 文件.svg`;
function run(args) {
    const [command, ...rest] = args;
    if (command === '--help') return console.log(help);
    if (['generate', 'check'].includes(command) && rest.length === 0) return generate(command === 'check');
    if (command !== 'frame') throw new Error(help);
    const {positionals, values} = parseArgs({args: rest, allowPositionals: true, options: {
        size: {type: 'string', default: 'small'}, time: {type: 'string'}, age: {type: 'string'},
        plain: {type: 'boolean', default: false}, out: {type: 'string'},
    }});
    if (positionals.length !== 2 || !values.out || (values.age !== undefined && values.time === undefined)) throw new Error(help);
    const time = values.time === undefined ? null : Number(values.time);
    const age = values.age === undefined ? time : Number(values.age);
    const svg = renderSVG(positionals[0], positionals[1], {size: values.size, time, age, effects: !values.plain});
    writeFileSync(values.out, svg);
}
try {
    run(process.argv.slice(2));
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
