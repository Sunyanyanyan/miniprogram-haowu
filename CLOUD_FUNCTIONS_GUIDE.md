# 云函数部署问题解决方案

## 问题描述
微信开发者工具提示："当前项目内无云函数，请确认云函数目录 cloudfunctionRoot 已在 project.config.json 中配置，并已右键同步云函数列表。"

## 解决方案

### 方案一：同步云函数列表（推荐）

1. 在微信开发者工具中，找到左侧文件列表
2. 右键点击 `cloudfunctions` 文件夹
3. 选择"同步云函数列表"
4. 等待同步完成

### 方案二：通过云开发控制台创建

1. 点击工具栏的"云开发"按钮
2. 点击左侧的"云函数"
3. 点击"新建云函数"
4. 输入云函数名称：`getOpenid`
5. 选择运行环境：Node.js 16.13
6. 点击"确定"
7. 重复创建其他云函数：
   - `checkContent`
   - `item`
   - `admin`

### 方案三：重新创建云函数目录

如果以上方案都不行，请按以下步骤操作：

#### 步骤 1：删除现有云函数目录

在微信开发者工具中：
1. 右键点击 `cloudfunctions` 文件夹
2. 选择"删除"

#### 步骤 2：重新创建云函数

1. 点击"云开发"按钮
2. 点击"云函数"
3. 点击"新建云函数"
4. 输入名称：`getOpenid`
5. 选择环境：Node.js 16.13
6. 点击"确定"

这会自动在项目中创建 `cloudfunctions/getOpenid` 文件夹

#### 步骤 3：复制代码

将以下代码复制到 `cloudfunctions/getOpenid/index.js`：

```javascript
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID
  };
};
```

#### 步骤 4：创建 package.json

在 `cloudfunctions/getOpenid` 文件夹中创建 `package.json`：

```json
{
  "name": "getOpenid",
  "version": "1.0.0",
  "description": "获取用户 openid",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

#### 步骤 5：上传部署

1. 右键点击 `getOpenid` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

#### 步骤 6：重复创建其他云函数

对以下云函数重复步骤 2-5：
- `checkContent`
- `item`
- `admin`

## 云函数代码参考

### checkContent/index.js

```javascript
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { type, content } = event;

  try {
    if (type === 'text') {
      const result = await cloud.openapi.security.msgSecCheck({
        content: content
      });
      return result;
    } else if (type === 'image') {
      const result = await cloud.openapi.security.imgSecCheck({
        media: {
          contentType: 'image/png',
          value: content
        }
      });
      return result;
    }
  } catch (err) {
    console.error('内容安全检测失败', err);
    return {
      errCode: -1,
      errMsg: err.message
    };
  }
};
```

### item/index.js

（代码较长，请参考项目中的 `cloudfunctions/item/index.js` 文件）

### admin/index.js

（代码较长，请参考项目中的 `cloudfunctions/admin/index.js` 文件）

## 验证部署成功

部署完成后：

1. 点击"云开发" → "云函数"
2. 查看4个云函数是否都显示在列表中
3. 点击每个云函数，查看是否有部署记录
4. 在小程序中测试功能

## 常见问题

### Q: 为什么云函数目录不被识别？

A: 可能的原因：
1. 云开发环境未正确开通
2. 项目配置文件未正确加载
3. 微信开发者工具版本问题

### Q: 如何确认云开发环境已开通？

A: 点击"云开发"按钮，如果能看到控制台和资源列表，说明已开通。

### Q: 部署失败怎么办？

A: 
1. 检查网络连接
2. 检查云开发环境状态
3. 尝试手动创建云函数
4. 查看控制台错误信息

## 需要帮助？

如果以上方案都无法解决问题，请：
1. 截图错误信息
2. 提供微信开发者工具版本号
3. 提供云开发环境状态截图
