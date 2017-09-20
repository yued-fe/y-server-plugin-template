'use strict';
require('colors');

const url = require('url');

const request = require('request');

function each(obj, fn) {
  if (!obj) {
    return;
  }
  Object.keys(obj).forEach(function (key) {
    fn(obj[key], key);
  });
}

/**
 * 转换路由
 * 将
 *   {
 *     'a.com/index': {},
 *     'b.com/index': {},
 *   }
 * 转换成
 *   {
 *     '/index': {
 *       'a.com': {},
 *       'b.com': {},
 *     },
 *   }
 * @param {Object} routes 路由对象
 * @param {String} defaultHost 默认域名
 * @return {Object} 转换后的路由
 */
function transformRoutes(routes, defaultHost) {
  const transformedRoutes = {};

  each(routes, function (routeConfig, routeUrl) {
    const delimiterIndex = routeUrl.indexOf('/');

    const routeHost = routeUrl.slice(0, delimiterIndex) || defaultHost;
    const routePath = routeUrl.slice(delimiterIndex);

    if (!transformedRoutes[routePath]) {
      transformedRoutes[routePath] = {};
    }

    transformedRoutes[routePath][routeHost] = routeConfig;
  });

  return transformedRoutes;
}

/**
 * 模板渲染插件
 * @param {Object} options 配置
 * @param {Object} options.defaultHost 默认域名, 在“路径”没有配置host(以非"/"开头)或“没有匹配到域名”时用此域名
 * @param {Object} options.routes 页面路由
 * @param {String} options.apiServer 模板数据请求服务器地址
 * @param {Object} options.apiOptions 模板请求配置
 * @return {Function} 插件安装方法
 */
module.exports = function (options) {
  if (!options || !options.routes) {
    throw new Error('[y-server-plugin-template]'.red, '"routes"配置错误');
  }

  const apiServer = options.apiServer;
  const apiOptions = options.apiOptions || {};

  const defaultReqOptions = Object.assign({}, apiOptions, { query: null }); // query 在后续生成
  const defaultReqQuery = apiOptions.query;

  const defaultHost = options.defaultHost || 'default';
  const routes = transformRoutes(options.routes, defaultHost);

  /**
   * 插件安装方法
   * @param {Object} app Express实例
   */
  return function (app) {
    each(routes, function (routeDomainsConfig, routePath) {
      app.get(routePath, function (req, res, next) {
        const routeConfig = routeDomainsConfig[req.headers.host] || routeDomainsConfig[defaultHost];

        if (!routeConfig) {
          return next();
        }

        const cgi = routeConfig.cgi;
        const view = routeConfig.view;

        if (!cgi) {
          return res.render(view);
        }

        if (res.getMockData) {
          return res.getMockData(routeConfig.cgi).then(function (data) {
            res.render(routeConfig.view, data);
          }).catch(next);
        }

        const urlObj = url.parse(`${apiServer}${cgi}`, true, true);
        urlObj.search = null; // 有 search 时 query 不生效
        urlObj.query = Object.assign({}, defaultReqQuery, req.query, urlObj.query, req.params);

        const headers = Object.assign({
          cookie: req.headers.cookie, // 需要登录态的页面一般依赖 cookie
        }, defaultReqOptions.headers);

        const uri = url.format(urlObj);

        const reqOptions = Object.assign({
          gzip: true,
          timeout: 5000,
        }, defaultReqOptions, {
          method: 'GET',
          uri: uri,
          headers: headers,
          followRedirect: false, // 不能跟随重定向，否则不能获取不到301或302状态
        });

        console.log('[数据请求]'.blue, `请求"${uri}"开始`);
        request(reqOptions, function (error, response, body) {
          if (error) {
            console.log('[数据请求]'.red, `请求"${uri}"出错`);
            next(error);
          } else {
            const statusCode = response.statusCode;
            if (statusCode === 200) {
              let data;
              try {
                data = JSON.parse(body);
              } catch (ex) {
                console.log('[数据请求]'.red, `请求"${uri}"结果非JSON格式`);
                return next(new Error(`请求"${uri}"结果非JSON格式:\n${body}`));
              }
              console.log('[数据请求]'.green, `请求"${uri}"成功`);

              // 设置 cookie, 否则 cookie 不同步, 容易导致登录态等信息丢失
              if (response.headers['set-cookie']) {
                res.set('set-cookie', response.headers['set-cookie']);
              }
              res.render(view, data);
            } else if (statusCode === 301 || statusCode === 302) {
              const location = response.headers.location;
              console.log('[数据请求]'.red, `请求"${uri}"被重定向到"${location}"`);
              res.redirect(location); // 重定向
            } else {
              console.log('[数据请求]'.red, `请求"${uri}"状态码为"${statusCode}"`);
              next(new Error(response)); // 非200/301/302直接将结果作为错误，后续有需求在处理
            }
          }
        });
      });
    });
  };
};
