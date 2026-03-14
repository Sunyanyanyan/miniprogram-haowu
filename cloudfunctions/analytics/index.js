const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, data } = event;

  const isAdminResult = await checkAdmin(openid);
  if (isAdminResult.isAdmin) {
    return { errCode: 0, msg: '管理员不记录埋点' };
  }

  switch (action) {
    case 'pageView':
      return await recordPageView(openid, data);
    case 'click':
      return await recordClick(openid, data);
    case 'getStats':
      return await getStats(openid);
    default:
      return { errCode: -1, errMsg: '未知操作' };
  }
};

async function checkAdmin(openid) {
  try {
    const result = await db.collection('admins')
      .where({ _openid: openid })
      .count();
    return { isAdmin: result.total > 0 };
  } catch (err) {
    return { isAdmin: false };
  }
}

async function recordPageView(openid, data) {
  const { page } = data;
  try {
    const today = getTodayStr();
    await db.collection('analytics').add({
      data: {
        type: 'pageView',
        page: page,
        openid: openid,
        date: today,
        createdAt: db.serverDate()
      }
    });
    return { errCode: 0 };
  } catch (err) {
    return { errCode: -1, errMsg: '记录失败' };
  }
}

async function recordClick(openid, data) {
  const { page, button } = data;
  try {
    const today = getTodayStr();
    await db.collection('analytics').add({
      data: {
        type: 'click',
        page: page,
        button: button,
        openid: openid,
        date: today,
        createdAt: db.serverDate()
      }
    });
    return { errCode: 0 };
  } catch (err) {
    return { errCode: -1, errMsg: '记录失败' };
  }
}

async function getStats(openid) {
  try {
    const isAdminResult = await checkAdmin(openid);
    if (!isAdminResult.isAdmin) {
      return { errCode: -1, errMsg: '无权限' };
    }

    const result = await db.collection('analytics').get();
    const records = result.data;

    const pageViewStats = {};
    const clickStats = {};
    const dailyStats = {};

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const key = record.page + '_' + (record.button || 'pageView');

      if (record.type === 'pageView') {
        const pageKey = record.page;
        if (!pageViewStats[pageKey]) {
          pageViewStats[pageKey] = 0;
        }
        pageViewStats[pageKey]++;
      }

      if (record.type === 'click') {
        const clickKey = record.page + '_' + record.button;
        if (!clickStats[clickKey]) {
          clickStats[clickKey] = 0;
        }
        clickStats[clickKey]++;
      }

      if (!dailyStats[record.date]) {
        dailyStats[record.date] = { pageView: 0, click: 0 };
      }
      if (record.type === 'pageView') {
        dailyStats[record.date].pageView++;
      } else {
        dailyStats[record.date].click++;
      }
    }

    return {
      errCode: 0,
      data: {
        pageViewStats: pageViewStats,
        clickStats: clickStats,
        dailyStats: dailyStats,
        totalRecords: records.length
      }
    };
  } catch (err) {
    return { errCode: -1, errMsg: '查询失败' };
  }
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
