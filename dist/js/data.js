/**
 * ============================================
 * 前端数据层 - 嵌入式版本
 * 数据直接打包在 data-embed.js 中，无需任何网络请求
 * 可在任何环境运行（云端、本地file://、任何服务器）
 * ============================================
 */

const CommodityData = (function () {
    'use strict';

    let groupsCache = null;
    let commodityMap = {};

    /**
     * 获取商品分组配置
     */
    function getGroups() {
        if (groupsCache) return groupsCache;
        if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.groups) {
            groupsCache = EMBEDDED_DATA.groups;
            for (const group of groupsCache) {
                for (const item of group.items) {
                    commodityMap[item.code] = { ...item, group: group.name, groupIcon: group.icon };
                }
            }
        }
        return groupsCache || [];
    }

    /**
     * 获取所有商品实时行情
     */
    function getAllQuotes() {
        if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.quotes) {
            return EMBEDDED_DATA.quotes;
        }
        return {};
    }

    /**
     * 获取K线数据 (反转排序: 旧→新，最新在右侧)
     */
    function getKline(code, period) {
        const key = `${code}_${period}`;
        if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.kline && EMBEDDED_DATA.kline[key]) {
            // API返回的是最新在前，反转为旧在前(左)→新在后(右)，同花顺风格
            return EMBEDDED_DATA.kline[key].slice().reverse();
        }
        return [];
    }

    /**
     * 获取分时数据
     */
    function getMinute(code) {
        if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA.minute && EMBEDDED_DATA.minute[code]) {
            return EMBEDDED_DATA.minute[code];
        }
        return [];
    }

    /**
     * 从月K数据聚合生成季K/年K
     */
    function aggregateKline(monthlyData, monthsPerBar) {
        if (!monthlyData || monthlyData.length === 0) return [];
        const result = [];
        for (let i = 0; i < monthlyData.length; i += monthsPerBar) {
            const chunk = monthlyData.slice(i, i + monthsPerBar);
            if (chunk.length === 0) continue;
            result.push({
                date: chunk[0].date,
                open: chunk[0].open,
                close: chunk[chunk.length - 1].close,
                high: Math.max(...chunk.map(d => d.high)),
                low: Math.min(...chunk.map(d => d.low)),
                volume: chunk.reduce((sum, d) => sum + (d.volume || 0), 0),
                amount: chunk.reduce((sum, d) => sum + (d.amount || 0), 0),
                openInterest: chunk[chunk.length - 1].openInterest || 0,
            });
        }
        return result;
    }

    /**
     * 根据周期获取K线或分时数据
     */
    function getKlineByPeriod(code, period) {
        const config = commodityMap[code];

        if (period === '1m') {
            if (config && config.kline === false) return [];
            return getMinute(code);
        }

        let klineCode = code;
        if (config && config.kline === false && config.klineSource) {
            klineCode = config.klineSource;
        }

        const periodMap = {
            '1d': 'day', '1w': 'week', '1M': 'month', '1q': 'season', '1y': 'year',
        };
        const apiPeriod = periodMap[period] || 'day';

        if (apiPeriod === 'season') {
            // 优先使用直接获取的季K数据，没有则从月K聚合
            const direct = getKline(klineCode, 'season');
            return direct.length > 0 ? direct : aggregateKline(getKline(klineCode, 'month'), 3);
        }
        if (apiPeriod === 'year') {
            const direct = getKline(klineCode, 'year');
            return direct.length > 0 ? direct : aggregateKline(getKline(klineCode, 'month'), 12);
        }

        return getKline(klineCode, apiPeriod);
    }

    function getCommodityConfig(code) {
        return commodityMap[code] || null;
    }

    function getAllCodes() {
        return Object.keys(commodityMap);
    }

    function formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '--';
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    function getDecimals(code) {
        const config = commodityMap[code];
        if (config && config.decimals !== undefined) return config.decimals;
        if (code === 'fuHG') return 3;
        return 2;
    }

    function getSnapshotTime() {
        const quotes = getAllQuotes();
        return quotes._timestamp || null;
    }

    return {
        getGroups, getAllQuotes, getKline, getMinute, getKlineByPeriod,
        getCommodityConfig, getAllCodes, formatNumber, getDecimals, getSnapshotTime,
    };
})();
