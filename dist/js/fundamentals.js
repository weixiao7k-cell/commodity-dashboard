/**
 * ============================================
 * 基本面分析数据模块
 * 库存、产量、进出口、美元指数相关性
 * 使用真实合约代码 (fuGC/hf_CAD 等)
 * ============================================
 */

const Fundamentals = (function () {
    'use strict';

    // 各商品基本面数据配置
    const fundamentalConfig = {
        fuGC: {
            inventory: { exchange: 'COMEX', current: 54785231, unit: '盎司', trend: -2.3, trendLabel: '减少' },
            production: { current: 3644, unit: '吨', yoyChange: 1.2, region: '全球' },
            trade: { importVal: 689, exportVal: 312, unit: '亿美元', netImport: 377 },
            usdCorrelation: -0.78,
        },
        hf_XAU: {
            inventory: { exchange: 'LBMA', current: 8520000, unit: '盎司', trend: -1.8, trendLabel: '减少' },
            production: { current: 3644, unit: '吨', yoyChange: 1.2, region: '全球' },
            trade: { importVal: 689, exportVal: 312, unit: '亿美元', netImport: 377 },
            usdCorrelation: -0.80,
        },
        fuSI: {
            inventory: { exchange: 'COMEX', current: 285641320, unit: '盎司', trend: 1.8, trendLabel: '增加' },
            production: { current: 26100, unit: '吨', yoyChange: -1.5, region: '全球' },
            trade: { importVal: 186, exportVal: 98, unit: '亿美元', netImport: 88 },
            usdCorrelation: -0.72,
        },
        fuHG: {
            inventory: { exchange: 'COMEX', current: 18650, unit: '吨', trend: -8.6, trendLabel: '大幅减少' },
            production: { current: 2280, unit: '万吨', yoyChange: 2.5, region: '全球' },
            trade: { importVal: 568, exportVal: 215, unit: '亿美元', netImport: 353 },
            usdCorrelation: -0.68,
        },
        hf_CAD: {
            inventory: { exchange: 'LME', current: 108540, unit: '吨', trend: -8.6, trendLabel: '大幅减少' },
            production: { current: 2280, unit: '万吨', yoyChange: 2.5, region: '全球' },
            trade: { importVal: 568, exportVal: 215, unit: '亿美元', netImport: 353 },
            usdCorrelation: -0.68,
        },
        hf_AHD: {
            inventory: { exchange: 'LME', current: 985620, unit: '吨', trend: 4.2, trendLabel: '增加' },
            production: { current: 7060, unit: '万吨', yoyChange: 3.2, region: '全球' },
            trade: { importVal: 245, exportVal: 389, unit: '亿美元', netImport: -144 },
            usdCorrelation: -0.55,
        },
        hf_ZSD: {
            inventory: { exchange: 'LME', current: 205840, unit: '吨', trend: -3.1, trendLabel: '减少' },
            production: { current: 1390, unit: '万吨', yoyChange: 1.8, region: '全球' },
            trade: { importVal: 85, exportVal: 62, unit: '亿美元', netImport: 23 },
            usdCorrelation: -0.52,
        },
        hf_NID: {
            inventory: { exchange: 'LME', current: 85620, unit: '吨', trend: 6.8, trendLabel: '大幅增加' },
            production: { current: 340, unit: '万吨', yoyChange: 4.5, region: '全球' },
            trade: { importVal: 78, exportVal: 25, unit: '亿美元', netImport: 53 },
            usdCorrelation: -0.48,
        },
        hf_SND: {
            inventory: { exchange: 'LME', current: 4520, unit: '吨', trend: -1.5, trendLabel: '小幅减少' },
            production: { current: 38, unit: '万吨', yoyChange: -2.2, region: '全球' },
            trade: { importVal: 22, exportVal: 8, unit: '亿美元', netImport: 14 },
            usdCorrelation: -0.50,
        },
        hf_PBD: {
            inventory: { exchange: 'LME', current: 196580, unit: '吨', trend: 2.1, trendLabel: '增加' },
            production: { current: 460, unit: '万吨', yoyChange: 1.5, region: '全球' },
            trade: { importVal: 32, exportVal: 18, unit: '亿美元', netImport: 14 },
            usdCorrelation: -0.45,
        },
        fuPL: {
            inventory: { exchange: 'NYMEX', current: 184520, unit: '盎司', trend: -5.2, trendLabel: '减少' },
            production: { current: 186, unit: '吨', yoyChange: -3.1, region: '全球' },
            trade: { importVal: 52, exportVal: 18, unit: '亿美元', netImport: 34 },
            usdCorrelation: -0.65,
        },
        hf_XPT: {
            inventory: { exchange: 'LBMA', current: 98640, unit: '盎司', trend: -2.8, trendLabel: '减少' },
            production: { current: 186, unit: '吨', yoyChange: -3.1, region: '全球' },
            trade: { importVal: 52, exportVal: 18, unit: '亿美元', netImport: 34 },
            usdCorrelation: -0.63,
        },
        fuPA: {
            inventory: { exchange: 'NYMEX', current: 98640, unit: '盎司', trend: 3.4, trendLabel: '增加' },
            production: { current: 210, unit: '吨', yoyChange: 2.8, region: '全球' },
            trade: { importVal: 38, exportVal: 12, unit: '亿美元', netImport: 26 },
            usdCorrelation: -0.58,
        },
        fuCL: {
            inventory: { exchange: 'NYMEX', current: 342560000, unit: '桶', trend: -4.2, trendLabel: '减少' },
            production: { current: 9820, unit: '万桶/日', yoyChange: 1.5, region: '全球' },
            trade: { importVal: 24850, exportVal: 8650, unit: '亿美元', netImport: 16200 },
            usdCorrelation: -0.65,
        },
        hf_OIL: {
            inventory: { exchange: 'ICE', current: 485600000, unit: '桶', trend: -4.2, trendLabel: '减少' },
            production: { current: 10250, unit: '万桶/日', yoyChange: 1.5, region: '全球' },
            trade: { importVal: 24850, exportVal: 8650, unit: '亿美元', netImport: 16200 },
            usdCorrelation: -0.65,
        },
    };

    /**
     * 生成美元指数与商品价格相关性数据
     * @param {string} code 商品代码
     * @param {number} currentPrice 当前价格
     */
    function generateUSDCorrelation(code, currentPrice) {
        const config = fundamentalConfig[code];
        if (!config) return { usdData: [], commodityData: [], correlation: 0 };

        const correlation = config.usdCorrelation;
        const count = 30;
        const usdData = [];
        const commodityData = [];

        let usdPrice = 104.5;
        let commPrice = currentPrice || 100;

        for (let i = 0; i < count; i++) {
            const usdChange = (Math.random() - 0.5) * 0.8;
            usdPrice += usdChange;

            // 商品价格与美元负相关
            const correlatedChange = -usdChange * Math.abs(correlation) + (Math.random() - 0.5) * (1 - Math.abs(correlation)) * 2;
            commPrice *= (1 + correlatedChange / 100);

            usdData.push(round(usdPrice, 2));
            commodityData.push(round(commPrice, 2));
        }

        return {
            usdData: usdData,
            commodityData: commodityData,
            correlation: correlation,
        };
    }

    function round(num, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    }

    /**
     * 获取商品基本面数据
     * @param {string} code 商品代码
     * @param {number} currentPrice 当前价格（用于生成相关性图表）
     */
    function getFundamentalData(code, currentPrice) {
        const config = fundamentalConfig[code];
        if (!config) return null;

        return {
            inventory: {
                exchange: config.inventory.exchange,
                current: config.inventory.current,
                unit: config.inventory.unit,
                trend: config.inventory.trend,
                trendLabel: config.inventory.trendLabel,
            },
            production: {
                current: config.production.current,
                unit: config.production.unit,
                yoyChange: config.production.yoyChange,
                region: config.production.region,
            },
            trade: {
                importVal: config.trade.importVal,
                exportVal: config.trade.exportVal,
                unit: config.trade.unit,
                netImport: config.trade.netImport,
            },
            usdCorrelation: config.usdCorrelation,
            usdChartData: generateUSDCorrelation(code, currentPrice),
        };
    }

    /**
     * 格式化大数字
     */
    function formatLargeNumber(num) {
        if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿';
        if (num >= 10000) return (num / 10000).toFixed(2) + '万';
        return num.toLocaleString();
    }

    return {
        getFundamentalData,
        formatLargeNumber,
    };
})();
