/**
 * 从 data/ 目录的JSON文件生成 js/data-embed.js
 * K线/分时数据如果data/目录没有，则从已有的data-embed.js保留
 */
var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, 'data');
var OUT_FILE = path.join(__dirname, 'js', 'data-embed.js');

function readJSON(p) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch (e) { return null; }
}

// 读取已有的data-embed.js作为fallback
var existing = { groups: [], quotes: {}, kline: {}, minute: {} };
if (fs.existsSync(OUT_FILE)) {
    try {
        var old = fs.readFileSync(OUT_FILE, 'utf8');
        var m = old.match(/var EMBEDDED_DATA\s*=\s*(\{[\s\S]+\});/);
        if (m) existing = JSON.parse(m[1]);
    } catch(e) {}
}

var groups = readJSON(path.join(DATA_DIR, 'groups.json')) || existing.groups || [];
var quotes = readJSON(path.join(DATA_DIR, 'quotes.json')) || existing.quotes || {};
if (!quotes._timestamp) quotes._timestamp = new Date().toISOString();

// K线：优先data/kline/，没有则保留已有
var kline = {};
var klineDir = path.join(DATA_DIR, 'kline');
if (fs.existsSync(klineDir)) {
    fs.readdirSync(klineDir).forEach(function(f) {
        if (f.endsWith('.json')) kline[f.replace('.json', '')] = readJSON(path.join(klineDir, f)) || [];
    });
}
if (Object.keys(kline).length === 0) kline = existing.kline || {};

// 分时：优先data/minute/，没有则保留已有
var minute = {};
var minuteDir = path.join(DATA_DIR, 'minute');
if (fs.existsSync(minuteDir)) {
    fs.readdirSync(minuteDir).forEach(function(f) {
        if (f.endsWith('.json')) minute[f.replace('.json', '')] = readJSON(path.join(minuteDir, f)) || [];
    });
}
if (Object.keys(minute).length === 0) minute = existing.minute || {};

var embedded = { groups: groups, quotes: quotes, kline: kline, minute: minute };
var content = '/** 嵌入式数据 - 自动生成 */\n/* 更新时间: ' + quotes._timestamp + ' */\n';
content += 'var EMBEDDED_DATA = ' + JSON.stringify(embedded) + ';\n';
fs.writeFileSync(OUT_FILE, content, 'utf8');

console.log('✓ data-embed.js 生成完成');
console.log('  行情品种: ' + (Object.keys(quotes).length - 1));
console.log('  K线数据集: ' + Object.keys(kline).length);
console.log('  快照时间: ' + quotes._timestamp);
