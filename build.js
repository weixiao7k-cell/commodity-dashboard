// 先从 data/ 目录重新生成 data-embed.js（确保用最新数据）
require('./generate-embed.js');

var fs = require('fs');
var echarts = fs.readFileSync('js/echarts.min.js', 'utf8');
var embed = fs.readFileSync('js/data-embed.js', 'utf8');
var data = fs.readFileSync('js/data.js', 'utf8');
var ind = fs.readFileSync('js/indicators.js', 'utf8');
var fund = fs.readFileSync('js/fundamentals.js', 'utf8');
var pred = fs.readFileSync('js/prediction.js', 'utf8');
var charts = fs.readFileSync('js/charts.js', 'utf8');
var app = fs.readFileSync('js/app.js', 'utf8');
var css = fs.readFileSync('css/style.css', 'utf8');
var html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/<link rel="stylesheet" href="css\/style\.css[^"]*">/, '<style>' + css + '</style>');
html = html.replace(/<script src="js\/echarts\.min\.js"><\/script>/, '<script>' + echarts + '</script>');
html = html.replace(/<script src="js\/data-embed\.js\?v=\d+"><\/script>/, '<script>' + embed + '</script>');
html = html.replace(/<script src="js\/data\.js\?v=\d+"><\/script>/, '<script>' + data + '</script>');
html = html.replace(/<script src="js\/indicators\.js\?v=\d+"><\/script>/, '<script>' + ind + '</script>');
html = html.replace(/<script src="js\/fundamentals\.js\?v=\d+"><\/script>/, '<script>' + fund + '</script>');
html = html.replace(/<script src="js\/prediction\.js\?v=\d+"><\/script>/, '<script>' + pred + '</script>');
html = html.replace(/<script src="js\/charts\.js\?v=\d+"><\/script>/, '<script>' + charts + '</script>');
html = html.replace(/<script src="js\/app\.js\?v=\d+"><\/script>/, '<script>' + app + '</script>');
// 删除beacon
html = html.split('<script src="https://beacon').map(function(p, i) { return i === 0 ? p : p.substring(p.indexOf('</script>') + 9); }).join('');

fs.writeFileSync('dist/index.html', html, 'utf8');
console.log('done, size:', (html.length / 1024 / 1024).toFixed(1) + 'MB');
