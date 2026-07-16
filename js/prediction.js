/**
 * ============================================
 * 趋势预判引擎
 * 结合技术面与基本面信号，提供综合趋势分析
 * ============================================
 */

const Prediction = (function () {
    'use strict';

    /**
     * 分析技术面信号
     * @param {Array} klineData K线数据
     * @returns {Object} 技术面信号 { score, signals, signalsData }
     */
    function analyzeTechnical(klineData) {
        const indicators = Indicators.getLatestIndicators(klineData);
        if (!indicators) return { score: 0, signals: [] };

        const signals = [];
        let score = 0;

        // 1. 均线多头/空头排列
        const { ma5, ma10, ma20, ma60, price } = indicators;
        if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
            signals.push({
                name: '均线排列',
                value: '多头排列',
                type: 'bullish',
                weight: 15,
            });
            score += 15;
        } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
            signals.push({
                name: '均线排列',
                value: '空头排列',
                type: 'bearish',
                weight: 15,
            });
            score -= 15;
        } else {
            signals.push({
                name: '均线排列',
                value: '交叉纠缠',
                type: 'neutral',
                weight: 0,
            });
        }

        // 2. 价格与MA20关系
        if (price > ma20) {
            const dev = ((price - ma20) / ma20 * 100).toFixed(2);
            signals.push({
                name: '价格vs MA20',
                value: `上方 ${dev}%`,
                type: 'bullish',
                weight: 8,
            });
            score += 8;
        } else {
            const dev = ((price - ma20) / ma20 * 100).toFixed(2);
            signals.push({
                name: '价格vs MA20',
                value: `下方 ${dev}%`,
                type: 'bearish',
                weight: 8,
            });
            score -= 8;
        }

        // 3. MA5与MA10金叉/死叉
        if (ma5 > ma10) {
            signals.push({
                name: 'MA5/MA10',
                value: '金叉',
                type: 'bullish',
                weight: 10,
            });
            score += 10;
        } else {
            signals.push({
                name: 'MA5/MA10',
                value: '死叉',
                type: 'bearish',
                weight: 10,
            });
            score -= 10;
        }

        // 4. MACD信号
        const { dif, dea, macd: macdVal } = indicators.macd;
        if (dif > dea && macdVal > 0) {
            signals.push({
                name: 'MACD',
                value: '多头 (DIF>DEA)',
                type: 'bullish',
                weight: 12,
            });
            score += 12;
        } else if (dif < dea && macdVal < 0) {
            signals.push({
                name: 'MACD',
                value: '空头 (DIF<DEA)',
                type: 'bearish',
                weight: 12,
            });
            score -= 12;
        } else {
            signals.push({
                name: 'MACD',
                value: '震荡',
                type: 'neutral',
                weight: 0,
            });
        }

        // 5. RSI信号
        const rsi = indicators.rsi;
        if (rsi > 70) {
            signals.push({
                name: 'RSI(14)',
                value: `${rsi.toFixed(1)} 超买`,
                type: 'bearish',
                weight: 8,
            });
            score -= 8;
        } else if (rsi < 30) {
            signals.push({
                name: 'RSI(14)',
                value: `${rsi.toFixed(1)} 超卖`,
                type: 'bullish',
                weight: 8,
            });
            score += 8;
        } else if (rsi > 50) {
            signals.push({
                name: 'RSI(14)',
                value: `${rsi.toFixed(1)} 偏强`,
                type: 'bullish',
                weight: 5,
            });
            score += 5;
        } else {
            signals.push({
                name: 'RSI(14)',
                value: `${rsi.toFixed(1)} 偏弱`,
                type: 'bearish',
                weight: 5,
            });
            score -= 5;
        }

        // 6. 布林带位置
        const { upper: bollUpper, lower: bollLower, middle: bollMid } = indicators.boll;
        if (price > bollUpper) {
            signals.push({
                name: '布林带',
                value: '突破上轨',
                type: 'bearish',
                weight: 6,
            });
            score -= 6;
        } else if (price < bollLower) {
            signals.push({
                name: '布林带',
                value: '跌破下轨',
                type: 'bullish',
                weight: 6,
            });
            score += 6;
        } else if (price > bollMid) {
            signals.push({
                name: '布林带',
                value: '中轨上方',
                type: 'bullish',
                weight: 4,
            });
            score += 4;
        } else {
            signals.push({
                name: '布林带',
                value: '中轨下方',
                type: 'bearish',
                weight: 4,
            });
            score -= 4;
        }

        return { score, signals };
    }

    /**
     * 分析基本面信号
     * @param {string} code 商品代码
     * @returns {Object} 基本面信号 { score, signals }
     */
    function analyzeFundamental(code) {
        const fund = Fundamentals.getFundamentalData(code);
        if (!fund) return { score: 0, signals: [] };

        const signals = [];
        let score = 0;

        // 1. 库存变化（库存减少=利多，库存增加=利空）
        const invTrend = fund.inventory.trend;
        if (invTrend < -3) {
            signals.push({
                name: '库存变化',
                value: `${invTrend}% 大幅减少`,
                type: 'bullish',
                weight: 15,
            });
            score += 15;
        } else if (invTrend < 0) {
            signals.push({
                name: '库存变化',
                value: `${invTrend}% 减少`,
                type: 'bullish',
                weight: 8,
            });
            score += 8;
        } else if (invTrend > 3) {
            signals.push({
                name: '库存变化',
                value: `${invTrend}% 大幅增加`,
                type: 'bearish',
                weight: 15,
            });
            score -= 15;
        } else {
            signals.push({
                name: '库存变化',
                value: `${invTrend}% 增加`,
                type: 'bearish',
                weight: 8,
            });
            score -= 8;
        }

        // 2. 产量变化（产量减少=利多，产量增加=利空）
        const prodChange = fund.production.yoyChange;
        if (prodChange < 0) {
            signals.push({
                name: '产量同比',
                value: `${prodChange}% 减少`,
                type: 'bullish',
                weight: 10,
            });
            score += 10;
        } else if (prodChange > 3) {
            signals.push({
                name: '产量同比',
                value: `${prodChange}% 大增`,
                type: 'bearish',
                weight: 10,
            });
            score -= 10;
        } else {
            signals.push({
                name: '产量同比',
                value: `${prodChange}% 增长`,
                type: 'bearish',
                weight: 5,
            });
            score -= 5;
        }

        // 3. 贸易净进口
        const netImport = fund.trade.netImport;
        if (netImport > 100) {
            signals.push({
                name: '净进口额',
                value: `${netImport}亿 高进口依赖`,
                type: 'bullish',
                weight: 8,
            });
            score += 8;
        } else if (netImport > 0) {
            signals.push({
                name: '净进口额',
                value: `${netImport}亿 净进口`,
                type: 'bullish',
                weight: 4,
            });
            score += 4;
        } else {
            signals.push({
                name: '净进口额',
                value: `${netImport}亿 净出口`,
                type: 'bearish',
                weight: 5,
            });
            score -= 5;
        }

        // 4. 美元指数相关性
        const usdCorr = fund.usdCorrelation;
        const usdTrend = fund.usdChartData.usdData;
        const usdRecent = usdTrend[usdTrend.length - 1] - usdTrend[0];
        const usdChangePercent = (usdRecent / usdTrend[0]) * 100;

        if (usdChangePercent < 0) {
            // 美元走弱，对商品利多（负相关）
            signals.push({
                name: '美元走势',
                value: `美元走弱 ${usdChangePercent.toFixed(2)}%`,
                type: 'bullish',
                weight: 12,
            });
            score += 12;
        } else {
            signals.push({
                name: '美元走势',
                value: `美元走强 +${usdChangePercent.toFixed(2)}%`,
                type: 'bearish',
                weight: 12,
            });
            score -= 12;
        }

        return { score, signals };
    }

    /**
     * 综合预判
     * @param {string} code 商品代码
     * @param {Array} klineData K线数据
     * @returns {Object} 综合预判结果
     */
    function predict(code, klineData) {
        const techAnalysis = analyzeTechnical(klineData);
        const fundAnalysis = analyzeFundamental(code);

        // 技术面权重 60%，基本面权重 40%
        const techWeight = 0.6;
        const fundWeight = 0.4;

        const techScore = techAnalysis.score * techWeight;
        const fundScore = fundAnalysis.score * fundWeight;
        const totalScore = Math.round(techScore + fundScore);

        // 确定预判结果
        let verdict, verdictClass, confidence;

        if (totalScore >= 30) {
            verdict = '强烈看涨';
            verdictClass = 'strong-buy';
            confidence = Math.min(95, 60 + Math.abs(totalScore));
        } else if (totalScore >= 10) {
            verdict = '偏多';
            verdictClass = 'buy';
            confidence = Math.min(75, 55 + Math.abs(totalScore));
        } else if (totalScore > -10) {
            verdict = '震荡观望';
            verdictClass = 'neutral';
            confidence = Math.max(40, 60 - Math.abs(totalScore));
        } else if (totalScore > -30) {
            verdict = '偏空';
            verdictClass = 'sell';
            confidence = Math.min(75, 55 + Math.abs(totalScore));
        } else {
            verdict = '强烈看跌';
            verdictClass = 'strong-sell';
            confidence = Math.min(95, 60 + Math.abs(totalScore));
        }

        return {
            totalScore: totalScore,
            verdict: verdict,
            verdictClass: verdictClass,
            confidence: confidence,
            techScore: Math.round(techScore),
            fundScore: Math.round(fundScore),
            technicalSignals: techAnalysis.signals,
            fundamentalSignals: fundAnalysis.signals,
        };
    }

    return {
        analyzeTechnical,
        analyzeFundamental,
        predict,
    };
})();
