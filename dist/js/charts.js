/**
 * 图表模块 v3 - 极简可靠版
 * 基于测试页面验证通过的渲染方式
 */
var Charts = (function () {
    var instances = {};
    var UP = '#ef4444', DOWN = '#10b981', TXT = '#94a3b8', GRID = '#1e293b', AXIS = '#2a3548';

    function get(id) {
        var dom = document.getElementById(id);
        if (!dom) return null;
        if (instances[id]) return instances[id];
        if (dom.children.length > 0) dom.innerHTML = '';
        var c = echarts.init(dom);
        instances[id] = c;
        return c;
    }

    function dispose(id) {
        if (instances[id]) { instances[id].dispose(); delete instances[id]; }
    }

    function renderMain(domId, data, opt) {
        var chart = get(domId);
        if (!chart || !data || data.length === 0) return;
        var isMin = opt && opt.period === '1m' || (data[0] && data[0].time && !data[0].date);
        if (isMin) return renderMinute(chart, data);
        return renderKline(chart, data, opt);
    }

    function renderKline(chart, data, opt) {
        opt = opt || {};
        var showMA = opt.showMA !== false;
        var showBoll = opt.showBoll !== false;

        var dates = data.map(function(d) { return d.date; });
        var ohlc = data.map(function(d) { return [d.open, d.close, d.low, d.high]; });

        var series = [{
            name: 'K线', type: 'candlestick', data: ohlc,
            itemStyle: { color: UP, color0: DOWN, borderColor: UP, borderColor0: DOWN },
        }];

        if (showMA) {
            series.push({ name: 'MA5', type: 'line', data: Indicators.calcMA(data, 5), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#f59e0b' } });
            series.push({ name: 'MA10', type: 'line', data: Indicators.calcMA(data, 10), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#3b82f6' } });
            series.push({ name: 'MA20', type: 'line', data: Indicators.calcMA(data, 20), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#8b5cf6' } });
            series.push({ name: 'MA60', type: 'line', data: Indicators.calcMA(data, 60), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#06b6d4' } });
        }

        if (showBoll) {
            var boll = Indicators.calcBoll(data, 20, 2);
            series.push({ name: 'BOLL上', type: 'line', data: boll.upper, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#f59e0b', type: 'dashed', opacity: 0.5 } });
            series.push({ name: 'BOLL中', type: 'line', data: boll.middle, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#3b82f6', type: 'dotted', opacity: 0.5 } });
            series.push({ name: 'BOLL下', type: 'line', data: boll.lower, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#10b981', type: 'dashed', opacity: 0.5 } });
        }

        // 单grid结构 - 和MACD图表完全一致的方式
        chart.setOption({
            backgroundColor: 'transparent',
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: 'rgba(26,32,53,0.95)',
                borderColor: AXIS,
                textStyle: { color: '#e2e8f0', fontSize: 12 },
            },
            legend: { top: 2, left: 'center', textStyle: { color: TXT, fontSize: 11 }, itemWidth: 14, itemHeight: 8 },
            grid: { left: 60, right: 60, top: 30, bottom: 50 },
            xAxis: { type: 'category', data: dates, boundaryGap: false, axisLine: { lineStyle: { color: AXIS } }, axisLabel: { color: TXT, fontSize: 11 }, splitLine: { show: false } },
            yAxis: { scale: true, position: 'right', splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 11 } },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                { type: 'slider', bottom: 5, height: 20, start: 0, end: 100, borderColor: AXIS, fillerColor: 'rgba(59,130,246,0.08)' }
            ],
            series: series,
        }, true);
    }

    function renderMinute(chart, data) {
        var times = data.map(function(d) {
            var t = String(d.time);
            return t.length === 4 ? t.slice(0, 2) + ':' + t.slice(2) : t;
        });
        var prices = data.map(function(d) { return d.price; });
        var cumSum = 0;
        var avgs = prices.map(function(p, i) { cumSum += p; return cumSum / (i + 1); });

        chart.setOption({
            backgroundColor: 'transparent',
            animation: false,
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(26,32,53,0.95)', borderColor: AXIS, textStyle: { color: '#e2e8f0', fontSize: 12 } },
            legend: { top: 2, left: 'center', textStyle: { color: TXT, fontSize: 11 }, data: ['价格', '均价'] },
            grid: { left: 60, right: 60, top: 30, bottom: 50 },
            xAxis: { type: 'category', data: times, boundaryGap: false, axisLine: { lineStyle: { color: AXIS } }, axisLabel: { color: TXT, fontSize: 11 }, splitLine: { show: false } },
            yAxis: { scale: true, position: 'right', splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 11 } },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                { type: 'slider', bottom: 5, height: 18, start: 0, end: 100, borderColor: AXIS, fillerColor: 'rgba(59,130,246,0.08)' }
            ],
            series: [
                { name: '价格', type: 'line', data: prices, smooth: false, symbol: 'none', lineStyle: { width: 1.5, color: '#3b82f6' }, areaStyle: { color: 'rgba(59,130,246,0.1)' } },
                { name: '均价', type: 'line', data: avgs, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#f59e0b', type: 'dotted' } },
            ],
        }, true);
    }

    function renderMACD(domId, data) {
        var chart = get(domId);
        if (!chart || !data || data.length === 0) return;
        var m = Indicators.calcMACD(data);
        var dates = data.map(function(d) { return d.date; });
        var bars = m.macd.map(function(v) { return { value: v, itemStyle: { color: v >= 0 ? UP : DOWN } }; });

        chart.setOption({
            backgroundColor: 'transparent', animation: false,
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(26,32,53,0.95)', borderColor: AXIS, textStyle: { color: '#e2e8f0', fontSize: 12 } },
            legend: { top: 0, left: 'center', textStyle: { color: TXT, fontSize: 11 }, data: ['DIF', 'DEA', 'MACD'] },
            grid: { left: 60, right: 60, top: 20, bottom: 35 },
            xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: AXIS } }, axisLabel: { color: TXT, fontSize: 10 }, splitLine: { show: false } },
            yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 10 } },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', bottom: 2, height: 14, start: 0, end: 100, borderColor: AXIS, fillerColor: 'rgba(59,130,246,0.08)' }],
            series: [
                { name: 'DIF', type: 'line', data: m.dif, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#f59e0b' } },
                { name: 'DEA', type: 'line', data: m.dea, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#3b82f6' } },
                { name: 'MACD', type: 'bar', data: bars },
            ],
        }, true);

        var i = data.length - 1;
        var el = document.getElementById('macdValues');
        if (el && m.dif[i] !== undefined) {
            el.innerHTML = 'DIF: <span class="' + (m.dif[i] >= 0 ? 'text-up' : 'text-down') + '">' + m.dif[i].toFixed(3) + '</span> DEA: <span class="' + (m.dea[i] >= 0 ? 'text-up' : 'text-down') + '">' + m.dea[i].toFixed(3) + '</span> MACD: <span class="' + (m.macd[i] >= 0 ? 'text-up' : 'text-down') + '">' + m.macd[i].toFixed(3) + '</span>';
        }
    }

    function renderRSI(domId, data) {
        var chart = get(domId);
        if (!chart || !data || data.length === 0) return;
        var r6 = Indicators.calcRSI(data, 6);
        var r12 = Indicators.calcRSI(data, 12);
        var r24 = Indicators.calcRSI(data, 24);
        var dates = data.map(function(d) { return d.date; });

        chart.setOption({
            backgroundColor: 'transparent', animation: false,
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(26,32,53,0.95)', borderColor: AXIS, textStyle: { color: '#e2e8f0', fontSize: 12 } },
            legend: { top: 0, left: 'center', textStyle: { color: TXT, fontSize: 11 }, data: ['RSI6', 'RSI12', 'RSI24'] },
            grid: { left: 60, right: 60, top: 20, bottom: 35 },
            xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: AXIS } }, axisLabel: { color: TXT, fontSize: 10 }, splitLine: { show: false } },
            yAxis: { type: 'value', min: 0, max: 100, splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 10 } },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', bottom: 2, height: 14, start: 0, end: 100, borderColor: AXIS, fillerColor: 'rgba(59,130,246,0.08)' }],
            series: [
                { name: 'RSI6', type: 'line', data: r6, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#f59e0b' } },
                { name: 'RSI12', type: 'line', data: r12, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#3b82f6' } },
                { name: 'RSI24', type: 'line', data: r24, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#8b5cf6' } },
            ],
        }, true);

        var i = data.length - 1;
        var el = document.getElementById('rsiValues');
        if (el && r6[i]) {
            el.innerHTML = 'RSI6: <span class="' + (r6[i] >= 50 ? 'text-up' : 'text-down') + '">' + r6[i].toFixed(1) + '</span> RSI12: <span class="' + (r12[i] >= 50 ? 'text-up' : 'text-down') + '">' + r12[i].toFixed(1) + '</span> RSI24: <span class="' + (r24[i] >= 50 ? 'text-up' : 'text-down') + '">' + r24[i].toFixed(1) + '</span>';
        }
    }

    function renderUSD(domId, usd, comm, corr) {
        var chart = get(domId);
        if (!chart) return;
        var dates = usd.map(function(_, i) { return 'D-' + (usd.length - i); });
        chart.setOption({
            backgroundColor: 'transparent', animation: true,
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(26,32,53,0.95)', borderColor: AXIS, textStyle: { color: '#e2e8f0', fontSize: 12 } },
            legend: { top: 0, left: 'center', textStyle: { color: TXT, fontSize: 11 }, data: ['美元指数', '商品价格'] },
            title: { text: '相关系数: ' + corr.toFixed(2), right: 10, top: 0, textStyle: { color: corr < 0 ? DOWN : UP, fontSize: 12 } },
            grid: { left: '10%', right: '10%', top: '15%', bottom: '10%' },
            xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: AXIS } }, axisLabel: { color: TXT, fontSize: 10 }, splitLine: { show: false } },
            yAxis: [
                { type: 'value', name: '美元', nameTextStyle: { color: '#3b82f6', fontSize: 10 }, position: 'left', scale: true, splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 10 } },
                { type: 'value', name: '商品', nameTextStyle: { color: '#f59e0b', fontSize: 10 }, position: 'right', scale: true, splitLine: { show: false }, axisLabel: { color: TXT, fontSize: 10 } }
            ],
            series: [
                { name: '美元指数', type: 'line', data: usd, smooth: true, symbol: 'none', yAxisIndex: 0, lineStyle: { width: 2, color: '#3b82f6' }, areaStyle: { color: 'rgba(59,130,246,0.1)' } },
                { name: '商品价格', type: 'line', data: comm, smooth: true, symbol: 'none', yAxisIndex: 1, lineStyle: { width: 2, color: '#f59e0b' }, areaStyle: { color: 'rgba(245,158,11,0.1)' } },
            ],
        }, true);
    }

    function renderGauge(domId, score, verdict, vClass, conf) {
        var chart = get(domId);
        if (!chart) return;
        var gv = (score + 100) / 2;
        var gc = score >= 10 ? UP : score > -10 ? TXT : DOWN;
        chart.setOption({
            backgroundColor: 'transparent',
            series: [{
                type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: 100, splitNumber: 4,
                progress: { show: true, width: 18, itemStyle: { color: gc } },
                pointer: { length: '60%', width: 5, itemStyle: { color: gc } },
                axisLine: { lineStyle: { width: 18, color: [[0.25, DOWN], [0.5, TXT], [0.75, '#f59e0b'], [1, UP]] } },
                axisTick: { show: false },
                splitLine: { length: 10, lineStyle: { color: '#1a2035', width: 2 } },
                axisLabel: { color: TXT, fontSize: 10, formatter: function(v) { var l = { 0: '强烈\n看跌', 25: '偏空', 50: '震荡', 75: '偏多', 100: '强烈\n看涨' }; return l[v] || ''; }, lineHeight: 12 },
                anchor: { show: true, size: 12, itemStyle: { color: gc } },
                title: { show: false },
                detail: { valueAnimation: true, offsetCenter: [0, '30%'], fontSize: 16, fontWeight: 'bold', color: gc, formatter: function() { return verdict; } },
                data: [{ value: gv, name: verdict }],
            }],
        }, true);
    }

    function setZoomRange(range, period) {
        var c = instances['mainChart'];
        if (!c) return;
        var opt = c.getOption();
        var sd = opt.series && opt.series[0] && opt.series[0].data;
        if (!sd || sd.length === 0) return;
        var total = sd.length, sc;
        switch (range) {
            case '1m': sc = period === '1d' ? 22 : period === '1w' ? 4 : 1; break;
            case '3m': sc = period === '1d' ? 66 : period === '1w' ? 13 : 3; break;
            case '6m': sc = period === '1d' ? 132 : period === '1w' ? 26 : 6; break;
            case '1y': sc = period === '1d' ? 250 : period === '1w' ? 52 : 12; break;
            case '3y': sc = period === '1d' ? 750 : period === '1w' ? 156 : 36; break;
            case 'all': sc = total; break;
            default: return;
        }
        sc = Math.min(sc, total);
        var st = Math.max(0, ((total - sc) / total) * 100);
        c.dispatchAction({ type: 'dataZoom', start: st, end: 100 });
    }

    function resizeAll() { for (var k in instances) { if (instances[k]) instances[k].resize(); } }

    return {
        renderMainChart: renderMain,
        renderMACDChart: renderMACD,
        renderRSIChart: renderRSI,
        renderUSDChart: renderUSD,
        renderGaugeChart: renderGauge,
        resizeAll: resizeAll,
        disposeChart: dispose,
        setZoomRange: setZoomRange,
        colors: { up: UP, down: DOWN, text: TXT },
    };
})();
