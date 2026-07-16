const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1400,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleMsgs = [];
  const errors = [];
  page.on('console', msg => consoleMsgs.push('[' + msg.type() + '] ' + msg.text()));
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  page.on('requestfailed', req => errors.push('REQFAIL: ' + req.url() + ' - ' + req.failure().errorText));

  await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // 收集mainChart状态
  const status = await page.evaluate(() => {
    const el = document.getElementById('mainChart');
    const rect = el ? el.getBoundingClientRect() : null;
    const canvas = el ? el.querySelectorAll('canvas') : [];
    const echartsInst = el && window.echarts ? echarts.getInstanceByDom(el) : null;
    let optSummary = null;
    if (echartsInst) {
      const opt = echartsInst.getOption();
      optSummary = {
        seriesCount: opt.series ? opt.series.length : 0,
        firstSeriesType: opt.series && opt.series[0] ? opt.series[0].type : null,
        firstSeriesDataLen: opt.series && opt.series[0] && opt.series[0].data ? opt.series[0].data.length : 0,
        firstSeriesFirstVal: opt.series && opt.series[0] && opt.series[0].data ? JSON.stringify(opt.series[0].data[0]) : null,
        firstSeriesLastVal: opt.series && opt.series[0] && opt.series[0].data ? JSON.stringify(opt.series[0].data[opt.series[0].data.length-1]) : null,
        xAxisDataLen: opt.xAxis && opt.xAxis[0] && opt.xAxis[0].data ? opt.xAxis[0].data.length : 0,
        gridStr: JSON.stringify(opt.grid),
      };
    }
    // 同样检查macdChart
    const macdEl = document.getElementById('macdChart');
    const macdCanvas = macdEl ? macdEl.querySelectorAll('canvas') : [];
    return {
      mainChart: {
        exists: !!el,
        width: rect ? rect.width : 0,
        height: rect ? rect.height : 0,
        canvasCount: canvas.length,
        innerHTMLLen: el ? el.innerHTML.length : 0,
        innerHTMLHead: el ? el.innerHTML.substring(0, 200) : '',
        hasEchartsInstance: !!echartsInst,
        option: optSummary,
      },
      macdChart: {
        exists: !!macdEl,
        canvasCount: macdCanvas.length,
        width: macdEl ? macdEl.getBoundingClientRect().width : 0,
        height: macdEl ? macdEl.getBoundingClientRect().height : 0,
      },
      currentCommodity: document.getElementById('currentCommodityName') ? document.getElementById('currentCommodityName').textContent : null,
    };
  });

  console.log('=== DIAGNOSTIC STATUS ===');
  console.log(JSON.stringify(status, null, 2));
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMsgs.forEach(m => console.log(m));
  console.log('\n=== ERRORS ===');
  if (errors.length === 0) console.log('(none)');
  errors.forEach(e => console.log(e));

  // 截图
  await page.screenshot({ path: path.join(__dirname, 'diag-full.png'), fullPage: false });
  const mainEl = await page.$('#mainChart');
  if (mainEl) {
    await mainEl.screenshot({ path: path.join(__dirname, 'diag-mainchart.png') });
    console.log('\nSaved diag-mainchart.png');
  }
  console.log('Saved diag-full.png');

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
