const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action } = event;

  switch (action) {
    case 'checkAdmin':
      return await checkAdmin(openid);
    case 'getAllItems':
      return await getAllItems(openid);
    case 'forceUpdateStatus':
      return await forceUpdateStatus(event, openid);
    case 'forceDelete':
      return await forceDelete(event, openid);
    default:
      return {
        errCode: -1,
        errMsg: '未知操作'
      };
  }
};

async function checkAdmin(openid) {
  try {
    const result = await db.collection('admins')
      .where({
        _openid: openid
      })
      .count();

    return {
      errCode: 0,
      isAdmin: result.total > 0
    };
  } catch (err) {
    console.error('校验管理员失败', err);
    return {
      errCode: -1,
      isAdmin: false
    };
  }
}

async function getAllItems(openid) {
  try {
    const isAdmin = await checkAdmin(openid);
    
    if (!isAdmin.isAdmin) {
      return {
        errCode: -1,
        errMsg: '无权限'
      };
    }

    const result = await db.collection('items')
      .orderBy('createdAt', 'desc')
      .get();

    return {
      errCode: 0,
      errMsg: '查询成功',
      data: result.data
    };
  } catch (err) {
    console.error('查询失败', err);
    return {
      errCode: -1,
      errMsg: '查询失败'
    };
  }
}

async function forceUpdateStatus(event, openid) {
  const { itemId, status } = event;

  try {
    const isAdmin = await checkAdmin(openid);
    
    if (!isAdmin.isAdmin) {
      return {
        errCode: -1,
        errMsg: '无权限'
      };
    }

    const result = await db.collection('items')
      .doc(itemId)
      .update({
        data: {
          status,
          updatedAt: db.serverDate()
        }
      });

    return {
      errCode: 0,
      errMsg: '更新成功',
      data: result
    };
  } catch (err) {
    console.error('更新失败', err);
    return {
      errCode: -1,
      errMsg: '更新失败'
    };
  }
}

async function forceDelete(event, openid) {
  const { itemId } = event;

  try {
    const isAdmin = await checkAdmin(openid);
    
    if (!isAdmin.isAdmin) {
      return {
        errCode: -1,
        errMsg: '无权限'
      };
    }

    const item = await db.collection('items').doc(itemId).get();

    if (item.data.images && item.data.images.length > 0) {
      await cloud.deleteFile({
        fileList: item.data.images
      });
    }

    await db.collection('items').doc(itemId).remove();

    return {
      errCode: 0,
      errMsg: '删除成功'
    };
  } catch (err) {
    console.error('删除失败', err);
    return {
      errCode: -1,
      errMsg: '删除失败'
    };
  }
}
