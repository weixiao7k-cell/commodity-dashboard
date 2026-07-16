/**
 * 独立数据获取脚本 - 使用腾讯公开API，不依赖WorkBuddy
 * 可在GitHub Actions / 任何云服务器上运行
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// 商品列表（code = 腾讯行情代码）
const COMMODITIES = [
    { code: 'fuGC',   name: 'COMEX黄金',  exchange: 'COMEX', unit: '美元/盎司', group: '黄金', icon: '🥇', kline: true,  decimals: 2 },
    { code: 'hf_XAU', name: '伦敦金现货',  exchange: 'OTC',  unit: '美元/盎司', group: '黄金', icon: '🥇', kline: false, decimals: 2, klineSource: 'fuGC' },
    { code: 'fuSI',   name: 'COMEX白银',  exchange: 'COMEX', unit: '美元/盎司', group: '白银', icon: '🥈', kline: true,  decimals: 3 },
    { code: 'fuHG',   name: 'COMEX铜',    exchange: 'COMEX', unit: '美元/磅',  group: '铜',   icon: '🟤', kline: true,  decimals: 3 },
    { code: 'hf_CAD', name: 'LME铜',      exchange: 'LME',   unit: '美元/吨',  group: '铜',   icon: '🟤', kline: false, decimals: 2, klineSource: 'fuHG' },
    { code: 'hf_AHD', name: 'LME铝',      exchange: 'LME',   unit: '美元/吨',  group: '铝',   icon: '⬜', kline: false, decimals: 2, klineSource: 'em:113.ALM' },
    { code: 'hf_ZSD', name: 'LME锌',      exchange: 'LME',   unit: '美元/吨',  group: '锌',   icon: '⚫', kline: false, decimals: 2, klineSource: 'em:113.ZNM' },
    { code: 'hf_NID', name: 'LME镍',      exchange: 'LME',   unit: '美元/吨',  group: '镍',   icon: '⚪', kline: false, decimals: 2, klineSource: 'em:113.NIM' },
    { code: 'hf_SND', name: 'LME锡',      exchange: 'LME',   unit: '美元/吨',  group: '锡',   icon: '🔹', kline: false, decimals: 2, klineSource: 'em:113.SNM' },
    { code: 'hf_PBD', name: 'LME铅',      exchange: 'LME',   unit: '美元/吨',  group: '铅',   icon: '▪️', kline: false, decimals: 2, klineSource: 'em:113.PBM' },
    { code: 'fuPL',   name: 'NYMEX铂金',  exchange: 'NYMEX', unit: '美元/盎司', group: '铂金', icon: '💎', kline: true,  decimals: 2 },
    { code: 'hf_XPT', name: '伦敦铂金',    exchange: 'OTC',  unit: '美元/盎司', group: '铂金', icon: '💎', kline: false, decimals: 2, klineSource: 'fuPL' },
    { code: 'fuPA',   name: 'NYMEX钯金',  exchange: 'NYMEX', unit: '美元/盎司', group: '钯金', icon: '💠', kline: true,  decimals: 2 },
    { code: 'fuCL',   name: 'WTI原油',    exchange: 'NYMEX', unit: '美元/桶',  group: '原油', icon: '🛢️', kline: true,  decimals: 2 },
    { code: 'hf_OIL', name: '布伦特原油',  exchange: 'ICE',  unit: '美元/桶',  group: '原油', icon: '🛢️', kline: false, decimals: 2, klineSource: 'fuCL' },
];

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://gu.qq.com/' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// 获取实时行情 - 腾讯公开API（支持两种格式）
async function fetchQuotes() {
    const codes = COMMODITIES.map(c => c.code).join(',');
    const url = `https://qt.gtimg.cn/q=${codes}`;
    const raw = await httpGet(url);
    
    const quotes = {};
    const lines = raw.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
        const m = line.match(/v_(\w+)="([^"]+)"/);
        if (!m) continue;
        const code = m[1];
        const cfg = COMMODITIES.find(c => c.code === code);
        if (!cfg) continue;
        
        let q = null;
        if (code.startsWith('hf_')) {
            // hf_格式: 逗号分隔 "价格,涨跌额,开盘,昨收,最高,最低,时间,买,卖,?,?,?,日期,名称"
            const f = m[2].split(',');
            if (f.length >= 6) {
                const price = parseFloat(f[0]) || 0;
                const prevClose = parseFloat(f[3]) || 0;
                const change = parseFloat(f[1]) || 0;
                const changePct = prevClose > 0 ? (change / prevClose * 100) : 0;
                q = {
                    code, name: cfg.name,
                    price, prevClose,
                    open: parseFloat(f[2]) || 0,
                    high: parseFloat(f[4]) || 0,
                    low: parseFloat(f[5]) || 0,
                    change, changePercent: changePct,
                    volume: 0, amount: 0,
                    currency: 'USD',
                    updateTime: (f[12] || '') + ' ' + (f[6] || ''),
                    isDelayed: true,
                    unit: cfg.unit, exchange: cfg.exchange, group: cfg.group,
                    hasKline: cfg.kline, klineSource: cfg.klineSource || cfg.code,
                    decimals: cfg.decimals,
                };
            }
        } else {
            // fu_格式: ~分隔（和股票一样）
            const f = m[2].split('~');
            if (f.length >= 31) {
                q = {
                    code, name: cfg.name,
                    price: parseFloat(f[3]) || 0,
                    prevClose: parseFloat(f[4]) || 0,
                    open: parseFloat(f[5]) || 0,
                    high: parseFloat(f[28]) || 0,
                    low: parseFloat(f[29]) || 0,
                    change: parseFloat(f[26]) || 0,
                    changePercent: parseFloat(f[27]) || 0,
                    volume: parseInt(f[6]) || 0,
                    amount: parseFloat(f[7]) || 0,
                    currency: f[30] || 'USD',
                    updateTime: f[25] || '',
                    isDelayed: f[0] === 'delay',
                    unit: cfg.unit, exchange: cfg.exchange, group: cfg.group,
                    hasKline: cfg.kline, klineSource: cfg.klineSource || cfg.code,
                    decimals: cfg.decimals,
                };
            }
        }
        
        if (q) {
            quotes[code] = q;
            console.log(`  ✓ ${code} ${cfg.name}: ${q.price} (${q.changePercent.toFixed(2)}%)`);
        }
    }
    
    quotes._timestamp = new Date().toISOString();
    return quotes;
}

// 获取K线数据 - 腾讯公开API
async function fetchKline(code, period) {
    // period: day, week, month
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},${period},,,200,qfq`;
    const raw = await httpGet(url);
    const json = JSON.parse(raw);
    
    if (!json.data || !json.data[code] || !json.data[code][period]) return [];
    
    const klineData = json.data[code][period].map(d => ({
        date: d[0],
        open: parseFloat(d[1]) || 0,
        close: parseFloat(d[2]) || 0,
        high: parseFloat(d[3]) || 0,
        low: parseFloat(d[4]) || 0,
        volume: parseInt(d[5]) || 0,
        amount: parseFloat(d[6]) || 0,
    })).filter(d => d.close > 0);
    
    return klineData;
}

// 获取K线数据 - 东方财富API（用于沪市主连合约）
async function fetchKlineEastmoney(secid, period) {
    const kltMap = { day: 101, week: 102, month: 103 };
    const klt = kltMap[period] || 101;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=${klt}&fqt=0&end=20500101&lmt=200`;
    
    try {
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://quote.eastmoney.com/',
            },
        });
        const json = await resp.json();
        if (!json.data || !json.data.klines) return [];
        
        return json.data.klines.map(line => {
            const f = line.split(',');
            return {
                date: f[0],
                open: parseFloat(f[1]) || 0,
                close: parseFloat(f[2]) || 0,
                high: parseFloat(f[3]) || 0,
                low: parseFloat(f[4]) || 0,
                volume: parseInt(f[5]) || 0,
                amount: parseFloat(f[6]) || 0,
            };
        }).filter(d => d.close > 0).reverse(); // 东方财富返回旧在前，反转为最新在前（和腾讯API一致，data.js会再reverse成旧在前显示）
    } catch(e) {
        console.warn(`  ✗ ${secid} ${period}: ${e.message}`);
        return [];
    }
}

async function main() {
    console.log('=== 获取实时行情 ===');
    const quotes = await fetchQuotes();
    console.log(`行情: ${Object.keys(quotes).length - 1}个品种, 时间: ${quotes._timestamp}`);
    
    // 读取已有的data-embed.js，保留K线数据
    const embedPath = path.join(__dirname, 'js', 'data-embed.js');
    let existingData = { groups: [], quotes: {}, kline: {}, minute: {} };
    if (fs.existsSync(embedPath)) {
        try {
            const content = fs.readFileSync(embedPath, 'utf8');
            const match = content.match(/var EMBEDDED_DATA\s*=\s*(\{[\s\S]+\});/);
            if (match) existingData = JSON.parse(match[1]);
        } catch(e) { console.warn('读取已有data-embed失败:', e.message); }
    }
    
    // 保留已有K线数据
    var kline = existingData.kline || {};
    
    // 获取LME金属的K线数据（用东方财富沪市主连）
    console.log('\n=== 获取LME金属K线（沪市主连）===');
    for (const cfg of COMMODITIES) {
        if (cfg.klineSource && cfg.klineSource.startsWith('em:')) {
            var emSecid = cfg.klineSource.substring(3);
            for (const period of ['day', 'week', 'month']) {
                try {
                    var data = await fetchKlineEastmoney(emSecid, period);
                    if (data.length > 0) {
                        kline[cfg.code + '_' + period] = data;
                        console.log(`  ✓ ${cfg.code} ${period}: ${data.length}条 (${emSecid})`);
                    }
                } catch(e) {
                    console.warn(`  ✗ ${cfg.code} ${period}: ${e.message}`);
                }
            }
        }
    }
    
    // 合并
    const embedded = {
        groups: existingData.groups || [],
        quotes: quotes,
        kline: kline,
        minute: existingData.minute || {},
    };
    
    // 写入data/quotes.json
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'quotes.json'), JSON.stringify(quotes, null, 2));
    
    // 写入data-embed.js
    let content = '/** 嵌入式数据 - 自动生成 */\n';
    content += '/* 更新时间: ' + quotes._timestamp + ' */\n';
    content += 'var EMBEDDED_DATA = ' + JSON.stringify(embedded) + ';\n';
    fs.writeFileSync(embedPath, content, 'utf8');
    console.log('\n✓ data-embed.js 更新完成');
    console.log('  快照时间: ' + quotes._timestamp);
    console.log('  K线数据集: ' + Object.keys(kline).length);
    
    return quotes._timestamp;
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
