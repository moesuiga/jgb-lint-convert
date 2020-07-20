# jgb-lint-convert

主要用于`eslint`移除使用`wx.xxx`全局自动方法、属性，改为使用`import` 方式。

## 使用

```sh
# 通过glob 统一查找替换
jconvert --source src/**/*.js
```

### 安装

```sh
npm i -g jgb-lint-convert
```

### 配置

在所需转换的项目的根目录中增加配置`jgb.convert.js`

```js
module.exports = {
  'wx.myPage': {
    // 目标值
    replacedKey: 'JPage', // 替换值
    isDefault: false, // 是否默认导入
    import: 'jgb-weapp', // 导入的路径
  },
};
```

### 示例说明

原文件

```js
wx.myPage({});
```

转换后

```js
import { JPage } from 'jgb-weapp';

JPage({});
```
