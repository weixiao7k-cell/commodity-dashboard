// 深度诊断 - 检查canvas位置、grid、z-index等
const WebSocket = require('ws');
const wsUrl = 'ws://localhost:9223/devtools/page/5531F9701B69DA896FF718BB7602D204';
const ws = new WebSocket(wsUrl);
let msgId = 1;
function send(method, params) { return new Promise((resolve, reject) => { const id = msgId++; ws.send(JSON.stringify({id, method, params})); const h = (data) => { const m = JSON.parse(data.toString()); if (m.id === id) { ws.removeListener('message', h); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); } }; ws.on('message', h); }); }

ws.on('open', async () => {
  const r = await send('Runtime.evaluate', {
    expression: `(function(){
      var el = document.getElementById('mainChart');
      var inst = echarts.getInstanceByDom(el);
      var opt = inst.getOption();
      var canvas = el.querySelector('canvas');
      var canvasRect = canvas.getBoundingClientRect();
      var containerRect = el.getBoundingClientRect();

      // 检查所有子元素的层级
      var children = Array.from(el.querySelectorAll('*'));
      var childInfo = children.map(function(c) {
        var r2 = c.getBoundingClientRect();
        var s = window.getComputedStyle(c);
        return {
          tag: c.tagName,
          cls: c.className,
          id: c.id || '',
          rect: r2.x + ',' + r2.y + ',' + r2.width + ',' + r2.height,
          zIndex: s.zIndex,
          display: s.display,
          visibility: s.visibility,
          opacity: s.opacity,
          overflow: s.overflow,
          position: s.position,
        };
      });

      // 检查grid配置
      var gridInfo = opt.grid;
      var yRange = null;
      if (opt.series && opt.series[0] && opt.series[0].data) {
        var vals = opt.series[0].data.filter(function(v){return v!=null});
        var mn = Math.min.apply(null, vals);
        var mx = Math.max.apply(null, vals);
        yRange = [mn, mx];
      }

      return JSON.stringify({
        container: {x:containerRect.x,y:containerRect.y,w:containerRect.width,h:containerRect.height},
        canvas: {x:canvasRect.x,y:canvasRect.y,w:canvasRect.width,h:canvasRect.height,relativeToContainer:{dx:canvasRect.x-containerRect.x,dy:canvasRect.y-containerRect.y,dw:canvasRect.width-containerRect.width,dh:canvasRect.height-containerRect.height}},
        grid: gridInfo,
        yAxis0: opt.yAxis && opt.yAxis[0] ? {min:opt.yAxis[0].min,max:opt.yAxis[0].max,scale:opt.yAxis[0].scale,position:opt.yAxis[0].position} : null,
        yAxisRange: yRange,
        series0DataSample: opt.series[0].data.slice(0,3),
        children: childInfo,
        // 找最上层元素
        topElements: children.filter(function(c){var r2=c.getBoundingClientRect();return r2.width>0&&r2.height>0}).map(function(c){return c.tagName+'#'+c.id+'.'+c.className.substring(0,30)+' @ '+c.getBoundingClientRect().x.toFixed(0)+','+c.getBoundingClientRect().y.toFixed(0)}),
      });
    })()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(JSON.parse(r.result.value), null, 2));

  // 截取全页面
  var full = await send('Page.getLayoutMetrics', {});
  console.log('\nLayout:', JSON.stringify(full));

  // 截全页面
  var shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: {x:0, y:0, width: 1400, height: full.contentSize.height, scale: 1} });
  if (shot.data) {
    require('fs').writeFileSync('diag-fullpage.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved diag-fullpage.png ('+full.contentSize.height+'px tall)');
  }

  ws.close();
  process.exit(0);
});
ws.on('error', e => { console.error(e.message); process.exit(1); });
setTimeout(() => process.exit(1), 15000);
