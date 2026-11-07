/* Jarvis eye artwork. Shared by the local preview and offline frame exporter. */
(() => {
    'use strict';
    const modes = { daily: { name: '日常', detail: '圆豆 · 弹跳招呼', color: '#74edff', accent: '#ffcb78', base: 'bean', listen: 'iris', talk: 'bean', speed: 1 }, work: { name: '工作', detail: '六角 · 代码飞跃', color: '#9cfff1', accent: '#aeb4ff', base: 'hex', listen: 'hexiris', talk: 'bracket', speed: 1.15 }, companion: { name: '陪伴', detail: '星眼 · 漫画动感', color: '#ffd988', accent: '#ff86c8', base: 'star', listen: 'stariris', talk: 'comic', speed: 1.2 }, english: { name: '英语', detail: '竖豆 · 对话泡泡', color: '#c5b4ff', accent: '#86e9db', base: 'vertical', listen: 'verticaliris', talk: 'doublebean', speed: 1.05 } };
    const defs = {
        idle: { name: '待机', en: 'HELLO', group: 0, left: 'base', right: 'base', motion: 'bounce', dec: 'hello', label: '待机', caption: '', title: '随时准备接住你的话', desc: '圆豆招呼、六角代码、漫画星眼或竖豆气泡，四种模式从待机就各不相同。', note: '实体动作建议：偶尔轻点头，不把画面弹跳变成机械蹦跳。' },
        connecting: { name: '连接', en: 'CONNECTING', group: 0, left: 'brokenring', right: 'brokenring', motion: 'orbit', dec: 'link', label: '连接中', caption: '正在连接，马上就好。', title: '两枚旋转的连接环', desc: '断开的眼环相向旋转，连线的小光点来回传递；就绪前不会显示正在听。', note: '实体动作建议：保持稳定，由眼睛交代连接过程。' },
        listening: { name: '倾听', en: 'LISTENING', group: 0, left: 'listen', right: 'listen', motion: 'attend', dec: 'receive', label: '正在听', caption: '你说，我在听。', english: 'I’m listening.', title: '眼睛睁圆，注意力到位', desc: '瞳心聚焦，外侧接收弧一圈圈展开；各模式保留自己的圆、六角、星形或竖豆轮廓。', note: '实体动作建议：轻微前倾，不把听到误演成已经赞同。' },
        thinking: { name: '思考', en: 'THINKING', group: 0, left: 'bean', right: 'ring', motion: 'ponder', dec: 'thought', label: '思考中', caption: '', title: '一边琢磨，一边冒出想法', desc: '一只豆眼向上看，一只圆环眼转动；三个思考泡泡逐个冒出来。', note: '实体动作建议：可轻抬头一次；屏幕旋转不对应整机旋转。' },
        searching: { name: '搜索', en: 'SEARCHING', group: 0, left: 'scanner', right: 'scanner', motion: 'scan', dec: 'scan', label: '查找中', caption: '让我找找相关的信息。', title: '双眼变成探索窗口', desc: '方框扫描眼和十字光点左右巡查，光带扫过眼区；视觉上与思考环明确不同。', note: '实体动作建议：一次小幅左右转动，搜索结束就收回。' },
        speaking: { name: '说话', en: 'SPEAKING', group: 0, left: 'talk', right: 'talk', motion: 'talk', dec: 'sound', label: '说话', caption: '可以，我们一起把它搞定。', english: 'Sure. Let’s work it out together.', title: '每句话都有自己的弹性', desc: '双眼交替伸展，声音弧线在两侧呼应；模式分别使用豆眼、括号眼、漫画眼和双瓣眼。', note: '这里是模拟节奏；正式接入只随实际音频播放，不逐字驱动电机。' },
        happy: { name: '开心', en: 'HAPPY', group: 1, left: 'smile', right: 'smile', motion: 'hop', dec: 'spark', caption: '这个办法奏效了！', english: 'That worked!', title: '笑眼弯起来，小星星也来了', desc: '明显的上拱笑弧，轻快抬起再落下；三颗亮星沿着上方展开。', note: '实体动作建议：可轻点头一次。' },
        excited: { name: '兴奋', en: 'EXCITED', group: 1, left: 'star', right: 'star', motion: 'excited', dec: 'burst', caption: '太棒了！这一次真的过了！', english: 'Yes! We did it!', title: '双眼亮成星，全屏一起庆祝', desc: '星形眼睛弹起，星轨、彩带与放射光铺开整个屏幕，3.6 秒后收回；点击重播再次查看。', note: '满屏的是画面演出，机械仍只执行安全的有限动作。' },
        laughing: { name: '大笑', en: 'LAUGHING', group: 1, left: 'chevron', right: 'chevron', motion: 'laugh', dec: 'laugh', caption: '哈哈，这个转折我没想到！', english: 'Ha! I didn’t see that coming!', title: '笑到眼睛变成折线', desc: '两只挤笑眼上下错拍，笑声波和 HA 小字向外弹开，不靠普通椭圆缩小代替大笑。', note: '实体动作建议：可轻点头，避免连续摆头。' },
        love: { name: '喜欢', en: 'DELIGHTED', group: 1, left: 'heart', right: 'heart', motion: 'heart', dec: 'hearts', caption: '这个主意，我很喜欢。', english: 'I love that idea.', title: '看到喜欢的事，眼睛变成心形', desc: '完整心形双眼有一次明显心跳，几颗小爱心绕着眼区飞起，表达对内容的欣赏。', note: '实体动作建议：一次微微抬头，不索取用户回应。' },
        encouraging: { name: '鼓励', en: 'ENCOURAGING', group: 1, left: 'wink', right: 'star', motion: 'cheer', dec: 'up', caption: '找到线索了，继续冲！', english: 'You’ve got this!', title: '眨一下眼，给你一颗星', desc: '左眼俏皮眨起，右眼亮成星，向上的箭头和亮点表达支持；语境受挫时不调侃。', note: '实体动作建议：一次有精神的小点头。' },
        curious: { name: '好奇', en: 'CURIOUS', group: 1, left: 'iris', right: 'iris', motion: 'curious', dec: 'curious', caption: '咦，然后发生了什么？', english: 'Oh? What happened next?', title: '一大一小，想知道更多', desc: '一只圆眼放大、一只缩小，瞳心探向一侧；探索气泡和问号跟着冒出来。', note: '实体动作建议：一次小幅偏航；没有侧倾关节。' },
        puzzled: { name: '疑惑', en: 'PUZZLED', group: 1, left: 'diamond', right: 'iris', motion: 'puzzle', dec: 'questions', label: '需要澄清', caption: '你指的是哪一部分？', english: 'Which part do you mean?', title: '一边打结，一边认真确认', desc: '菱形眼与圆瞳明显不对称，两个大小问号错位浮动，表示需要你补充。', note: '实体动作建议：小幅转向再回中，不连续摇头否定。' },
        surprised: { name: '惊讶', en: 'SURPRISED', group: 1, left: 'wide', right: 'wide', motion: 'surprise', dec: 'impact', caption: '竟然还有这个转折！', english: 'Oh, that’s unexpected!', title: '一下睁大，周围都亮了', desc: '高而圆的空心眼带小瞳心，先放大后定住；感叹号与漫画放射线一起出现。', note: '实体动作建议：轻抬头，不甩头。' },
        empathetic: { name: '共情／难过', en: 'EMPATHETIC', group: 1, left: 'droop', right: 'droop', motion: 'sigh', dec: 'tear', caption: '这次确实挺难，我们一起想想。', english: 'That sounds hard. I’m here.', title: '眼神软下来，陪你接住难处', desc: '眼形变成下垂泪滴，外侧一颗小水滴缓慢滑落；不同于困倦闭眼，也不表演索取安慰。', note: '实体动作建议：微微低头；不因用户沉默而哭泣。' },
        teasing: { name: '吐槽', en: 'TEASING', group: 1, left: 'half', right: 'wink', motion: 'sideeye', dec: 'squiggle', caption: '这操作，倒是挺有创意。', english: 'Well, that was creative.', title: '半月侧目，眨一下就收回来', desc: '半月眼和单侧眨眼搭配一个小波浪，像朋友之间轻轻挑眉；不用于用户受挫时。', note: '实体动作建议：偶尔轻摇头一次。' },
        proud: { name: '得意', en: 'PROUD', group: 1, left: 'diamond', right: 'diamond', motion: 'proud', dec: 'medal', caption: '漂亮，这题拿下了。', english: 'Nice. You nailed it.', title: '钻石眼神，有一点小骄傲', desc: '两只菱形眼向上扬起，勋章与两道胜利弧闪亮登场；成功事实确认后再用。', note: '实体动作建议：一次抬头再回中。' },
        determined: { name: '认真冲刺', en: 'DETERMINED', group: 1, left: 'flame', right: 'flame', motion: 'charge', dec: 'target', caption: '找到方向了，继续！', english: 'Let’s do this!', title: '眼里有火，方向也明确了', desc: '火焰形双眼向上伸展，目标箭头快速划过；这是解题斗志，不是向用户发怒。', note: '实体动作建议：轻点头，身体不向前猛冲。' },
        sleepy: { name: '困倦', en: 'SLEEPY', group: 2, left: 'closed', right: 'closed', motion: 'sleep', dec: 'zzz', label: '待机', caption: '', title: '眨着眨着，眼睛成了两道弯月', desc: '闭合眼弧带小睫线，Z 字轻轻浮起；仍然待机可用，不代表关机。', note: '实体动作建议：静止，不让电机重复点头。' },
        waiting: { name: '安静等待', en: 'WAITING', group: 2, left: 'bead', right: 'bead', motion: 'breathe', dec: 'dots', label: '等你继续', caption: '慢慢想，我在。', title: '留两颗柔和的眼睛，给你思考空间', desc: '小圆珠眼与缓慢三点保留生命感，没有倒计时或催促；与勿扰月牙不同。', note: '“等一下，我想想”的安静语义保留，不主动开口。' },
        dnd: { name: '勿扰', en: 'DO NOT DISTURB', group: 2, left: 'crescent', right: 'crescent', motion: 'breathe', dec: 'moon', label: '勿扰', caption: '', title: '小月牙值班，你随时可以来聊', desc: '月牙双眼配一圈静夜轨道。勿扰只禁止主动搭话，主动交流时照常回应。', note: '勿扰是独立属性；选择其他眼神不会自动关闭它。' },
        offline: { name: '离线', en: 'OFFLINE', group: 2, left: 'split', right: 'split', motion: 'reconnect', dec: 'offline', label: '离线', caption: '网络断开，正在等待恢复。', title: '缺口明确，状态也说清楚', desc: '分段圆环眼保留连接缺口，断开的信号图形说明问题；不靠悲伤代替错误提示。', note: '这里只展示断网设计，没有实际网络恢复逻辑。' },
        fault: { name: '关节故障', en: 'MOTION FAULT', group: 2, left: 'cross', right: 'hex', motion: 'breathe', dec: 'wrench', label: '动作暂停', caption: '关节暂时不可用，还可以聊天。', title: '一项能力暂停，另一只眼仍有精神', desc: '左眼使用交叉机械标记，右眼保持六角眼与轻呼吸，明确表达部分功能仍可用。', note: '只是可检测故障提示设计，不证明所有堵转可被识别。' },
        off: { name: '黑屏', en: 'SCREEN OFF', group: 2, left: 'none', right: 'none', motion: 'none', dec: 'none', caption: '', title: '未启用或已经关机', desc: '眼睛、字幕、符号与满屏粒子全部隐藏。', note: '这里只画黑屏，不控制系统关机或实际背光。' }
    };
    const paths = {
        bean: 'M-52-70 C-4-108 64-72 66-4 C71 63 29 94-22 80 C-76 65-84-30-52-70Z',
        vertical: 'M-24-92 C18-108 49-60 47 2 C45 68 19 100-16 88 C-56 74-58-58-24-92Z',
        round: 'M75 0A75 75 0 1 1-75 0A75 75 0 1 1 75 0Z',
        iris: 'M75 0A75 75 0 1 1-75 0A75 75 0 1 1 75 0Z',
        hex: 'M-42-76L42-76Q50-76 56-65L86-10Q92 0 86 10L56 65Q50 76 42 76L-42 76Q-50 76-56 65L-86 10Q-92 0-86-10L-56-65Q-50-76-42-76Z',
        hexiris: 'M-42-76L42-76L87 0L42 76L-42 76L-87 0Z',
        heart: 'M0 76C-19 58-85 14-85-33C-85-80-27-98 0-51C27-98 85-80 85-33C85 14 19 58 0 76Z',
        diamond: 'M0-92Q9-92 15-80L82-10Q90 0 82 10L15 80Q0 99-15 80L-82 10Q-90 0-82-10L-15-80Q-9-92 0-92Z',
        smile: 'M-89 27C-58-62 58-62 89 27C64 8 47-1 0-4C-47-1-64 8-89 27Z',
        wink: 'M-87 16Q0-44 87 16Q0-9-87 16Z',
        chevron: 'M-78 32L-18-28Q0-46 18-28L78 32L52 57L0 6L-52 57Z',
        droop: 'M-76-35Q-15-74 48-24Q88 10 60 58Q28 94-10 57Q-37 32-76-35Z',
        half: 'M-78-15L78-15Q62 78 0 75Q-62 78-78-15Z',
        bead: 'M48 0A48 48 0 1 1-48 0A48 48 0 1 1 48 0Z',
        crescent: 'M45-77A87 87 0 1 0 45 77Q-38 66-42 0Q-38-66 45-77Z',
        flame: 'M-43 73Q-99 34-48-36Q-52 4-18 8Q-36-45 18-99Q6-42 49-5Q91 48 43 75Q9 29 3 11Q-15 48-43 73Z',
        bracket: 'M-40-82L-82-55L-82 55L-40 82L-24 56L-51 39L-51-39L-24-56Z M40-82L82-55L82 55L40 82L24 56L51 39L51-39L24-56Z',
        comic: 'M-77-49Q-19-103 53-57L83-22L57 51Q2 91-60 48L-86 6Z',
        doublebean: 'M-58-79C-18-86-5-46-5 0C-5 52-18 90-53 80C-84 71-88-61-58-79Z M19-70C53-93 85-36 76 21C73 69 40 90 19 54C-4 17-6-52 19-70Z',
        scanner: 'M-80-63L-54-86L57-86L86-56L86 57L57 86L-57 86L-86 57L-86-57Z M-63-50L-63 50L-47 63L47 63L63 47L63-47L47-63L-47-63Z',
        ring: 'M82 0A82 82 0 1 1-82 0A82 82 0 1 1 82 0Z M59 0A59 59 0 1 0-59 0A59 59 0 1 0 59 0Z',
        wide: 'M62 0A62 93 0 1 1-62 0A62 93 0 1 1 62 0Z M43 0A43 69 0 1 0-43 0A43 69 0 1 0 43 0Z',
        brokenring: 'M-73-23A77 77 0 0 1 60-49L43-34A55 55 0 0 0-52-16Z M73 23A77 77 0 0 1-60 49L-43 34A55 55 0 0 0 52 16Z',
        split: 'M-73-37A82 82 0 0 1 73-37L53-26A60 60 0 0 0-53-26Z M73 37A82 82 0 0 1-73 37L-53 26A60 60 0 0 0 53 26Z',
        closed: 'M-84-7Q0 55 84-7L78 12Q0 74-78 12Z M-58 24L-66 44L-77 38L-66 17Z M58 24L66 44L77 38L66 17Z',
        cross: 'M-61-80L0-19L61-80L80-61L19 0L80 61L61 80L0 19L-61 80L-80 61L-19 0L-80-61Z', none: ''
    };
    function starPath(r = 90, inner = 42, n = 5) { let a = []; for (let i = 0; i < n * 2; i++) {
        const th = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? inner : r;
        a.push(`${i ? 'L' : 'M'}${(Math.cos(th) * q).toFixed(2)} ${(Math.sin(th) * q).toFixed(2)}`);
    } return a.join('') + 'Z'; }
    paths.star = starPath();
    paths.stariris = paths.star;
    paths.verticaliris = paths.vertical;
    const stroke = (d, c, w = 6, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
    const text = (s, x, y, size, c, rot = 0) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size}" font-weight="650" fill="${c}" transform="rotate(${rot} ${x} ${y})">${s}</text>`;
    const sparkle = (x, y, size, c, rot = 0) => `<path d="${starPath(size, size * .38, 4)}" fill="${c}" transform="translate(${x} ${y}) rotate(${rot})"/>`;
    function resolvedShape(s, m) { return s === 'base' ? m.base : s === 'listen' ? m.listen : s === 'talk' ? m.talk : s; }
    function geometry(id, mid) { const d = defs[id], m = modes[mid]; return [resolvedShape(d.left, m), resolvedShape(d.right, m)]; }
    function modeMark(mid, c, a, t, mini = false) {
        if (mid === 'work')
            return stroke('M85 228L64 249L85 270 M635 228L656 249L635 270', a, 7) + text('&lt;/&gt;', 360, 96, 25, a) + `<rect x="541" y="390" width="21" height="6" rx="3" fill="${a}" opacity="${mini ? 1 : .55 + .45 * Math.sin(t * 4) ** 2}"/>`;
        if (mid === 'companion')
            return sparkle(96, 148, 18, a, t * 15) + sparkle(629, 361, 15, a, -t * 13) + stroke('M112 391Q153 416 185 397 M555 136Q588 112 620 130', a, 5);
        if (mid === 'english')
            return `<g fill="none" stroke="${a}" stroke-width="5"><path d="M76 124h84q15 0 15 15v35q0 15-15 15h-45l-20 19v-19H76q-15 0-15-15v-35q0-15 15-15Z"/></g>` + text('Aa', 118, 168, 26, a) + text('hi!', 607, 388, 24, a, -8);
        return stroke('M87 240Q60 259 87 278 M75 221Q36 260 75 299', a, 5) + sparkle(623, 144, 13, a, t * 9);
    }
    function eye(shape, m, side, t, def, still) {
        const c = m.color, a = m.accent;
        let s = `<path data-eye-shape="${shape}" d="${paths[shape] || paths.bean}" fill="${c}" fill-rule="evenodd"/>`;
        if (shape.includes('iris') || shape === 'iris') {
            const px = still ? 5 : Math.sin(t * .9) * 9;
            const py = still ? -4 : Math.cos(t * 1.1) * 7;
            s += `<ellipse cx="${px}" cy="${py}" rx="${shape === 'verticaliris' ? 18 : 25}" ry="30" fill="#07131d"/><circle cx="${px + 9}" cy="${py - 13}" r="8" fill="#eaffff"/>`;
        }
        else if (shape === 'wide')
            s += `<circle cx="0" cy="10" r="12" fill="${a}"/>`;
        else if (shape === 'scanner') {
            const sy = still ? 0 : Math.sin(t * 2.5) * 41;
            s += stroke(`M-45 ${sy}H45 M0 ${sy - 17}V${sy + 17}`, a, 6);
        }
        else if (shape === 'hex' || shape === 'bracket')
            s += stroke('M-15-17L0 0L-15 17 M12 22H33', shape === 'hex' ? '#0b3540' : a, 6);
        else if (shape === 'star' || shape === 'heart' || shape === 'diamond' || shape === 'flame' || shape === 'comic')
            s += sparkle(-21, -30, 10, '#fff9e7');
        else if (!['none', 'smile', 'wink', 'closed', 'chevron', 'ring', 'brokenring', 'split', 'cross', 'bead', 'crescent', 'half', 'droop'].includes(shape))
            s += `<ellipse cx="-21" cy="-38" rx="11" ry="18" fill="#edffff" opacity=".6" transform="rotate(-20 -21 -38)"/>`;
        if (m === modes.work && !['none', 'scanner', 'hex', 'hexiris', 'bracket'].includes(shape))
            s += stroke('M-102-47V-74H-79 M79 74H102V47', a, 4);
        if (m === modes.companion && ['iris', 'bean', 'vertical', 'ring'].includes(shape))
            s += stroke('M-96-64L-112-82 M-106-37L-130-43', a, 5);
        if (m === modes.english && !['vertical', 'verticaliris', 'doublebean', 'none'].includes(shape))
            s += `<circle cx="${side ? -103 : 103}" cy="-63" r="7" fill="${a}"/>`;
        return s;
    }
    function decor(d, m, t, age, still, mid) {
        let s = '', c = m.accent, q = still ? 0 : Math.sin(t * 2) * 7;
        const S = (x, y, r = 13) => sparkle(x, y, r, c, still ? 0 : t * 15);
        switch (d.dec) {
            case 'hello':
                s = text('!', 570, 146, 35, c, 12) + S(160, 113, 11);
                break;
            case 'link':
                for (let i = 0; i < 3; i++)
                    s += `<circle cx="${328 + i * 32}" cy="${271 + Math.sin(t * 4 - i) * 9}" r="7" fill="${c}" opacity="${.45 + i * .22}"/>`;
                break;
            case 'receive':
                s = stroke('M102 210Q68 274 102 338 M79 188Q30 274 79 360 M618 210Q652 274 618 338 M641 188Q690 274 641 360', c, 5, `opacity="${still ? .8 : .4 + .5 * Math.sin(t * 2) ** 2}"`);
                break;
            case 'thought':
                for (let i = 0; i < 3; i++)
                    s += `<circle cx="${367 + i * 55}" cy="${151 - i * 25 + q}" r="${9 + i * 6}" fill="none" stroke="${c}" stroke-width="5"/>`;
                break;
            case 'scan':
                s = `<path d="M100 ${214 + q}L620 ${174 + q}V${210 + q}L100 ${250 + q}Z" fill="${c}" opacity=".09"/>` + stroke('M116 118V91H149 M571 91H604V118 M116 402V429H149 M571 429H604V402', c, 5);
                break;
            case 'sound':
                for (let i = 0; i < 3; i++) {
                    let h = still ? 15 + i * 10 : 14 + Math.abs(Math.sin(t * 5 + i)) * 35;
                    s += stroke(`M${80 + i * 19} ${271 - h}V${271 + h} M${640 - i * 19} ${271 - h}V${271 + h}`, c, 7);
                }
                break;
            case 'spark':
                s = S(141, 144, 19) + S(361, 94 - q, 24) + S(589, 156, 17);
                break;
            case 'burst':
                s = S(140, 122, 22) + S(365, 99, 16) + S(603, 135, 22);
                break;
            case 'laugh':
                s = text('HA', 123, 143 + q, 31, c, -14) + text('HA', 589, 146 - q, 38, c, 12) + stroke('M97 328Q130 352 161 333 M560 333Q591 352 624 328', c, 5);
                break;
            case 'hearts':
                for (let i = 0; i < 4; i++) {
                    const x = 118 + i * 162, y = 136 + (i % 2) * 28 - q;
                    s += `<path d="${paths.heart}" fill="${c}" opacity=".75" transform="translate(${x} ${y}) scale(${.14 + i * .025}) rotate(${i % 2 ? 18 : -18})"/>`;
                }
                break;
            case 'up':
                s = stroke(`M142 ${150 - q}V92L120 114 M142 92L164 114 M581 ${176 - q}V118L559 140 M581 118L603 140`, c, 7) + S(363, 114, 18);
                break;
            case 'curious':
                s = text('?', 547, 118 + q, 42, c, 15) + `<circle cx="128" cy="145" r="25" fill="none" stroke="${c}" stroke-width="6"/>` + stroke('M145 163L163 183', c, 7);
                break;
            case 'questions':
                s = text('?', 133, 142 + q, 40, c, -13) + text('?', 581, 119 - q, 54, c, 14) + text('·', 374, 109, 36, c);
                break;
            case 'impact':
                s = text('!', 365, 108, 56, c) + stroke('M122 142L99 114 M604 142L627 114 M74 296L46 309 M646 296L674 309 M322 112L311 84 M404 112L415 84', c, 7);
                break;
            case 'tear':
                s = `<path d="M0-19Q-19 8 0 17Q19 8 0-19Z" fill="${c}" opacity=".7" transform="translate(593 ${355 + q})"/>` + stroke('M149 145Q213 115 258 143 M462 143Q507 115 571 145', c, 4);
                break;
            case 'squiggle':
                s = stroke('M574 140Q594 111 614 140Q634 169 654 140', c, 6) + text('…', 125, 153, 29, c);
                break;
            case 'medal':
                s = `<path d="M336 126L328 162L351 154L360 179L372 153L393 163L384 126" fill="${c}" opacity=".7"/><circle cx="360" cy="112" r="29" fill="none" stroke="${c}" stroke-width="5"/>` + S(360, 112, 15);
                break;
            case 'target':
                s = stroke('M114 139H198L180 122 M198 139L180 157 M526 139H611L593 122 M611 139L593 157', c, 7) + S(365, 104, 16);
                break;
            case 'zzz':
                s = text('z', 523, 155 + q, 23, c, -10) + text('Z', 567, 120 + q, 35, c, 8) + text('Z', 619, 78 + q, 43, c, 12);
                break;
            case 'dots':
                for (let i = 0; i < 3; i++)
                    s += `<circle cx="${330 + i * 30}" cy="123" r="5" fill="${c}" opacity="${still ? .65 : .35 + .5 * Math.sin(t - i) ** 2}"/>`;
                break;
            case 'moon':
                s = `<path d="${paths.crescent}" fill="${c}" transform="translate(360 109) scale(.33)"/>` + S(569, 149, 10);
                break;
            case 'offline':
                s = stroke('M322 123Q360 93 398 123 M336 141Q360 124 384 141 M323 96L395 169', c, 6);
                break;
            case 'wrench':
                s = stroke('M337 91L352 108L340 121L323 106Q310 133 338 141L372 175L388 159L353 125Q362 98 337 91Z', c, 5);
                break;
        }
        return `<g data-layer="symbols">${s}</g>`;
    }
    function burst(age, H, m, still) {
        if (age < 0 || age > 3600 || still)
            return '';
        let s = '';
        const u = age / 3600, fade = Math.min(1, age / 200, (3600 - age) / 600), colors = [m.color, m.accent, '#ff87bc', '#b1a4ff', '#fff8ad'];
        for (let i = 0; i < 54; i++) {
            const a = i * 2.39996, dist = 50 + (u * (350 + i % 8 * 19)), x = 360 + Math.cos(a) * dist, y = H * .39 + Math.sin(a) * dist * .95 + u * u * 160, c = colors[i % colors.length], rot = i * 37 + u * 220;
            s += i % 3 === 0 ? sparkle(x, y, 8 + i % 5 * 3, c, rot) : `<rect x="-5" y="-12" width="${8 + i % 3 * 3}" height="${18 + i % 4 * 4}" rx="2" fill="${c}" transform="translate(${x} ${y}) rotate(${rot})"/>`;
        }
        for (let i = 0; i < 14; i++) {
            const a = i * Math.PI / 7, r = 120 + u * 500;
            s += stroke(`M${360 + Math.cos(a) * r} ${H * .39 + Math.sin(a) * r}L${360 + Math.cos(a) * (r + 60)} ${H * .39 + Math.sin(a) * (r + 60)}`, colors[i % 5], 4, `opacity=".38"`);
        }
        s += `<circle cx="360" cy="${H * .39}" r="${80 + u * 520}" fill="none" stroke="${m.accent}" stroke-width="${8 * (1 - u)}" opacity=".3"/>`;
        return `<g data-layer="full-screen" opacity="${fade}">${s}</g>`;
    }
    // Core interaction choreography is mode-specific, not a shared waveform at a different speed.
    // Each result is a local drawing offset; none of these values control physical joints.
    function coreMotion(mid, id, side, time) {
        const sec = time / 1000, sgn = side ? 1 : -1, out = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };
        if (mid === 'daily') {
            const phase = sec * (id === 'speaking' ? 5.6 : 2.3) + side * .42;
            out.y = -Math.max(0, Math.sin(phase)) * (id === 'listening' ? 4 : 12);
            out.x = Math.sin(sec * 1.3) * (id === 'listening' ? 2 : 5);
            out.rot = Math.sin(sec * 1.5) * (id === 'listening' ? 1.5 : 4);
            if (id === 'speaking') {
                out.sy = 1 + .13 * Math.sin(phase);
                out.sx = 1 - .055 * Math.sin(phase);
            }
        }
        else if (mid === 'work') {
            // A short eased move followed by a deliberate hold: four precise drawing positions.
            const interval = id === 'speaking' ? .32 : id === 'listening' ? .95 : .68, step = sec / interval, idx = Math.floor(step) % 4, f = step % 1;
            const blend = Math.min(1, f / .24), ease = blend * blend * (3 - 2 * blend);
            const track = id === 'listening' ? [[0, 0], [3, -4], [0, -6], [-3, -4]] : [[0, 0], [12, -8], [0, -16], [-12, -8]];
            const prev = track[(idx + 3) % 4], next = track[idx];
            out.x = prev[0] + (next[0] - prev[0]) * ease;
            out.y = prev[1] + (next[1] - prev[1]) * ease;
            if (id === 'speaking') {
                const beat = (sec / .32 + side * .5) % 2, hit = Math.max(0, 1 - (beat % 1) / .3);
                out.sy = 1 - .16 * hit;
                out.sx = 1 + .10 * hit;
                out.rot = sgn * (idx % 2 ? 3 : -3);
            }
        }
        else if (mid === 'companion') {
            // Anticipation squash, comic spring, then a held pose rather than a continuous sine bob.
            const period = id === 'speaking' ? .84 : id === 'listening' ? 2.1 : 1.7, u = (sec / period + (id === 'speaking' ? side * .5 : 0)) % 1;
            const amount = id === 'listening' ? .42 : 1;
            if (u < .16) {
                const squash = Math.sin(Math.PI * u / .16);
                out.y = 9 * squash * amount;
                out.sy = 1 - .22 * squash * amount;
                out.sx = 1 + .16 * squash * amount;
            }
            else if (u < .66) {
                const jump = Math.sin(Math.PI * (u - .16) / .5);
                out.y = -29 * jump * amount;
                out.sy = 1 + .14 * jump * amount;
                out.sx = 1 - .09 * jump * amount;
                out.rot = sgn * 11 * jump * amount;
            }
        }
        else if (mid === 'english') {
            // Alternating question/answer beats, with a shared pause between the two turns.
            const period = id === 'speaking' ? 2.0 : id === 'listening' ? 3.6 : 3.0, phase = (sec / period - side * .5 + 1) % 1;
            const turn = phase < .38 ? Math.sin(Math.PI * phase / .38) ** 2 : 0, amount = id === 'listening' ? .55 : 1;
            out.y = -19 * turn * amount;
            out.rot = sgn * 5 * turn * amount;
            out.sy = 1 + .12 * turn * amount;
            out.sx = 1 - .045 * turn * amount;
            out.x = -sgn * 5 * turn * amount;
        }
        return out;
    }
    function eyePose(id, mid, time, age, side, options = {}) {
        const d = defs[id];
        const m = modes[mid];
        const H = options.height || 720;
        const still = options.still || false;
        const quiet = options.quiet || false;
        const t = still ? 0 : time / 1000 * m.speed;
        const cy = H === 540 ? 209 : 294;
        const pop = options.entry !== false && !still && age < 600 ? 1 + .12 * Math.sin(Math.PI * age / 600) : 1;
        let x = side ? 493 : 227, y = cy, rot = 0, sx = 1, sy = 1, blink = 1;
        const sign = side ? 1 : -1;
        if (!still) {
            switch (d.motion) {
                case 'bounce':
                    y += Math.sin(t * 2.4 + side * .35) * 7;
                    rot = Math.sin(t * 1.4) * 4;
                    break;
                case 'orbit':
                    rot = (side ? -1 : 1) * t * 70;
                    break;
                case 'attend':
                    sx = 1 + Math.sin(t * 2) * .018;
                    sy = 1 + Math.sin(t * 2) * .025;
                    break;
                case 'ponder':
                    x += Math.sin(t * 1.3) * 10;
                    y -= 13 + Math.cos(t * 1.1) * 5;
                    if (side)
                        rot = t * 19;
                    break;
                case 'scan':
                    x += Math.sin(t * 1.8) * 20;
                    break;
                case 'talk':
                    sy = 1 + Math.sin(t * 7 + side * .9) * .12;
                    sx = 1 - Math.sin(t * 7 + side * .9) * .055;
                    y += Math.sin(t * 3) * 4;
                    break;
                case 'hop':
                    y -= Math.max(0, Math.sin(t * 3)) * 15;
                    rot = sign * Math.sin(t * 3) * 4;
                    break;
                case 'excited':
                    y += Math.sin(t * 7) * 7 * (age < 3600 ? 1 : .3);
                    rot = sign * Math.sin(t * 4) * 9 * (age < 3600 ? 1 : .25);
                    sx = sy = 1 + Math.sin(t * 5) * .07;
                    break;
                case 'laugh':
                    y += Math.sin(t * 8 + side * .3) * 12;
                    rot = sign * (9 + Math.sin(t * 4) * 4);
                    break;
                case 'heart':
                    sx = sy = 1 + Math.pow(Math.max(0, Math.sin(t * 3)), 5) * .13;
                    break;
                case 'cheer':
                    y -= Math.max(0, Math.sin(t * 2.4)) * 10;
                    if (!side)
                        rot = -9;
                    break;
                case 'curious':
                    x += Math.sin(t * 1.3) * 13;
                    rot = sign * 6;
                    y += sign * Math.sin(t * 1.8) * 6;
                    break;
                case 'puzzle':
                    rot = sign * (8 + Math.sin(t * 1.7) * 5);
                    y += sign * 8;
                    break;
                case 'surprise':
                    if (age < 1000)
                        sx = sy = 1 + .25 * Math.sin(Math.PI * age / 1000);
                    break;
                case 'sigh':
                    y += 7 + Math.sin(t) * 5;
                    rot = sign * -13;
                    break;
                case 'sideeye':
                    x += 18 + Math.sin(t) * 4;
                    rot = sign * 5;
                    break;
                case 'proud':
                    y -= 12 + Math.sin(t * 2) * 4;
                    rot = sign * -9;
                    break;
                case 'charge':
                    sy = 1 + Math.sin(t * 5) * .07;
                    y -= Math.sin(t * 3) * 6;
                    break;
                case 'sleep':
                    y += Math.sin(t * .8) * 4;
                    break;
                case 'reconnect':
                    rot = Math.sin(t) * 6;
                    break;
                default: y += Math.sin(t * 1.3) * 2;
            }
        }
        if (!still && !quiet && ['idle', 'listening', 'speaking'].includes(id)) {
            const move = coreMotion(mid, id, side, time);
            x = (side ? 493 : 227) + move.x;
            y = cy + move.y;
            rot = move.rot;
            sx = move.sx;
            sy = move.sy;
        }
        if (id === 'curious') {
            sx *= side ? 1.17 : .66;
            sy *= side ? 1.17 : .66;
            y += side ? -10 : 17;
        }
        if (id === 'puzzled') {
            sx *= side ? 1.03 : .85;
            sy *= side ? 1.03 : .85;
        }
        if (id === 'waiting') {
            x += side ? -22 : 22;
        }
        if (id === 'empathetic' && still)
            rot = sign * -13;
        if (id === 'teasing' && still)
            rot = sign * 5;
        if (!still && !quiet && ['idle', 'listening', 'speaking', 'curious'].includes(id)) {
            const b = (time + side * 50) % 4700;
            if (b < 130)
                blink = 1 - .92 * Math.sin(Math.PI * b / 130);
        }
        if (quiet && !still) {
            y = cy + (y - cy) * .2;
            rot *= .3;
        }
        return { x, y, rot, sx: sx * pop, sy: sy * blink * pop };
    }
    function faceMarkup(id, mid, time, age, options = {}) {
        const d = defs[id], m = modes[mid], mini = options.mini || false, H = options.height || 720, still = options.still || false, fx = options.effects !== false, quiet = options.quiet || false;
        if (id === 'off')
            return '';
        const t = still ? 0 : time / 1000 * m.speed, shapes = geometry(id, mid);
        let content = '', eyes = '';
        const entered = still || options.entry === false ? 1 : Math.min(1, age / 380);
        for (let side = 0; side < 2; side++) {
            const { x, y, rot, sx, sy } = options.poses?.[side] ?? eyePose(id, mid, time, age, side, options);
            const shape = shapes[side];
            const eyeContent = eye(shape, m, side, t, d, still);
            const eyeId = mini ? '' : `id="${side ? 'right' : 'left'}-eye"`;
            const transform = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`;
            eyes += `<g ${eyeId} data-shape="${shape}" transform="${transform}">${eyeContent}</g>`;
        }
        // Mode signatures remain visible while listening/speaking, not just in idle.
        const offset = H === 540 ? -42 : 0;
        if (fx && !quiet)
            content += `<g transform="translate(0 ${offset})">${modeMark(mid, m.color, m.accent, t, mini)}</g>`;
        if (!mini)
            content += `<g opacity=".1" filter="url(#softGlow)">${eyes.replace(/ id="[^"]+"/g, '')}</g>`;
        content += `<g data-layer="eyes" opacity="${.45 + .55 * entered}">${eyes}</g>`;
        if (fx)
            content += `<g transform="translate(0 ${offset})">${decor(d, m, t, age, still, mid)}</g>`;
        if (options.burst !== false && fx && id === 'excited' && !quiet && !mini)
            content = burst(options.burstAge ?? age, H, m, still) + content;
        return content;
    }
    globalThis.JarvisEyeArtwork = Object.freeze({ modes, defs, paths, geometry, coreMotion, eyePose, faceMarkup, burst });
})();
