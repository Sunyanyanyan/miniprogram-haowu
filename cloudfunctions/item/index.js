const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action;

  switch (action) {
    case 'create':
      return await createItem(event, openid);
    case 'getList':
      return await getItemList(event);
    case 'getMyList':
      return await getMyItemList(openid);
    case 'getDetail':
      return await getItemDetail(event, openid);
    case 'update':
      return await updateItem(event, openid);
    case 'updateStatus':
      return await updateItemStatus(event, openid);
    case 'delete':
      return await deleteItem(event, openid);
    default:
      return {
        errCode: -1,
        errMsg: '未知操作'
      };
  }
};

async function createItem(event, openid) {
  const title = event.title;
  const desc = event.desc;
  const contact = event.contact;
  const images = event.images;
  const tag = event.tag || '其它';
  const value = event.value || 0;
  const expireAt = event.expireAt || null;
  const expireDays = event.expireDays || 365;

  try {
    const result = await db.collection('items').add({
      data: {
        _openid: openid,
        title: title,
        desc: desc,
        contact: contact,
        images: images,
        tag: tag,
        value: value,
        status: 'on',
        expireAt: expireAt,
        expireDays: expireDays,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return {
      errCode: 0,
      errMsg: '录入成功',
      data: result
    };
  } catch (err) {
    console.error('录入失败', err);
    return {
      errCode: -1,
      errMsg: '录入失败'
    };
  }
}

async function getItemList(event) {
  const page = event.page || 0;
  const pageSize = event.pageSize || 10;
  const keyword = event.keyword;
  const tag = event.tag;

  try {
    const dbCmd = db.command;
    const now = Date.now();
    
    let condition = {
      status: 'on'
    };

    if (tag && tag !== '全部') {
      condition.tag = tag;
    }

    let query = db.collection('items').where(condition);

    if (keyword) {
      query = query.where(dbCmd.or([
        {
          title: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          desc: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        }
      ]));
    }

    const fetchSize = pageSize * 2;
    const result = await query
      .orderBy('updatedAt', 'desc')
      .skip(page * pageSize)
      .limit(fetchSize)
      .get();

    const filteredData = result.data.filter(function(item) {
      if (!item.expireAt) return true;
      const expireTime = typeof item.expireAt === 'number' ? item.expireAt : new Date(item.expireAt).getTime();
      return expireTime > now;
    });

    const sortedData = filteredData.sort(function(a, b) {
      const aExpire = a.expireAt ? (typeof a.expireAt === 'number' ? a.expireAt : new Date(a.expireAt).getTime()) : Infinity;
      const bExpire = b.expireAt ? (typeof b.expireAt === 'number' ? b.expireAt : new Date(b.expireAt).getTime()) : Infinity;
      
      const aUrgent = aExpire - now < 30 * 60 * 1000;
      const bUrgent = bExpire - now < 30 * 60 * 1000;
      
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      
      return 0;
    });

    const finalData = sortedData.slice(0, pageSize);

    return {
      errCode: 0,
      errMsg: '查询成功',
      data: finalData,
      hasMore: filteredData.length > pageSize
    };
  } catch (err) {
    console.error('查询失败', err);
    return {
      errCode: -1,
      errMsg: '查询失败: ' + (err.message || err.errMsg || '未知错误')
    };
  }
}

async function getMyItemList(openid) {
  try {
    const result = await db.collection('items')
      .where({
        _openid: openid
      })
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

async function getItemDetail(event, openid) {
  const itemId = event.itemId;

  try {
    const result = await db.collection('items').doc(itemId).get();

    return {
      errCode: 0,
      errMsg: '查询成功',
      data: result.data,
      openid: openid
    };
  } catch (err) {
    console.error('查询失败', err);
    return {
      errCode: -1,
      errMsg: '查询失败'
    };
  }
}

async function updateItem(event, openid) {
  const itemId = event.itemId;
  const title = event.title;
  const desc = event.desc;
  const contact = event.contact;
  const images = event.images;
  const tag = event.tag;
  const value = event.value;
  const expireAt = event.expireAt;
  const expireDays = event.expireDays;

  try {
    const item = await db.collection('items').doc(itemId).get();
    
    if (item.data._openid !== openid) {
      return {
        errCode: -1,
        errMsg: '无权限修改'
      };
    }

    const updateData = {
      title: title,
      desc: desc,
      contact: contact,
      images: images,
      updatedAt: db.serverDate()
    };

    if (tag) {
      updateData.tag = tag;
    }

    if (value !== undefined) {
      updateData.value = value;
    }

    if (expireAt !== undefined) {
      updateData.expireAt = expireAt;
    }

    if (expireDays !== undefined) {
      updateData.expireDays = expireDays;
    }

    const result = await db.collection('items')
      .doc(itemId)
      .update({
        data: updateData
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

async function updateItemStatus(event, openid) {
  const itemId = event.itemId;
  const status = event.status;

  try {
    const item = await db.collection('items').doc(itemId).get();
    
    if (item.data._openid !== openid) {
      return {
        errCode: -1,
        errMsg: '无权限操作'
      };
    }

    const updateData = {
      status: status,
      updatedAt: db.serverDate()
    };

    if (status === 'on') {
      const expireDays = item.data.expireDays || 365;
      const now = new Date();
      updateData.expireAt = now.getTime() + expireDays * 24 * 60 * 60 * 1000;
    }

    const result = await db.collection('items')
      .doc(itemId)
      .update({
        data: updateData
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

async function deleteItem(event, openid) {
  const itemId = event.itemId;

  try {
    const item = await db.collection('items').doc(itemId).get();
    
    if (item.data._openid !== openid) {
      return {
        errCode: -1,
        errMsg: '无权限删除'
      };
    }

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
