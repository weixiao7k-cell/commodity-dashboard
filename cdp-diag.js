// CDP诊断脚本 - 通过WebSocket连接Edge调试端口
const WebSocket = require('ws');

const wsUrl = 'ws://localhost:9223/devtools/page/5531F9701B69DA896FF718BB7602D204';
const ws = new WebSocket(wsUrl);
let msgId = 1;

function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    ws.send(JSON.stringify({ id, method, params }));
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.removeListener('message', handler);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
  });
}

ws.on('open', async () => {
  try {
    console.log('CDP connected, running diagnostic...');

    // 执行诊断JS
    const result = await send('Runtime.evaluate', {
      expression: `(function() {
        var el = document.getElementById('mainChart');
        var rect = el ? el.getBoundingClientRect() : null;
        var canvases = el ? el.querySelectorAll('canvas') : [];
        var inst = (typeof echarts !== 'undefined' && el) ? echarts.getInstanceByDom(el) : null;
        var optSummary = null;
        if (inst) {
          var opt = inst.getOption();
          optSummary = {
            seriesCount: opt.series ? opt.series.length : 0,
            s0type: opt.series && opt.series[0] ? opt.series[0].type : null,
            s0dataLen: opt.series && opt.series[0] && opt.series[0].data ? opt.series[0].data.length : 0,
            s0first: opt.series && opt.series[0] && opt.series[0].data ? JSON.stringify(opt.series[0].data[0]) : null,
            s0last: opt.series && opt.series[0] && opt.series[0].data ? JSON.stringify(opt.series[0].data[opt.series[0].data.length-1]) : null,
            xDataLen: opt.xAxis && opt.xAxis[0] && opt.xAxis[0].data ? opt.xAxis[0].data.length : 0,
            chartWidth: inst.getWidth(),
            chartHeight: inst.getHeight(),
            isDisposed: inst.isDisposed ? inst.isDisposed() : 'N/A',
          };
        }
        var macdEl = document.getElementById('macdChart');
        var macdInst = (typeof echarts !== 'undefined' && macdEl) ? echarts.getInstanceByDom(macdEl) : null;
        return JSON.stringify({
          main: {
            exists: !!el,
            w: rect ? rect.width : 0,
            h: rect ? rect.height : 0,
            canvasCount: canvases.length,
            canvasInfo: Array.from(canvases).map(c => c.width + 'x' + c.height),
            innerHTMLLen: el ? el.innerHTML.length : 0,
            innerHTMLHead: el ? el.innerHTML.substring(0, 300) : '',
            hasInst: !!inst,
            opt: optSummary,
          },
          macd: {
            exists: !!macdEl,
            hasInst: !!macdInst,
            w: macdEl ? macdEl.getBoundingClientRect().width : 0,
            h: macdEl ? macdEl.getBoundingClientRect().height : 0,
            canvasCount: macdEl ? macdEl.querySelectorAll('canvas').length : 0,
          },
          current: document.getElementById('currentCommodityName') ? document.getElementById('currentCommodityName').textContent : null,
        });
      })()`,
      returnByValue: true,
    });

    console.log('\n=== DIAGNOSTIC RESULT ===');
    if (result.result && result.result.value) {
      const data = JSON.parse(result.result.value);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('Result:', JSON.stringify(result));
    }

    // 截图
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot.data) {
      require('fs').writeFileSync('diag-cdp-full.png', Buffer.from(shot.data, 'base64'));
      console.log('\nSaved diag-cdp-full.png');
    }

    // mainChart区域截图
    const clipResult = await send('Runtime.evaluate', {
      expression: `(function() {
        var el = document.getElementById('mainChart');
        var r = el.getBoundingClientRect();
        return JSON.stringify({x: r.x, y: r.y, width: r.width, height: r.height, scale: window.devicePixelRatio});
      })()`,
      returnByValue: true,
    });
    if (clipResult.result && clipResult.result.value) {
      const clip = JSON.parse(clipResult.result.value);
      console.log('mainChart clip:', JSON.stringify(clip));
      const shot2 = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 },
      });
      if (shot2.data) {
        require('fs').writeFileSync('diag-cdp-main.png', Buffer.from(shot2.data, 'base64'));
        console.log('Saved diag-cdp-main.png');
      }
    }

    ws.close();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
});

ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
setTimeout(() => { console.error('Timeout'); process.exit(1); }, 15000);
