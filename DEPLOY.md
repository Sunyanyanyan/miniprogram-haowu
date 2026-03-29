# 快速部署指南

## 第一步：配置云开发环境

1. 打开微信开发者工具
2. 点击工具栏的"云开发"按钮
3. 如果还没有环境，点击"创建环境"
4. 输入环境名称（如：secondhand）
5. 等待环境创建完成
6. 复制环境 ID

## 第二步：修改环境 ID

在 `app.js` 第 7 行，将环境 ID 改为你的环境 ID：

```javascript
wx.cloud.init({
  env: '你的环境ID',  // 例如：cloud1-xxx
  traceUser: true,
});
```

## 第三步：部署云函数

### 方法一：通过微信开发者工具部署（推荐）

1. **重新加载项目**
   - 关闭微信开发者工具
   - 重新打开项目
   - 等待项目加载完成

2. **检查云函数目录**
   - 在左侧文件列表中，`cloudfunctions` 文件夹图标应该是云朵形状 ☁️
   - 如果不是云朵形状，说明配置有问题

3. **部署云函数**
   - 展开 `cloudfunctions` 文件夹
   - 右键点击 `getOpenid` 文件夹
   - 选择"上传并部署：云端安装依赖"
   - 等待部署完成（控制台会显示进度）
   - 对其他云函数重复此操作：
     - `checkContent`
     - `item`
     - `admin`

### 方法二：手动部署（如果方法一不行）

1. **安装依赖**
   ```bash
   cd cloudfunctions/getOpenid
   npm install
   cd ../..
   
   cd cloudfunctions/checkContent
   npm install
   cd ../..
   
   cd cloudfunctions/item
   npm install
   cd ../..
   
   cd cloudfunctions/admin
   npm install
   cd ../..
   ```

2. **上传云函数**
   - 在微信开发者工具中
   - 右键点击云函数文件夹
   - 选择"上传并部署：所有文件"

## 第四步：创建数据库集合

1. 点击"云开发"按钮
2. 点击"数据库"
3. 点击"+"创建集合

### 创建 items 集合

1. 集合名称：`items`
2. 点击"确定"
3. 点击"权限设置"
4. 设置权限：
   - **读权限**：所有用户可读
   - **写权限**：仅创建者可写

### 创建 admins 集合

1. 集合名称：`admins`
2. 点击"确定"
3. 点击"权限设置"
4. 设置权限：
   - **读权限**：仅创建者可读写
   - **写权限**：仅创建者可写

## 第五步：测试功能

1. 重新编译小程序
2. 首页应该显示"暂无物品"
3. 点击"录入"标签
4. 尝试登记一个物品
5. 检查是否登记成功

## 第六步：添加管理员（可选）

1. 在云开发控制台，点击"数据库"
2. 打开 `admins` 集合
3. 点击"添加记录"
4. 添加以下字段：
   ```json
   {
     "_openid": "你的openid"
   }
   ```
5. 获取 openid 的方法：
   - 在小程序中打开调试器
   - 在控制台输入：
     ```javascript
     wx.cloud.callFunction({
       name: 'getOpenid'
     }).then(res => {
       console.log(res.result.openid)
     })
     ```
   - 复制输出的 openid

## 常见问题

### 问题1：看不到"上传并部署"选项

**解决方案**：
1. 确认已开通云开发
2. 确认 `project.config.json` 中有 `cloudfunctionRoot: "cloudfunctions/"`
3. 重新加载项目（关闭并重新打开）

### 问题2：云函数部署失败

**解决方案**：
1. 检查网络连接
2. 检查云开发环境是否正常
3. 尝试手动安装依赖后上传

### 问题3：首页一直显示"加载中"

**解决方案**：
1. 检查云函数是否部署成功
2. 检查数据库集合是否创建
3. 检查数据库权限是否设置正确
4. 查看控制台错误信息

### 问题4：登记物品失败

**解决方案**：
1. 检查是否已登录
2. 检查云函数 `item` 是否部署成功
3. 检查数据库权限设置
4. 查看控制台错误信息

## 项目结构

```
miniprogram-1/
├── cloudfunctions/          # 云函数目录
│   ├── getOpenid/          # 获取用户 openid
│   ├── checkContent/       # 内容安全检测
│   ├── item/               # 物品操作
│   └── admin/              # 管理员操作
├── pages/                  # 页面目录
│   ├── home/               # 首页
│   ├── add/               # 登记页
│   ├── mine/               # 我的页
│   ├── detail/             # 详情页
│   └── admin/              # 管理员页
├── app.js                  # 小程序入口
├── app.json                # 小程序配置
└── README.md               # 使用说明
```

## 功能清单

### 用户功能
- ✅ 首页瀑布流展示
- ✅ 关键词搜索
- ✅ 登记物品（最多3张图片）
- ✅ 图片内容安全检测
- ✅ 物品详情查看
- ✅ 信息查看
- ✅ 举报功能
- ✅ 我的登记管理

### 管理员功能
- ✅ 查看所有物品
- ✅ 强制下架/删除
- ✅ 统计数据展示

## 技术支持

如有问题，请查看：
1. 微信官方文档：https://developers.weixin.qq.com/miniprogram/dev/
2. 云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
3. 项目 README.md
