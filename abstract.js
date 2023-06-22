//官方弹幕函数| qq
$.exports.TXdm = function (realurl) {
    filePath = 'hiker://files/cache/danmu/' + 'TX_from_' + getPageTitle() + '.xml';
    // 字体大小、弹幕步长、解析记录
    var danmuSetting = JSON.parse(readFile('hiker://files/dm盒子/settings.json'));
    var size = danmuSetting.fontSize;
    var step = danmuSetting.step;
    var history = danmuSetting.history;
    if (history['TX_from_' + getPageTitle()] == realurl && fileExist(filePath)) {
        dm = filePath;
        putVar('dm_share', dm);
        return dm;
    }
    try {
        var vid;
        // 适配PC端链接（豆瓣电视剧通用）
        try {
            vid = realurl.split('.html')[0].split('/').pop();
            log(vid);
        } catch (e) {
            // 携带vid参数的移动端链接
            vid = realurl.split('=')[1];
        }
        var data = '';
        // 弹幕样式
        var ct = 1;
        try {
            danmuData = JSON.parse(fetch('https://dm.video.qq.com/barrage/base/' + vid, {
                headers: {
                    'User-Agent': PC_UA,
                    "Referer": "https://v.qq.com/"
                },
                method: "GET"
            })).segment_index;
        } catch (e) {
            // 聚影、豆瓣、搜狗等腾讯电影链接
            log('vid参数错误,现将其视为cid重新获取');
            data = request('https://pbaccess.video.qq.com/trpc.videosearch.search_cgi.http/load_playsource_list_info?pageNum=0&id=' + vid + '&dataType=2&pageContext=need_async%3Dtrue&scene=2&platform=2&appId=10718&site=qq&vappid=34382579&vsecret=e496b057758aeb04b3a2d623c952a1c47e04ffb0a01e19cf&g_tk=&g_vstk=&g_actk=');
            vid = JSON.parse(data).data.normalList.itemList[0].videoInfo.firstBlockSites[0].episodeInfoList[0].id;
            log('真实vid:' + vid);
            danmuData = JSON.parse(fetch('https://dm.video.qq.com/barrage/base/' + vid, {
                headers: {
                    'User-Agent': PC_UA,
                    "Referer": "https://v.qq.com/"
                },
                method: "GET"
            })).segment_index;
        }
        url = [];
        for (var prop in danmuData) {
            url.push({
                url: 'https://dm.video.qq.com/barrage/segment/' + vid + '/' + danmuData[prop].segment_name
            });
        }
        batchFetch(url).map(function (a) {
            danmuData = JSON.parse(a).barrage_list;
            // 弹幕为空
            if (JSON.stringify(danmuData) === '[]') {
                log('此页为空');
            } else {
                try {
                    for (let i = 0; i < danmuData.length; i += step) {
                        // 弹幕发送时间
                        timepoint = danmuData[i].time_offset / 1000;
                        // 弹幕颜色(默认)
                        color = 16777215;
                        if (danmuData[i].content_style != '') {
                            colorHex = danmuData[i].content_style.match(/\["[\S\s]+(?=",")/)[0].replace('["', '');
                            color = parseInt(colorHex, 16);
                        }
                        // 弹幕内容
                        content = danmuData[i].content;
                        if (content.indexOf('<') != -1 || content.indexOf('>') != -1 || content.indexOf('&') != -1 || content.indexOf('\u0000') != -1 || content.indexOf('\b') != -1) {
                            continue;
                        }
                        tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`;
                        data += tempdata;
                    }
                } catch (e) {
                    log('不知缘由的异常，直接跳过:' + e)
                }
            }
        });
        // 最终待写入的弹幕数据
        danmustr = `<?xml version="1.0" encoding="UTF-8"?>\n<i>\n${data}</i>`;
        // 写入弹幕
        dm = 'hiker://files/cache/danmu/' + 'TX_from_' + getPageTitle() + '.xml';
        saveFile(dm, danmustr);
        history['TX_from_' + getPageTitle()]=realurl;
        saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
        putVar('dm_share', dm);
        return dm;
    } catch (e) {
        log('出错了：' + e);
        showLoading('天呐撸，获取失败了呢！');
        // return 'hiker://files/cache/danmu/' + 'TX_from_' + getPageTitle() + '.xml';
        return false;
    }
}

// 官方API|bili
$.exports.bilidm = function (realurl) {
    function overrideSave(dm, size, step) {
        var danmuData = request(dm);
        var data = '';
        td = pdfa(danmuData, 'i&&d');
        for (let i = 0; i < td.length; i += step) {
            timepoint = pdfh(td[i], 'd&&p').split(",")[0];
            ct = pdfh(td[i], 'd&&p').split(",")[1];
            color = pdfh(td[i], 'd&&p').split(",")[3];
            // 弹幕内容
            content = pdfh(td[i], 'd&&Text');
            if (content.indexOf('<') != -1 || content.indexOf('>') != -1 || content.indexOf('&') != -1 || content.indexOf('\u0000') != -1 || content.indexOf('\b') != -1) {
                continue;
            }
            tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`;
            data += tempdata;
        }
        danmustr = `<?xml version="1.0" encoding="UTF-8"?>\n<i>\n${data}</i>`;
        saveFile(dm, danmustr);
    }

    filePath = 'hiker://files/cache/danmu/' + 'bili_from_' + getPageTitle() + '.xml';
    // 字体大小、弹幕步长、解析记录
    var danmuSetting = JSON.parse(readFile('hiker://files/dm盒子/settings.json'));
    var size = danmuSetting.fontSize;
    var step = danmuSetting.step;
    var history = danmuSetting.history;
    if (history['bili_from_' + getPageTitle()] == realurl && fileExist(filePath)) {
        dm = filePath;
        putVar('dm_share', dm);
        return dm;
    }
    try {
        var epid, data, cid, dm;
        if (realurl.match(/ep/)) {
            epid = realurl.split('ep')[1].split('?')[0];
            fetch_url = "https://api.bilibili.com/pgc/view/web/season?ep_id=" + epid;
        } else if (realurl.match(/av/)) {
            // aid最小单位-单集
            aid = realurl.split('av')[1].split('?')[0];
            log('aid:' + aid);
            fetch_url = "https://api.bilibili.com/x/web-interface/view?aid=" + aid;
            cid = JSON.parse(fetch(fetch_url, {
                "headers": {
                    "User-Agent": PC_UA
                },
                "referrer": realurl,
                "method": "GET",
            })).data.cid;
            file = 'https://comment.bilibili.com/' + cid + '.xml';
            dm = 'hiker://files/cache/danmu/' + 'bili_from_' + getPageTitle() + '.xml';
            downloadFile(file, dm);
            overrideSave(dm, size, step);
            history['bili_from_' + getPageTitle()]=realurl;
            saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
            putVar('dm_share', dm);
            return dm;
        } else if (realurl.match(/ss|md/)) {
            if (realurl.match(/ss/)) {
                // 采集到的ss链接多半就是电影，season_id也能代表单集对其处理
                season_id = realurl.split('ss')[1].split('?')[0];
                log('season_id:' + season_id);
            } else {
                // 由番剧md查询season_id，再经同样逻辑处理（当做单集处理-未验证）
                md = realurl.split('md')[1].split('?')[0];
                log('md:' + md);
                fetch_url = "https://api.bilibili.com/pgc/review/user?media_id=" + epid;
                season_id = JSON.parse(fetch(fetch_url, {
                    "headers": {
                        "User-Agent": PC_UA
                    },
                    "referrer": realurl,
                    "method": "GET",
                })).result.media.season_id;
            }
            fetch_url = 'https://api.bilibili.com/pgc/web/season/section?season_id=' + season_id;
            cid = JSON.parse(fetch(fetch_url, {
                "headers": {
                    "User-Agent": PC_UA
                },
                "referrer": realurl,
                "method": "GET",
            })).result.main_section.episodes[0].cid
            file = 'https://comment.bilibili.com/' + cid + '.xml';
            dm = 'hiker://files/cache/danmu/' + 'bili_from_' + getPageTitle() + '.xml';
            downloadFile(file, dm);
            overrideSave(dm, size, step);
            history['bili_from_' + getPageTitle()]=realurl;
            saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
            putVar('dm_share', dm);
            return dm;
        }
        data = JSON.parse(fetch(fetch_url, {
            "headers": {
                "User-Agent": PC_UA
            },
            "referrer": realurl,
            "method": "GET",
        }));
        try {
            data.result.episodes.forEach(ep => {
                if (ep.link == realurl) {
                    cid = (ep.cid).toString();
                    //break;
                    throw Error()
                }
            });
        } catch (e) {
            file = 'https://comment.bilibili.com/' + cid + '.xml';
            dm = 'hiker://files/cache/danmu/' + 'bili_from_' + getPageTitle() + '.xml';
            downloadFile(file, dm);
            overrideSave(dm, size, step);
            history['bili_from_' + getPageTitle()]=realurl;
            saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
            putVar('dm_share', dm);
        }
        return dm;
    } catch (e) {
        log('出错了：' + e);
        showLoading('天呐撸，获取失败了呢！');
        // return 'hiker://files/cache/danmu/' + 'bili_from_' + getPageTitle() + '.xml';
        return false;
    }
}

//官方弹幕函数| mgtv
$.exports.MGdm = function (realurl) {
    filePath = 'hiker://files/cache/danmu/' + 'Mg_from_' + getPageTitle() + '.xml';
    // 字体大小、弹幕步长、解析记录
    var danmuSetting = JSON.parse(readFile('hiker://files/dm盒子/settings.json'));
    var size = danmuSetting.fontSize;
    var step = danmuSetting.step;
    var history = danmuSetting.history;
    if (history['Mg_from_' + getPageTitle()] == realurl && fileExist(filePath)) {
        dm = filePath;
        putVar('dm_share', dm);
        return dm;
    }
    try {
        var vid = realurl.split('/')[5].split('.html')[0];
        var cid = realurl.split('/')[4];
        var fileNum = 0;
        var data = ''
        // 容错处理
        var errNum = 0;
        danmuFrom = JSON.parse(fetch(`https://galaxy.bz.mgtv.com/getctlbarrage?version=3.0.0&vid=${vid}&abroad=0&pid=0&os=&uuid=&deviceid=2cc092cb-f9df-4f4f-a1ce-33c7fe3575cf&cid=393717&ticket=&mac=&platform=0&appVersion=3.0.0&reqtype=form-post&callback=jsonp_1658216873648_19074&allowedRC=1`, {
            headers: {
                'User-Agent': PC_UA,
                'Referer': realurl
            },
            method: 'GET'
        }).match(/{[\S\s]+}/)).data.cdn_version;
        // DVD、电影、少部分剧集
        if (danmuFrom == undefined) {
            var time = 0;
            while (true) {
                // 请求弹幕
                try {
                    danmuData = JSON.parse(fetch(`https://galaxy.bz.mgtv.com/cdn/opbarrage?version=3.0.0&vid=${vid}&abroad=0&pid=0&os=&uuid=&deviceid=2cc092cb-f9df-4f4f-a1ce-33c7fe3575cf&cid=${cid}&ticket=&mac=&platform=0&time=${time}&device=0&allowedRC=1&appVersion=3.0.0&reqtype=form-post&callback=jsonp_1658459178998_5150&allowedRC=1`, {
                        headers: {
                            'User-Agent': PC_UA,
                            'Referer': realurl
                        },
                        method: 'GET'
                    }).match(/{[\S\s]+}/)).data;
                } catch (e) {
                    log('请求失败');
                    break;
                }
                danmu = danmuData.items;
                // 直至弹幕为空——真的是，如果弹幕太少导致某一页没有数据那岂不是误杀？？？给他个允许(连续)空值的最大次数吧。。
                if (danmu == null) {
                    errNum += 1;
                    if (errNum > 2) {
                        break;
                    } else {
                        continue;
                    }
                }
                // 如果能获取到数据就将空值次数清0，保证错误空值是连续的，尽可能避免误杀
                errNum = 0;
                for (let i = 0; i < danmu.length; i += step) {
                    // 弹幕发送时间
                    timepoint = danmu[i].time / 1000;
                    // 弹幕样式
                    ct = 1;
                    if (danmu[i].v2_position) {
                        // 顶端弹幕
                        ct = 5;
                    }
                    // 弹幕颜色(默认)
                    color = 16777215;
                    // 颜色设置——可自行修改替换left为right(原来是左右渐变的颜色，但xml格式本身并不支持，所以二选一吧，left一般颜色比较深，right一般颜色比较浅)
                    if (danmu[i].v2_color) {
                        color = (danmu[i].v2_color.color_left.r << 16) + (danmu[i].v2_color.color_left.g << 8) + (danmu[i].v2_color.color_left.b);
                    }
                    // 弹幕内容
                    content = danmu[i].content;
                    if (content.indexOf('<') != -1 || content.indexOf('>') != -1 || content.indexOf('&') != -1 || content.indexOf('\u0000') != -1 || content.indexOf('\b') != -1) {
                        continue;
                    }
                    tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`
                    data += tempdata;
                }
                time = danmuData.next;
            }
        } else {
            // 一般剧集和综艺
            while (true) {
                // 请求弹幕
                try {
                    danmuData = JSON.parse(fetch(`https://bullet-ws.hitv.com/${danmuFrom}/${fileNum}.json`, {
                        headers: {
                            'User-Agent': PC_UA,
                            'Referer': realurl
                        },
                        method: 'GET'
                    })).data;
                } catch (e) {
                    log('弹幕数据获取完毕');
                    break;
                }
                danmu = danmuData.items;
                if (danmu == null) {
                    log('这一页没有数据');
                    // 差点忘记加1了，死循环要崩溃~
                    fileNum += 1;
                    continue;
                }
                for (let i = 0; i < danmu.length; i += step) {
                    // 弹幕发送时间
                    timepoint = danmu[i].time / 1000;
                    // 弹幕样式
                    ct = 1;
                    if (danmu[i].v2_position) {
                        // 顶端弹幕
                        ct = 5;
                    }
                    // 弹幕颜色(默认)
                    color = 16777215;
                    // 颜色设置——可自行修改替换left为right(原来是左右渐变的颜色，但xml格式本身并不支持，所以二选一吧，left一般颜色比较深，right一般颜色比较浅)
                    if (danmu[i].v2_color) {
                        color = (danmu[i].v2_color.color_left.r << 16) + (danmu[i].v2_color.color_left.g << 8) + (danmu[i].v2_color.color_left.b);
                    }
                    // 弹幕内容
                    content = danmu[i].content;
                    if (content.indexOf('<') != -1 || content.indexOf('>') != -1 || content.indexOf('&') != -1 || content.indexOf('\u0000') != -1 || content.indexOf('\b') != -1) {
                        continue;
                    }
                    tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`
                    data += tempdata;
                }
                fileNum += 1;
            }
        }

        // 最终待写入的弹幕数据
        danmustr = `<?xml version="1.0" encoding="UTF-8"?>\n<i>\n${data}</i>`;
        // 写入弹幕
        dm = 'hiker://files/cache/danmu/' + 'Mg_from_' + getPageTitle() + '.xml';
        saveFile(dm, danmustr);
        history['Mg_from_' + getPageTitle()]=realurl;
        saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
        putVar('dm_share', dm);
        return dm;
    } catch (e) {
        log('出错了')
        showLoading('天呐撸，获取失败了呢！');
        // return 'hiker://files/cache/danmu/' + 'Mg_from_' + getPageTitle() + '.xml';
        return false;
    }
}

//官方弹幕函数| YK
$.exports.YKdm = function (realurl) {
    const parseCookie = (cookieStr) => {
        const cookies = {};
        cookieStr.split(";").forEach((cookie) => {
            const parts = cookie.split("=");
            const key = parts[0].trim();
            const value = parts[1] ? decodeURIComponent(parts[1].trim()) : "";
            cookies[key] = value;
        }
        );
        return cookies;
    }

    const get_tk_enc = () => {
        const api_url = "https://acs.youku.com/h5/mtop.com.youku.aplatform.weakget/1.0/?jsv=2.5.1&appKey=24679788";
        let cookies = undefined;
        while (cookies === undefined) {
            cookies = JSON.parse(fetchCookie(api_url, { headers: { "content-type": "application/json" }, body: "", method: "GET" }));
        }
        let targetCookie = {};
        for (let cookieStr of cookies) {
            targetCookie = Object.assign(targetCookie, parseCookie(cookieStr));
        }
        return targetCookie;
    }

    const get_cna = () => {
        const api_url = "https://log.mmstat.com/eg.js";
        cookies = JSON.parse(fetchCookie(api_url, { headers: { "content-type": "application/json" }, body: "", method: "GET" }));
        let targetCookie = {};
        for (let cookieStr of cookies) {
            targetCookie = Object.assign(targetCookie, parseCookie(cookieStr));
        }
        return targetCookie["cna"];
    }

    const yk_msg_sign = (msg) => {
        return md5(msg + "MkmC9SoIw6xCkSKHhJ7b5D2r51kBiREr");
    }

    const yk_t_sign = (token, t, appkey, data) => {
        const text = [token, t, appkey, data].join("&");
        return md5(text);
    }

    const get_vinfos_by_video_id = (url) => {
        const pathSegments = url.split("/");
        const video_id = pathSegments[pathSegments.length - 1].split(".")[0].slice(3);
        if (video_id) {
            const api_url = "https://openapi.youku.com/v2/videos/show.json";
            const params = { client_id: "53e6cc67237fc59a", video_id: video_id, package: "com.huawei.hwvplayer.youku", ext: "show" };
            const res = JSON.parse(request(buildUrl(api_url, params)));
            const duration = res.duration;
            return [video_id, duration];
        }
    }

    const resolve = (url) => {
        filePath = 'hiker://files/cache/danmu/' + 'YK_from_' + getPageTitle() + '.xml';
        // 字体大小、弹幕步长、解析记录
        var danmuSetting = JSON.parse(readFile('hiker://files/dm盒子/settings.json'));
        var size = danmuSetting.fontSize;
        var step = danmuSetting.step;
        var history = danmuSetting.history;
        if (history['YK_from_' + getPageTitle()] == url && fileExist(filePath)) {
            dm = filePath;
            putVar('dm_share', dm);
            return dm;
        }
        const cna = get_cna();
        const tk_enc = get_tk_enc();
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": "_m_h5_tk=" + tk_enc["_m_h5_tk"] + ";_m_h5_tk_enc=" + tk_enc["_m_h5_tk_enc"] + ";",
            "Referer": "https://v.youku.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36"
        };
        const [vid, duration] = get_vinfos_by_video_id(url);
        const max_mat = Math.floor(duration / 60) + 1;
        var xmlData = '';
        // 弹幕样式
        var ct = 1;
        const api_url = "https://acs.youku.com/h5/mopen.youku.danmu.list/1.0/";
        try {
            for (let mat = 0; mat < max_mat; mat++) {
                let msg = { "ctime": Date.now(), "ctype": 10004, "cver": "v1.0", "guid": cna, "mat": mat, "mcount": 1, "pid": 0, "sver": "3.1.0", "type": 1, "vid": vid };
                let str = JSON.stringify(msg);
                let msg_b64encode = base64Encode(str);
                msg["msg"] = msg_b64encode;
                msg["sign"] = yk_msg_sign(msg_b64encode);
                let data = JSON.stringify(msg);
                // const t = Date.now();有毒，海阔上会得到一个科学计数法表示的时间
                let t = Date.now() + "";
                let params = {
                    "jsv": "2.5.6",
                    "appKey": "24679788",
                    "t": t,
                    "sign": yk_t_sign(tk_enc["_m_h5_tk"].slice(0, 32), t, "24679788", data),
                    "api": "mopen.youku.danmu.list",
                    "v": "1.0",
                    "type": "originaljson",
                    "dataType": "jsonp",
                    "timeout": "20000",
                    "jsonpIncPrefix": "utility"
                };
                let tempLink = buildUrl(api_url, params);
                let res = post(tempLink,
                    {
                        body: { "data": data },
                        headers: headers
                    }
                );
                danmuInfo = JSON.parse(res).data.result;
                if (danmuInfo.code === '-1') {
                    continue;
                }
                danmuData = JSON.parse(danmuInfo).data.result;
                for (let i = 0; i < danmuData.length; i += step) {
                    // 弹幕发送时间
                    timepoint = danmuData[i].playat / 1000;
                    // 弹幕颜色(默认)
                    color = 16777215;
                    propertis = JSON.parse(danmuData[i].propertis);
                    if (propertis.color) {
                        color = propertis.color;
                    }
                    // 弹幕内容
                    content = danmuData[i].content;
                    if (content.indexOf('<') != -1 || content.indexOf('>') != -1 || content.indexOf('&') != -1 || content.indexOf('\u0000') != -1 || content.indexOf('\b') != -1) {
                        continue;
                    }
                    tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`;
                    // log(tempdata);
                    xmlData += tempdata;
                }
            }
            // 最终待写入的弹幕数据
            danmustr = `<?xml version="1.0" encoding="UTF-8"?>\n<i>\n${xmlData}</i>`;
            // 写入弹幕
            dm = 'hiker://files/cache/danmu/' + 'YK_from_' + getPageTitle() + '.xml';
            saveFile(dm, danmustr);
            history['YK_from_' + getPageTitle()]=url;
            saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
            putVar('dm_share', dm);
            return dm;
        } catch (e) {
            log('出错了：' + e);
            showLoading('天呐撸，获取失败了呢！');
            return false;
        }
    }
    resolve(realurl);
}

//官方弹幕函数| QY  极慢
$.exports.QYdm = function (realurl) {
    // m:s转换s
    const time_to_second = (time) => {
        let t = time.split(":");
        let s = 0;
        let m = 1;
        while (t.length > 0) {
            s += m * parseInt(t.pop(), 10);
            m *= 60;
        }
        return s;
    }
    const extract = (xml, tag) => {
        const reg = new RegExp(`<${tag}>(.*?)</${tag}>`, "g");
        const matches = xml.match(reg);
        if (!matches) {
            return [];
        }
        const res = matches.map(x => x.substring(tag.length + 2, x.length - tag.length - 3));
        return res;
    }
    // 引入解压库pako
    var p = $.require("pako?rule=dm盒子");
    const resolve = (url) => {
        filePath = 'hiker://files/cache/danmu/' + 'QY_from_' + getPageTitle() + '.xml';
        // 字体大小、弹幕步长、解析记录
        var danmuSetting = JSON.parse(readFile('hiker://files/dm盒子/settings.json'));
        var size = danmuSetting.fontSize;
        var step = danmuSetting.step;
        var history = danmuSetting.history;
        if (history['QY_from_' + getPageTitle()] == url && fileExist(filePath)) {
            dm = filePath;
            putVar('dm_share', dm);
            return dm;
        }
        var xmlData = '';
        // 弹幕样式
        var ct = 1;
        const data = fetchPC(url);
        let result = data.match(/window.Q.PageInfo.playPageInfo=(.*);/);
        let page_info = JSON.parse(result[1]);
        let duration = time_to_second(page_info.duration);
        let albumid = page_info.albumId;
        let tvid = page_info.tvId.toString();
        let categoryid = page_info.cid;
        //一页5分钟
        let page = Math.round(duration / (60 * 5));
        let params = {
            rn: "0.0123456789123456",
            business: "danmu",
            is_iqiyi: "true",
            is_video_page: "true",
            tvid: tvid,
            albumid: albumid,
            categoryid: categoryid,
            qypid: "01010021010000000000"
        };
        try {
            for (let i = 0; i < page; i++) {
                showLoading(`进度：${i}/${page}`);
                let api_url = `https://cmts.iqiyi.com/bullet/${tvid.slice(-4, -2)}/${tvid.slice(-2)}/${tvid}_300_${i + 1}.z`;
                let tempLink = buildUrl(api_url, params);
                let res = fetch(tempLink, { toHex: true });
                let binData = hexToBytes(res);
                let xml = pako.inflate(binData, { to: "string" });
                let danmaku = extract(xml, "content");
                let showTime = extract(xml, "showTime");
                let colors = extract(xml, "color");
                for (let i = 0; i < danmaku.length; i += step) {
                    // 弹幕发送时间
                    timepoint = showTime[i];
                    // 弹幕颜色(默认)
                    color = parseInt(colors[i], 16);
                    // 弹幕内容
                    content = danmaku[i];
                    if (content.indexOf('<') != -1 || content.indexOf('>') != -1 || content.indexOf('&') != -1 || content.indexOf('\u0000') != -1 || content.indexOf('\b') != -1) {
                        continue;
                    }
                    tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`;
                    xmlData += tempdata;
                }
            }
            // 最终待写入的弹幕数据
            danmustr = `<?xml version="1.0" encoding="UTF-8"?>\n<i>\n${xmlData}</i>`;
            // 写入弹幕
            dm = 'hiker://files/cache/danmu/' + 'QY_from_' + getPageTitle() + '.xml';
            saveFile(dm, danmustr);
            history['QY_from_' + getPageTitle()]=url;
            saveFile('hiker://files/dm盒子/settings.json', JSON.stringify(danmuSetting));
            putVar('dm_share', dm);
            return dm;
        } catch (e) {
            log('出错了：' + e);
            showLoading('天呐撸，获取失败了呢！');
            return false;
        }
    };
    resolve(realurl);
}
