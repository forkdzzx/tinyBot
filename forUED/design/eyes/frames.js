/* Load artwork.js first. These functions have no DOM or device dependencies. */
(() => {
    'use strict';
    const {defs, modes, faceMarkup} = globalThis.JarvisEyeArtwork;
    const sizes = {
        square: {width: 720, height: 720, viewHeight: 720},
        small: {width: 320, height: 240, viewHeight: 540},
    };

    function renderSVG(state, mode, {size = 'small', time = null, age = time, effects = true} = {}) {
        if (!Object.hasOwn(defs, state)) throw new Error('未知状态 ' + state);
        if (!Object.hasOwn(modes, mode)) throw new Error('未知模式 ' + mode);
        if (!Object.hasOwn(sizes, size)) throw new Error('未知尺寸 ' + size);
        for (const value of [time, age]) {
            if (value !== null && (!Number.isFinite(value) || value < 0)) {
                throw new Error('时间必须是非负的毫秒数');
            }
        }
        const {width, height, viewHeight} = sizes[size];
        const off = state === 'off';
        const artwork = faceMarkup(state, mode, time ?? 0, age ?? 1000, {
            height: viewHeight,
            still: time === null,
            quiet: state === 'dnd' || state === 'waiting',
            effects,
            entry: false,
        });
        const glow = '<defs><filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter></defs>';
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 720 ${viewHeight}">\n`
            + `<title>Jarvis · ${modes[mode].name} · ${defs[state].name}</title>\n`
            + (off ? '' : glow)
            + `<rect width="720" height="${viewHeight}" fill="${off ? '#000000' : '#03070c'}"/>\n`
            + artwork + '\n</svg>\n';
    }

    // RGBA8 on an opaque background; tightly packed rows, no alpha or row padding.
    function rgb565(rgba, byteOrder) {
        if (!['be', 'le'].includes(byteOrder)) throw new Error('RGB565 必须指定 be 或 le');
        if (rgba.length % 4 !== 0) throw new Error('RGBA8 长度必须是 4 的倍数');
        const result = new Uint8Array(rgba.length / 2);
        const view = new DataView(result.buffer);
        for (let i = 0; i < rgba.length; i += 4) {
            const word = ((rgba[i] >> 3) << 11) | ((rgba[i + 1] >> 2) << 5) | (rgba[i + 2] >> 3);
            view.setUint16(i / 2, word, byteOrder === 'le');
        }
        return result;
    }

    globalThis.JarvisEyeFrames = Object.freeze({sizes, renderSVG, rgb565});
})();
