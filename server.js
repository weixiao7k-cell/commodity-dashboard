/**
 * ============================================
 * 大宗商品监控面板 - 后端服务器
 * 对接 westock-data 获取真实行情数据
 * 每10分钟自动刷新缓存
 * ============================================
 */

const express = require('express');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = 8090;

// westock-data CLI 路径
const NODE_BIN = 'C:\\Users\\Weixiao7k\\.workbuddy\\binaries\\node\\versions\\22.22.2\\node.exe';
const WSD_SCRIPT = 'C:\\Users\\Weixiao7k\\AppData\\Local\\Programs\\WorkBuddy\\resources\\app.asar.unpacked\\resources\\builtin-skills\\westock-data\\scripts\\index.js';

// 商品配置 - 分级分类
const COMMODITY_GROUPS = [
    {
        name: '黄金',
        icon: '🥇',
        items: [
            { code: 'fuGC',   name: 'COMEX黄金',  exchange: 'COMEX',     unit: '美元/盎司', kline: true,  region: 'INTL' },
            { code: 'hf_XAU', name: '伦敦金现货', exchange: 'OTC',       unit: '美元/盎司', kline: false, klineSource: 'fuGC', region: 'INTL' },
        ]
    },
    {
        name: '白银',
        icon: '🥈',
        items: [
            { code: 'fuSI', name: 'COMEX白银', exchange: 'COMEX', unit: '美元/盎司', kline: true, region: 'INTL' },
        ]
    },
    {
        name: '铜',
        icon: '🟤',
        items: [
            { code: 'fuHG',  name: 'COMEX铜', exchange: 'COMEX', unit: '美元/磅',  kline: true,  region: 'INTL' },
            { code: 'hf_CAD', name: 'LME铜',  exchange: 'LME',   unit: '美元/吨',  kline: false, klineSource: 'fuHG', region: 'INTL' },
        ]
    },
    {
        name: '铝',
        icon: '⬜',
        items: [
            { code: 'hf_AHD', name: 'LME铝', exchange: 'LME', unit: '美元/吨', kline: false, region: 'INTL' },
        ]
    },
    {
        name: '锌',
        icon: '⚫',
        items: [
            { code: 'hf_ZSD', name: 'LME锌', exchange: 'LME', unit: '美元/吨', kline: false, region: 'INTL' },
        ]
    },
    {
        name: '镍',
        icon: '⚪',
        items: [
            { code: 'hf_NID', name: 'LME镍', exchange: 'LME', unit: '美元/吨', kline: false, region: 'INTL' },
        ]
    },
    {
        name: '锡',
        icon: '🔹',
        items: [
            { code: 'hf_SND', name: 'LME锡', exchange: 'LME', unit: '美元/吨', kline: false, region: 'INTL' },
        ]
    },
    {
        name: '铅',
        icon: '▪️',
        items: [
            { code: 'hf_PBD', name: 'LME铅', exchange: 'LME', unit: '美元/吨', kline: false, region: 'INTL' },
        ]
    },
    {
        name: '铂金',
        icon: '💎',
        items: [
            { code: 'fuPL',  name: 'NYMEX铂金', exchange: 'NYMEX', unit: '美元/盎司', kline: true,  region: 'INTL' },
            { code: 'hf_XPT', name: '伦敦铂金', exchange: 'OTC',   unit: '美元/盎司', kline: false, klineSource: 'fuPL', region: 'INTL' },
        ]
    },
    {
        name: '钯金',
        icon: '💠',
        items: [
            { code: 'fuPA', name: 'NYMEX钯金', exchange: 'NYMEX', unit: '美元/盎司', kline: true, region: 'INTL' },
        ]
    },
    {
        name: '原油',
        icon: '🛢️',
        items: [
            { code: 'fuCL',  name: 'WTI原油',   exchange: 'NYMEX', unit: '美元/桶', kline: true,  region: 'INTL' },
            { code: 'hf_OIL', name: '布伦特原油', exchange: 'ICE',  unit: '美元/桶', kline: false, klineSource: 'fuCL', region: 'INTL' },
        ]
    },
];

// 缓存
let quotesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10分钟

/**
 * 调用 westock-data CLI
 */
function callWSD(args) {
    try {
        const cmd = `"${NODE_BIN}" "${WSD_SCRIPT}" ${args}`;
        const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
        return output;
    } catch (e) {
        console.error('WSD call failed:', args, e.message);
        return null;
    }
}

/**
 * 解析 quote 输出（Markdown表格 → JSON）
 */
function parseQuoteTable(output) {
    const lines = output.trim().split('\n');
    const headers = [];
    const results = [];

    for (const line of lines) {
        if (line.startsWith('| code')) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            headers.push(...cells);
        } else if (line.startsWith('| ') && !line.includes('---')) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            const obj = {};
            for (let i = 0; i < headers.length && i < cells.length; i++) {
                obj[headers[i]] = cells[i];
            }
            results.push(obj);
        }
    }
    return results;
}

/**
 * 获取所有商品实时行情
 */
function fetchAllQuotes() {
    const allCodes = COMMODITY_GROUPS.flatMap(g => g.items.map(i => i.code));
    const codesStr = allCodes.join(',');
    const output = callWSD(`quote ${codesStr} --raw`);

    if (!output) return null;

    try {
        const raw = JSON.parse(output);
        const arr = Array.isArray(raw) ? raw : [raw];
        const quoteMap = {};

        for (const q of arr) {
            quoteMap[q.code] = {
                code: q.code,
                name: q.name,
                price: parseFloat(q.lastPrice) || 0,
                prevClose: parseFloat(q.prevClose) || 0,
                open: parseFloat(q.open) || 0,
                high: parseFloat(q.high) || 0,
                low: parseFloat(q.low) || 0,
                change: parseFloat(q.priceChange) || 0,
                changePercent: parseFloat(q.changePct) || 0,
                volume: q.volume && q.volume !== '-' ? parseInt(q.volume) : 0,
                openInterest: q.openInterest && q.openInterest !== '-' ? parseInt(q.openInterest) : 0,
                currency: q.currency || 'USD',
                updateTime: q.updateTime || '',
                isDelayed: q.isDelayed === '✓' || q.isDelayed === true,
                bidPrice: parseFloat(q.bidPrice) || 0,
                askPrice: parseFloat(q.askPrice) || 0,
            };
        }

        // 补充配置信息
        for (const group of COMMODITY_GROUPS) {
            for (const item of group.items) {
                if (quoteMap[item.code]) {
                    quoteMap[item.code].unit = item.unit;
                    quoteMap[item.code].exchange = item.exchange;
                    quoteMap[item.code].group = group.name;
                    quoteMap[item.code].hasKline = item.kline;
                    quoteMap[item.code].klineSource = item.klineSource || item.code;
                }
            }
        }

        return quoteMap;
    } catch (e) {
        console.error('Parse quote error:', e.message);
        return null;
    }
}

/**
 * 获取K线数据
 */
function fetchKline(code, period = 'day', limit = 200) {
    // 支持 fu* 和 sp* 代码的K线
    if (code.startsWith('hf_')) {
        // LME金属不支持K线，返回空
        return { error: '该品种(LME)不支持历史K线数据', data: [] };
    }

    const output = callWSD(`kline ${code} --period ${period} --limit ${limit} --raw`);
    if (!output) return { error: '获取K线失败', data: [] };

    try {
        const raw = JSON.parse(output);
        const arr = Array.isArray(raw) ? raw : [raw];
        const data = arr.map(d => ({
            date: d.date,
            time: d.time || '',
            open: parseFloat(d.open) || 0,
            close: parseFloat(d.last) || parseFloat(d.close) || 0,
            high: parseFloat(d.high) || 0,
            low: parseFloat(d.low) || 0,
            volume: parseInt(d.volume) || 0,
            amount: parseFloat(d.amount) || 0,
            openInterest: parseInt(d.openInterest) || 0,
        }));
        return { data };
    } catch (e) {
        console.error('Parse kline error:', e.message);
        return { error: '解析K线失败', data: [] };
    }
}

/**
 * 获取分时数据
 */
function fetchMinute(code) {
    if (code.startsWith('hf_')) {
        return { error: '该品种不支持分时数据', data: [] };
    }

    const output = callWSD(`minute ${code} --raw`);
    if (!output) return { error: '获取分时失败', data: [] };

    try {
        const raw = JSON.parse(output);
        const arr = Array.isArray(raw) ? raw : [raw];
        const data = arr.map(d => ({
            time: d.time || '',
            price: parseFloat(d.price) || 0,
        }));
        return { data };
    } catch (e) {
        return { error: '解析分时失败', data: [] };
    }
}

// ============================================
// API 路由
// ============================================

// 商品分组配置
app.get('/api/groups', (req, res) => {
    res.json(COMMODITY_GROUPS);
});

// 所有商品实时行情
app.get('/api/quotes', (req, res) => {
    const now = Date.now();
    if (quotesCache.data && (now - quotesCache.timestamp) < CACHE_TTL) {
        return res.json({ data: quotesCache.data, cached: true, timestamp: quotesCache.timestamp });
    }

    const data = fetchAllQuotes();
    if (data) {
        quotesCache = { data, timestamp: now };
        res.json({ data, cached: false, timestamp: now });
    } else {
        res.status(500).json({ error: '获取行情数据失败' });
    }
});

// 单个商品行情
app.get('/api/quote/:code', (req, res) => {
    const code = req.params.code;
    const output = callWSD(`quote ${code} --raw`);
    if (!output) return res.status(500).json({ error: '获取失败' });

    try {
        const raw = JSON.parse(output);
        const arr = Array.isArray(raw) ? raw : [raw];
        res.json({ data: arr[0] || null });
    } catch (e) {
        res.status(500).json({ error: '解析失败' });
    }
});

// K线数据
app.get('/api/kline/:code', (req, res) => {
    const code = req.params.code;
    const period = req.query.period || 'day';
    const limit = parseInt(req.query.limit) || 200;
    const result = fetchKline(code, period, limit);
    res.json(result);
});

// 分时数据
app.get('/api/minute/:code', (req, res) => {
    const code = req.params.code;
    const result = fetchMinute(code);
    res.json(result);
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 启动服务器
app.listen(PORT, () => {
    console.log(`大宗商品监控面板服务器已启动: http://localhost:${PORT}`);
    console.log(`数据源: 腾讯自选股 (westock-data)`);
    console.log(`缓存刷新间隔: ${CACHE_TTL / 60000} 分钟`);

    // 启动时预加载行情
    console.log('正在加载实时行情数据...');
    const data = fetchAllQuotes();
    if (data) {
        quotesCache = { data, timestamp: Date.now() };
        console.log(`已加载 ${Object.keys(data).length} 个商品行情`);
    }
});

// 每10分钟自动刷新行情缓存
setInterval(() => {
    console.log(`[${new Date().toLocaleTimeString('zh-CN')}] 自动刷新行情缓存...`);
    const data = fetchAllQuotes();
    if (data) {
        quotesCache = { data, timestamp: Date.now() };
        console.log(`刷新完成，共 ${Object.keys(data).length} 个商品`);
    }
}, CACHE_TTL);
