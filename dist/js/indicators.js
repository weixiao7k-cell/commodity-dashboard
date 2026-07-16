/**
 * ============================================
 * 技术指标计算模块
 * 实现: MA均线、MACD、RSI、布林带
 * ============================================
 */

const Indicators = (function () {
    'use strict';

    /**
     * 简单移动平均线 (SMA)
     * @param {Array} data K线数据
     * @param {number} period 周期
     * @returns {Array} MA数据 (前 period-1 个为 null)
     */
    function calcMA(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            result.push(sum / period);
        }
        return result;
    }

    /**
     * 指数移动平均线 (EMA)
     * @param {Array} values 数值数组
     * @param {number} period 周期
     * @returns {Array} EMA数据
     */
    function calcEMA(values, period) {
        const result = [];
        const multiplier = 2 / (period + 1);

        for (let i = 0; i < values.length; i++) {
            if (i === 0) {
                result.push(values[0]);
            } else if (i < period - 1) {
                // 前面用SMA近似
                let sum = 0;
                for (let j = 0; j <= i; j++) sum += values[j];
                result.push(sum / (i + 1));
            } else if (i === period - 1) {
                // 第一个EMA用SMA
                let sum = 0;
                for (let j = 0; j < period; j++) sum += values[i - j];
                result.push(sum / period);
            } else {
                result.push((values[i] - result[i - 1]) * multiplier + result[i - 1]);
            }
        }
        return result;
    }

    /**
     * 计算MACD指标
     * @param {Array} data K线数据
     * @param {number} shortPeriod 短期EMA周期 (默认12)
     * @param {number} longPeriod 长期EMA周期 (默认26)
     * @param {number} signalPeriod 信号线周期 (默认9)
     * @returns {Object} { dif, dea, macd }
     */
    function calcMACD(data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
        const closes = data.map(d => d.close);
        const emaShort = calcEMA(closes, shortPeriod);
        const emaLong = calcEMA(closes, longPeriod);

        const dif = [];
        for (let i = 0; i < closes.length; i++) {
            dif.push(emaShort[i] - emaLong[i]);
        }

        const dea = calcEMA(dif, signalPeriod);

        const macd = [];
        for (let i = 0; i < dif.length; i++) {
            macd.push((dif[i] - dea[i]) * 2);
        }

        return { dif, dea, macd };
    }

    /**
     * 计算RSI指标
     * @param {Array} data K线数据
     * @param {number} period 周期 (默认14)
     * @returns {Array} RSI数据
     */
    function calcRSI(data, period = 14) {
        const result = [];
        const closes = data.map(d => d.close);

        for (let i = 0; i < closes.length; i++) {
            if (i < period) {
                result.push(null);
                continue;
            }

            let gainSum = 0;
            let lossSum = 0;

            for (let j = i - period + 1; j <= i; j++) {
                const diff = closes[j] - closes[j - 1];
                if (diff >= 0) {
                    gainSum += diff;
                } else {
                    lossSum += Math.abs(diff);
                }
            }

            const avgGain = gainSum / period;
            const avgLoss = lossSum / period;

            if (avgLoss === 0) {
                result.push(100);
            } else {
                const rs = avgGain / avgLoss;
                result.push(100 - 100 / (1 + rs));
            }
        }
        return result;
    }

    /**
     * 计算布林带
     * @param {Array} data K线数据
     * @param {number} period 周期 (默认20)
     * @param {number} multiplier 标准差倍数 (默认2)
     * @returns {Object} { upper, middle, lower }
     */
    function calcBoll(data, period = 20, multiplier = 2) {
        const closes = data.map(d => d.close);
        const middle = [];
        const upper = [];
        const lower = [];

        for (let i = 0; i < closes.length; i++) {
            if (i < period - 1) {
                middle.push(null);
                upper.push(null);
                lower.push(null);
                continue;
            }

            // 中轨 = SMA
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += closes[i - j];
            }
            const ma = sum / period;
            middle.push(ma);

            // 标准差
            let varianceSum = 0;
            for (let j = 0; j < period; j++) {
                varianceSum += Math.pow(closes[i - j] - ma, 2);
            }
            const std = Math.sqrt(varianceSum / period);

            upper.push(ma + multiplier * std);
            lower.push(ma - multiplier * std);
        }

        return { upper, middle, lower };
    }

    /**
     * 计算成交量均线
     * @param {Array} data K线数据
     * @param {number} period 周期
     * @returns {Array} 成交量MA
     */
    function calcVolumeMA(data, period = 5) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].volume;
            }
            result.push(sum / period);
        }
        return result;
    }

    /**
     * 获取最新指标值
     * @param {Array} data K线数据
     * @returns {Object} 最新指标值
     */
    function getLatestIndicators(data) {
        if (data.length < 60) return null;

        const ma5 = calcMA(data, 5);
        const ma10 = calcMA(data, 10);
        const ma20 = calcMA(data, 20);
        const ma60 = calcMA(data, 60);
        const macd = calcMACD(data);
        const rsi = calcRSI(data, 14);
        const boll = calcBoll(data, 20, 2);

        const lastIdx = data.length - 1;

        return {
            ma5: ma5[lastIdx],
            ma10: ma10[lastIdx],
            ma20: ma20[lastIdx],
            ma60: ma60[lastIdx],
            macd: {
                dif: macd.dif[lastIdx],
                dea: macd.dea[lastIdx],
                macd: macd.macd[lastIdx],
            },
            rsi: rsi[lastIdx],
            boll: {
                upper: boll.upper[lastIdx],
                middle: boll.middle[lastIdx],
                lower: boll.lower[lastIdx],
            },
            price: data[lastIdx].close,
            prevPrice: data[lastIdx - 1].close,
        };
    }

    return {
        calcMA,
        calcEMA,
        calcMACD,
        calcRSI,
        calcBoll,
        calcVolumeMA,
        getLatestIndicators,
    };
})();
