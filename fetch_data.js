/**
 * 数据预取脚本 v3 - 纯期货品种（无ETF）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const NODE_BIN = process.execPath;
const WSD_SCRIPT = 'C:\\Users\\Weixiao7k\\AppData\\Local\\Programs\\WorkBuddy\\resources\\app.asar.unpacked\\resources\\builtin-skills\\westock-data\\scripts\\index.js';

const COMMODITIES = [
    { code: 'fuGC',   name: 'COMEX黄金',  exchange: 'COMEX', unit: '美元/盎司', group: '黄金', icon: '🥇', kline: true,  decimals: 2 },
    { code: 'hf_XAU', name: '伦敦金现货',  exchange: 'OTC',  unit: '美元/盎司', group: '黄金', icon: '🥇', kline: false, decimals: 2, klineSource: 'fuGC' },
    { code: 'fuSI',   name: 'COMEX白银',  exchange: 'COMEX', unit: '美元/盎司', group: '白银', icon: '🥈', kline: true,  decimals: 3 },
    { code: 'fuHG',   name: 'COMEX铜',    exchange: 'COMEX', unit: '美元/磅',  group: '铜',   icon: '🟤', kline: true,  decimals: 3 },
    { code: 'hf_CAD', name: 'LME铜',      exchange: 'LME',   unit: '美元/吨',  group: '铜',   icon: '🟤', kline: false, decimals: 2, klineSource: 'fuHG' },
    { code: 'hf_AHD', name: 'LME铝',      exchange: 'LME',   unit: '美元/吨',  group: '铝',   icon: '⬜', kline: false, decimals: 2 },
    { code: 'hf_ZSD', name: 'LME锌',      exchange: 'LME',   unit: '美元/吨',  group: '锌',   icon: '⚫', kline: false, decimals: 2 },
    { code: 'hf_NID', name: 'LME镍',      exchange: 'LME',   unit: '美元/吨',  group: '镍',   icon: '⚪', kline: false, decimals: 2 },
    { code: 'hf_SND', name: 'LME锡',      exchange: 'LME',   unit: '美元/吨',  group: '锡',   icon: '🔹', kline: false, decimals: 2 },
    { code: 'hf_PBD', name: 'LME铅',      exchange: 'LME',   unit: '美元/吨',  group: '铅',   icon: '▪️', kline: false, decimals: 2 },
    { code: 'fuPL',   name: 'NYMEX铂金',  exchange: 'NYMEX', unit: '美元/盎司', group: '铂金', icon: '💎', kline: true,  decimals: 2 },
    { code: 'hf_XPT', name: '伦敦铂金',    exchange: 'OTC',  unit: '美元/盎司', group: '铂金', icon: '💎', kline: false, decimals: 2, klineSource: 'fuPL' },
    { code: 'fuPA',   name: 'NYMEX钯金',  exchange: 'NYMEX', unit: '美元/盎司', group: '钯金', icon: '💠', kline: true,  decimals: 2 },
    { code: 'fuCL',   name: 'WTI原油',    exchange: 'NYMEX', unit: '美元/桶',  group: '原油', icon: '🛢️', kline: true,  decimals: 2 },
    { code: 'hf_OIL', name: '布伦特原油',  exchange: 'ICE',  unit: '美元/桶',  group: '原油', icon: '🛢️', kline: false, decimals: 2, klineSource: 'fuCL' },
];

const PERIODS = ['day', 'week', 'month'];
const DATA_DIR = path.join(__dirname, 'data');

function callWSD(args) {
    try { return execSync(`"${NODE_BIN}" "${WSD_SCRIPT}" ${args}`, { encoding: 'utf8', timeout: 30000 }); }
    catch (e) { return null; }
}
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function main() {
    ensureDir(DATA_DIR);
    ensureDir(path.join(DATA_DIR, 'kline'));
    ensureDir(path.join(DATA_DIR, 'minute'));

    // 1. 分组
    const gm = {};
    for (const c of COMMODITIES) {
        if (!gm[c.group]) gm[c.group] = { name: c.group, icon: c.icon, items: [] };
        gm[c.group].items.push({ code: c.code, name: c.name, exchange: c.exchange, unit: c.unit, kline: c.kline, klineSource: c.klineSource || null, region: 'INTL', decimals: c.decimals });
    }
    const groups = Object.values(gm);
    fs.writeFileSync(path.join(DATA_DIR, 'groups.json'), JSON.stringify(groups, null, 2));
    console.log(`✓ 分组: ${groups.length}组, ${COMMODITIES.length}个商品`);

    // 2. 行情
    console.log('\n获取行情...');
    const codes = COMMODITIES.map(c => c.code).join(',');
    const out = callWSD(`quote ${codes} --raw`);
    const quotes = {};
    if (out) {
        const arr = JSON.parse(out);
        for (const q of (Array.isArray(arr) ? arr : [arr])) {
            const cfg = COMMODITIES.find(c => c.code === q.code);
            if (cfg) {
                quotes[q.code] = {
                    code: q.code, name: cfg.name,
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
                    unit: cfg.unit, exchange: cfg.exchange, group: cfg.group,
                    hasKline: cfg.kline, klineSource: cfg.klineSource || cfg.code,
                    decimals: cfg.decimals,
                };
                console.log(`  ✓ ${q.code} ${cfg.name}: ${quotes[q.code].price} (${quotes[q.code].changePercent}%)`);
            }
        }
    }
    quotes._timestamp = new Date().toISOString();
    fs.writeFileSync(path.join(DATA_DIR, 'quotes.json'), JSON.stringify(quotes, null, 2));

    // 3. K线 (期货limit=200)
    console.log('\n获取K线...');
    for (const cfg of COMMODITIES.filter(c => c.kline)) {
        for (const p of PERIODS) {
            const o = callWSD(`kline ${cfg.code} --period ${p} --limit 200 --raw`);
            if (o) {
                const arr = JSON.parse(o);
                const data = (Array.isArray(arr) ? arr : []).map(d => ({
                    date: d.date, open: parseFloat(d.open) || 0, close: parseFloat(d.last) || 0,
                    high: parseFloat(d.high) || 0, low: parseFloat(d.low) || 0,
                    volume: parseInt(d.volume) || 0, amount: parseFloat(d.amount) || 0,
                    openInterest: parseInt(d.openInterest) || 0,
                })).filter(d => d.close > 0);
                fs.writeFileSync(path.join(DATA_DIR, 'kline', `${cfg.code}_${p}.json`), JSON.stringify(data));
                console.log(`  ✓ ${cfg.code} ${p}: ${data.length}条`);
            }
        }
    }

    // 4. 分时
    console.log('\n获取分时...');
    for (const cfg of COMMODITIES.filter(c => c.kline)) {
        const o = callWSD(`minute ${cfg.code} --raw`);
        if (o) {
            const arr = JSON.parse(o);
            const data = (Array.isArray(arr) ? arr : []).map(d => ({ time: d.time || '', price: parseFloat(d.price) || 0 }));
            fs.writeFileSync(path.join(DATA_DIR, 'minute', `${cfg.code}.json`), JSON.stringify(data));
            console.log(`  ✓ ${cfg.code} 分时: ${data.length}条`);
        }
    }

    console.log(`\n完成! 快照: ${quotes._timestamp}`);
}

main().catch(console.error);
