'use strict';

const path = require('path');

const mockPlugin = require('../../y-server-plugin-mock/index.js');
const ejsPlugin = require('../../y-server-plugin-ejs/index.js');
const templatePlugin = require('../index.js');

module.exports = {
  watch: path.join(__dirname, '../index.js'),
  plugins: [
    mockPlugin({
      mockEnable: true,
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
        '/rank': { view: 'rank.html', cgi: '/majax/rank' },
        'localhost:10024/category': { view: 'rank.html', cgi: '/majax/category' },
      },
      apiServer: 'http://m.readnovel.com', // 后端 server
      apiOptions: {
        query: {},
        headers: {},
      },
    }),
  ],
};
