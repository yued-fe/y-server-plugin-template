# y-server-plugin-template

y-server-plugin-template is a [y-server](https://github.com/yued-fe/y-server) template render plugin.

## Install

```bash
npm install y-server-plugin-template
```

## Usage

```javascript
const path = require('path');

const yServer = require('y-server');
const mockPlugin = require('y-server-plugin-mock');
const ejsPlugin = require('y-server-plugin-ejs');
const templatePlugin = require('y-server-plugin-template');

yServer({
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
});
```

## Notes

* `defaultHost` is the default host of route path.
* `routes` is the routes config.
* `apiServer` is the api server.
* `apiOptions` is the api options (see [request](https://github.com/request/request)).

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
