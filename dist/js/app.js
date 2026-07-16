/**
 * 主应用控制器 v2 - 同步执行版
 * 数据全部嵌入，无需异步操作
 */
var App = (function () {
    var state = {
        currentCommodity: null,
        currentPeriod: '1d',
        showMA: true,
        showBoll: true,
        showVolume: true,
        quotesData: {},
    };

    function init() {
        try {
            // 1. 加载商品分组
            CommodityData.getGroups();
            console.log('[App] groups loaded, codes:', CommodityData.getAllCodes().length);

            // 2. 加载行情
            state.quotesData = CommodityData.getAllQuotes();
            console.log('[App] quotes loaded:', Object.keys(state.quotesData).length);

            // 3. 渲染侧边栏和行情条
            renderSidebar();
            renderTickerBar();

            // 4. 绑定事件
            bindEvents();

            // 5. 选择第一个商品
            var codes = CommodityData.getAllCodes();
            if (codes.length > 0) {
                selectCommodity(codes[0]);
            }

            // 6. 时钟
            startClock();

            // 7. 快照时间
            var ts = CommodityData.getSnapshotTime();
            if (ts) {
                var el = document.querySelector('.data-source-label');
                if (el) el.textContent = '数据来源: 腾讯自选股 | 快照: ' + new Date(ts).toLocaleString('zh-CN');
            }

            // 8. 隐藏遮罩
            setTimeout(function() {
                var o = document.getElementById('loadingOverlay');
                if (o) o.classList.add('hidden');
            }, 300);

            window.addEventListener('resize', function() { Charts.resizeAll(); });
            console.log('[App] init complete');
        } catch(e) {
            console.error('[App] init error:', e);
            var o = document.getElementById('loadingOverlay');
            if (o) o.querySelector('.loading-text').textContent = '初始化失败: ' + e.message;
        }
    }

    function renderSidebar() {
        var groups = CommodityData.getGroups();
        var html = '';
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            html += '<div class="commodity-group">';
            html += '<div class="group-header"><span class="group-icon">' + g.icon + '</span><span class="group-name">' + g.name + '</span><span class="group-count">' + g.items.length + '</span></div>';
            html += '<div class="group-items">';
            for (var j = 0; j < g.items.length; j++) {
                var item = g.items[j];
                var q = state.quotesData[item.code];
                var price = q ? CommodityData.formatNumber(q.price, item.decimals || 2) : '--';
                var pct = q ? q.changePercent : 0;
                var cls = pct >= 0 ? 'text-up' : 'text-down';
                var arr = pct >= 0 ? '▲' : '▼';
                html += '<div class="commodity-item' + (item.code === state.currentCommodity ? ' active' : '') + '" data-code="' + item.code + '">';
                html += '<div class="commodity-item-info"><span class="commodity-item-name">' + item.name + '</span><span class="commodity-item-code">' + item.code + ' · ' + item.exchange + '</span></div>';
                html += '<div class="commodity-item-price"><span class="commodity-item-price-value ' + cls + '">' + price + '</span><span class="commodity-item-change ' + cls + '">' + arr + ' ' + Math.abs(pct).toFixed(2) + '%</span></div>';
                html += '</div>';
            }
            html += '</div></div>';
        }
        document.getElementById('commodityList').innerHTML = html;
    }

    function renderTickerBar() {
        var groups = CommodityData.getGroups();
        var html = '';
        for (var i = 0; i < groups.length; i++) {
            for (var j = 0; j < groups[i].items.length; j++) {
                var item = groups[i].items[j];
                var q = state.quotesData[item.code];
                if (!q) continue;
                var cls = q.changePercent >= 0 ? 'text-up' : 'text-down';
                var arr = q.changePercent >= 0 ? '▲' : '▼';
                html += '<div class="ticker-item" data-code="' + item.code + '"><span class="ticker-name">' + item.name + '</span><span class="ticker-price">' + CommodityData.formatNumber(q.price, item.decimals || 2) + '</span><span class="ticker-change ' + cls + '">' + arr + ' ' + Math.abs(q.changePercent).toFixed(2) + '%</span></div>';
            }
        }
        document.getElementById('tickerBar').innerHTML = html;
    }

    function selectCommodity(code) {
        state.currentCommodity = code;
        console.log('[App] selectCommodity:', code);

        var items = document.querySelectorAll('.commodity-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle('active', items[i].dataset.code === code);
        }

        var config = CommodityData.getCommodityConfig(code);
        if (config) {
            document.getElementById('currentCommodityName').textContent = config.name + ' (' + code + ')';
        }

        renderDataCards(code);
        renderCharts(code);
        renderFundamentals(code);
        renderPrediction(code);
    }

    function renderDataCards(code) {
        var q = state.quotesData[code];
        if (!q) return;
        var config = CommodityData.getCommodityConfig(code);
        var d = config ? (config.decimals || 2) : 2;
        var cls = q.changePercent >= 0 ? 'up' : 'down';
        var arr = q.changePercent >= 0 ? '▲' : '▼';
        var amp = q.prevClose > 0 ? (((q.high - q.low) / q.prevClose) * 100).toFixed(2) : '--';

        document.getElementById('dataCards').innerHTML =
            '<div class="data-card ' + cls + '"><div class="data-card-label">最新价格 (' + (q.unit || config.unit) + ')</div><div class="data-card-value">' + CommodityData.formatNumber(q.price, d) + '</div><div class="data-card-change ' + cls + '"><span class="change-arrow">' + arr + '</span><span>' + CommodityData.formatNumber(Math.abs(q.change), d) + ' (' + Math.abs(q.changePercent).toFixed(2) + '%)</span></div></div>' +
            '<div class="data-card"><div class="data-card-label">今开 / 昨收</div><div class="data-card-value" style="font-size:18px"><span>' + CommodityData.formatNumber(q.open, d) + '</span><span style="color:var(--text-muted);margin:0 4px">/</span><span style="color:var(--text-secondary)">' + CommodityData.formatNumber(q.prevClose, d) + '</span></div><div class="data-card-sub">货币: ' + (q.currency || 'USD') + '</div></div>' +
            '<div class="data-card"><div class="data-card-label">最高 / 最低</div><div class="data-card-value" style="font-size:18px"><span class="text-up">' + CommodityData.formatNumber(q.high, d) + '</span><span style="color:var(--text-muted);margin:0 4px">/</span><span class="text-down">' + CommodityData.formatNumber(q.low, d) + '</span></div><div class="data-card-sub">振幅: ' + amp + '%</div></div>' +
            '<div class="data-card"><div class="data-card-label">当日成交量</div><div class="data-card-value">' + (q.volume > 0 ? Fundamentals.formatLargeNumber(q.volume) : '--') + '</div><div class="data-card-sub">' + q.exchange + ' · ' + (q.isDelayed ? '延迟' : '实时') + '</div></div>';
    }

    function renderCharts(code) {
        console.log('[App] renderCharts for', code, 'period:', state.currentPeriod);
        var config = CommodityData.getCommodityConfig(code);
        var data = CommodityData.getKlineByPeriod(code, state.currentPeriod);
        console.log('[App] klineData:', data ? data.length : 'null', 'bars');

        if (!data || data.length === 0) {
            // 无K线数据
            Charts.disposeChart('mainChart');
            Charts.disposeChart('macdChart');
            Charts.disposeChart('rsiChart');
            var el = document.getElementById('mainChart');
            el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><div style="font-size:48px;margin-bottom:16px;">📊</div><div style="font-size:16px;">该品种暂不支持历史K线</div><div style="font-size:12px;margin-top:8px;">请选择同组内其他品种</div></div>';
            document.getElementById('macdChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">暂无数据</div>';
            document.getElementById('rsiChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">暂无数据</div>';
            document.getElementById('macdValues').textContent = 'DIF: -- DEA: -- MACD: --';
            document.getElementById('rsiValues').textContent = 'RSI6: -- RSI12: -- RSI24: --';
            return;
        }

        // 清除可能的"无数据"提示
        var el = document.getElementById('mainChart');
        if (el.children.length > 0 && el.children[0].tagName === 'DIV' && el.children[0].style.display) {
            Charts.disposeChart('mainChart');
            el.innerHTML = '';
        }

        console.log('[App] calling renderMainChart...');
        Charts.renderMainChart('mainChart', data, {
            showMA: state.showMA,
            showBoll: state.showBoll,
            showVolume: state.showVolume,
            period: state.currentPeriod,
        });
        console.log('[App] renderMainChart done');

        if (state.currentPeriod === '1m') {
            document.getElementById('macdChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">分时模式不显示MACD</div>';
            document.getElementById('rsiChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;">分时模式不显示RSI</div>';
            document.getElementById('macdValues').textContent = 'DIF: -- DEA: -- MACD: --';
            document.getElementById('rsiValues').textContent = 'RSI6: -- RSI12: -- RSI24: --';
        } else {
            Charts.renderMACDChart('macdChart', data);
            Charts.renderRSIChart('rsiChart', data);
        }
    }

    function renderFundamentals(code) {
        var q = state.quotesData[code];
        var price = q ? q.price : null;
        var fund = Fundamentals.getFundamentalData(code, price);
        if (!fund) return;

        var invCls = fund.inventory.trend < 0 ? 'down' : 'up';
        var invArr = fund.inventory.trend < 0 ? '↓' : '↑';
        document.getElementById('inventoryData').innerHTML =
            '<div class="fund-data-row"><span class="fund-data-label">交易所</span><span class="fund-data-value">' + fund.inventory.exchange + '</span></div>' +
            '<div class="fund-data-row"><span class="fund-data-label">当前库存</span><span class="fund-data-value">' + Fundamentals.formatLargeNumber(fund.inventory.current) + ' ' + fund.inventory.unit + '</span></div>' +
            '<div class="fund-data-row"><span class="fund-data-label">库存变化</span><span class="fund-data-value">' + fund.inventory.trendLabel + ' <span class="fund-data-trend ' + invCls + '">' + invArr + ' ' + Math.abs(fund.inventory.trend) + '%</span></span></div>';

        var prodCls = fund.production.yoyChange < 0 ? 'down' : 'up';
        var prodArr = fund.production.yoyChange < 0 ? '↓' : '↑';
        document.getElementById('productionData').innerHTML =
            '<div class="fund-data-row"><span class="fund-data-label">统计区域</span><span class="fund-data-value">' + fund.production.region + '</span></div>' +
            '<div class="fund-data-row"><span class="fund-data-label">年产量</span><span class="fund-data-value">' + Fundamentals.formatLargeNumber(fund.production.current) + ' ' + fund.production.unit + '</span></div>' +
            '<div class="fund-data-row"><span class="fund-data-label">同比变化</span><span class="fund-data-value">' + (fund.production.yoyChange > 0 ? '增长' : '下降') + ' <span class="fund-data-trend ' + prodCls + '">' + prodArr + ' ' + Math.abs(fund.production.yoyChange) + '%</span></span></div>';

        var netCls = fund.trade.netImport > 0 ? 'up' : 'down';
        document.getElementById('tradeData').innerHTML =
            '<div class="fund-data-row"><span class="fund-data-label">进口额</span><span class="fund-data-value">' + fund.trade.importVal + ' ' + fund.trade.unit + '</span></div>' +
            '<div class="fund-data-row"><span class="fund-data-label">出口额</span><span class="fund-data-value">' + fund.trade.exportVal + ' ' + fund.trade.unit + '</span></div>' +
            '<div class="fund-data-row"><span class="fund-data-label">净' + (fund.trade.netImport > 0 ? '进口' : '出口') + '</span><span class="fund-data-value">' + Math.abs(fund.trade.netImport) + ' ' + fund.trade.unit + ' <span class="fund-data-trend ' + netCls + '">' + (fund.trade.netImport > 0 ? '净进口' : '净出口') + '</span></span></div>';

        Charts.renderUSDChart('usdChart', fund.usdChartData.usdData, fund.usdChartData.commodityData, fund.usdCorrelation);
    }

    function renderPrediction(code) {
        var data = CommodityData.getKlineByPeriod(code, state.currentPeriod);
        if (!data || data.length < 60) {
            document.getElementById('gaugeChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px;">数据不足</div>';
            document.getElementById('predictionVerdict').innerHTML = '<span class="verdict-text neutral">数据不足</span>';
            document.getElementById('predictionConfidence').textContent = '置信度: --';
            document.getElementById('technicalSignals').innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px;">需要至少60条K线</div>';
            document.getElementById('fundamentalSignals').innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px;">需要基本面数据</div>';
            return;
        }
        var p = Prediction.predict(code, data);
        Charts.renderGaugeChart('gaugeChart', p.totalScore, p.verdict, p.verdictClass, p.confidence);
        document.getElementById('predictionVerdict').innerHTML = '<span class="verdict-text ' + p.verdictClass + '">' + p.verdict + '</span>';
        document.getElementById('predictionConfidence').textContent = '置信度: ' + p.confidence + '%';
        document.getElementById('technicalSignals').innerHTML = p.technicalSignals.map(function(s) {
            return '<div class="signal-item ' + s.type + '"><span class="signal-name">' + s.name + '</span><span class="signal-value ' + s.type + '">' + s.value + '</span></div>';
        }).join('');
        document.getElementById('fundamentalSignals').innerHTML = p.fundamentalSignals.map(function(s) {
            return '<div class="signal-item ' + s.type + '"><span class="signal-name">' + s.name + '</span><span class="signal-value ' + s.type + '">' + s.value + '</span></div>';
        }).join('');
    }

    function bindEvents() {
        // 手机端侧边栏
        document.getElementById('sidebarToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('active');
        });
        document.getElementById('sidebarOverlay').addEventListener('click', function() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });

        // 商品列表
        document.getElementById('commodityList').addEventListener('click', function(e) {
            var item = e.target.closest('.commodity-item');
            if (item) {
                selectCommodity(item.dataset.code);
                if (window.innerWidth <= 640) {
                    document.getElementById('sidebar').classList.remove('open');
                    document.getElementById('sidebarOverlay').classList.remove('active');
                }
            }
            var header = e.target.closest('.group-header');
            if (header) header.parentElement.classList.toggle('collapsed');
        });

        // 行情条
        document.getElementById('tickerBar').addEventListener('click', function(e) {
            var item = e.target.closest('.ticker-item');
            if (item) selectCommodity(item.dataset.code);
        });

        // 周期切换
        document.getElementById('periodSwitcher').addEventListener('click', function(e) {
            var btn = e.target.closest('.period-btn');
            if (btn) {
                var btns = document.querySelectorAll('.period-btn');
                for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
                btn.classList.add('active');
                state.currentPeriod = btn.dataset.period;
                var sub = document.getElementById('chartSubtitle');
                if (sub) {
                    var labels = { '1m': '分时走势 · 均价线', '1d': '日K线 · 成交量', '1w': '周K线 · 成交量', '1M': '月K线 · 成交量', '1q': '季K线 · 成交量', '1y': '年K线 · 成交量' };
                    sub.textContent = labels[state.currentPeriod] || 'K线 · 成交量';
                }
                renderCharts(state.currentCommodity);
                renderPrediction(state.currentCommodity);
            }
        });

        // 范围切换
        document.getElementById('rangeSwitcher').addEventListener('click', function(e) {
            var btn = e.target.closest('.range-btn');
            if (btn) {
                var btns = document.querySelectorAll('.range-btn');
                for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
                btn.classList.add('active');
                Charts.setZoomRange(btn.dataset.range, state.currentPeriod);
            }
        });

        // 指标开关
        document.getElementById('toggleMA').addEventListener('change', function(e) { state.showMA = e.target.checked; renderCharts(state.currentCommodity); });
        document.getElementById('toggleBoll').addEventListener('change', function(e) { state.showBoll = e.target.checked; renderCharts(state.currentCommodity); });
        document.getElementById('toggleVolume').addEventListener('change', function(e) { state.showVolume = e.target.checked; renderCharts(state.currentCommodity); });

        // 刷新
        document.getElementById('btnRefresh').addEventListener('click', function() {
            var btn = document.getElementById('btnRefresh');
            btn.classList.add('spinning');
            state.quotesData = CommodityData.getAllQuotes();
            renderSidebar();
            renderTickerBar();
            selectCommodity(state.currentCommodity);
            setTimeout(function() { btn.classList.remove('spinning'); }, 800);
        });

        // 搜索
        document.getElementById('commoditySearch').addEventListener('input', function(e) {
            var kw = e.target.value.trim().toLowerCase();
            var groups = document.querySelectorAll('.commodity-group');
            for (var i = 0; i < groups.length; i++) {
                var hasMatch = false;
                var items = groups[i].querySelectorAll('.commodity-item');
                for (var j = 0; j < items.length; j++) {
                    var name = items[j].querySelector('.commodity-item-name').textContent.toLowerCase();
                    var code = items[j].querySelector('.commodity-item-code').textContent.toLowerCase();
                    var match = name.indexOf(kw) >= 0 || code.indexOf(kw) >= 0;
                    items[j].style.display = match ? '' : 'none';
                    if (match) hasMatch = true;
                }
                groups[i].style.display = hasMatch || !kw ? '' : 'none';
            }
        });
    }

    function startClock() {
        function update() {
            var now = new Date();
            var h = String(now.getHours()).padStart(2, '0');
            var m = String(now.getMinutes()).padStart(2, '0');
            var s = String(now.getSeconds()).padStart(2, '0');
            var el = document.getElementById('clock');
            if (el) el.textContent = h + ':' + m + ':' + s;
        }
        update();
        setInterval(update, 1000);
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', function() { App.init(); });
