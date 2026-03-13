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
