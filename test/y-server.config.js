'use strict';

const path = require('path');

const mockPlugin = require('y-server-plugin-mock');
const ejsPlugin = require('y-server-plugin-ejs');

const templatePlugin = require('../index.js');

module.exports = {
  port: 8889,
  watch: path.join(__dirname, '../index.js'),
  plugins: [
    mockPlugin({
      mockEnable: false,
      mockDir: path.join(__dirname, './json'), // 模拟数据根目录
      mockAdapter: require('./json/adapter.js'),
    }),
    ejsPlugin({
      viewDir: path.join(__dirname, './view'), // 模板根目录
      renderAdapter: (result) => {
        result.$render = true;
        return result;
      },
    }),
    templatePlugin({
      routes: {
        '/': { view: 'template.html' },
        '/rank': { view: 'template.html', cgi: '/majax/rank/list' },
        'localhost:10024/category': { view: 'template.html', cgi: '/majax/category' },
        '/user': { view: 'template.html', cgi: '/majax/user/index' }, // 需要登录态页面验证
      },
      apiServer: 'https://m.readnovel.com', // 后端 server
      apiOptions: {
        query: {},
        headers: {},
      },
    }),
  ],
};
