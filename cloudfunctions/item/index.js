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
    case 'report':
      return await reportItem(event);
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
  const tag = event.tag || '其他';
  const value = event.value || 0;

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
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return {
      errCode: 0,
      errMsg: '发布成功',
      data: result
    };
  } catch (err) {
    console.error('发布失败', err);
    return {
      errCode: -1,
      errMsg: '发布失败'
    };
  }
}

async function getItemList(event) {
  const page = event.page || 0;
  const pageSize = event.pageSize || 10;
  const keyword = event.keyword;
  const tag = event.tag;

  try {
    let condition = {
      status: 'on'
    };

    if (tag && tag !== '全部') {
      condition.tag = tag;
    }

    let query = db.collection('items').where(condition);

    if (keyword) {
      const dbCmd = db.command;
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

    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
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
    const result = await db.collection('items')
      .where({
        _id: itemId,
        _openid: openid
      })
      .update({
        data: {
          status: status,
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

async function reportItem(event) {
  return {
    errCode: 0,
    errMsg: '举报成功'
  };
}
