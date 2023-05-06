//官方弹幕函数| qq
$.exports.TXdm = function (realurl) {
    if (getItem('TX_from_' + MY_RULE.title, '') == realurl) {
        return 'hiker://files/dm盒子/' + 'TX_from_' + MY_RULE.title + '.xml';
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
        // 字体大小
        var size = JSON.parse(readFile('hiker://files/dm盒子/settings.json')).fontSize;
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
                    for (let i = 0; i < danmuData.length; i++) {
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
                        tempdata = `<d p="${Math.round(timepoint)},${ct},${size},${color},0">${content}</d>\n`
                        data += tempdata;
                    }
                } catch (e) {
                    log('不知缘由的异常，直接跳过')
                }
            }
        });
        // 最终待写入的弹幕数据
        danmustr = `<?xml version="1.0" encoding="UTF-8"?>\n<i>\n${data}</i>`;
        // 写入弹幕
        dm = 'hiker://files/dm盒子/' + 'TX_from_' + MY_RULE.title + '.xml';
        saveFile(dm, danmustr);
        setItem('TX_from_' + MY_RULE.title, realurl);
        putVar('dm_share', dm);
        return dm;
    } catch (e) {
        log('出错了')
        showLoading('天呐撸，获取失败了呢！');
        return 'hiker://files/dm盒子/' + 'TX_from_' + MY_RULE.title + '.xml';
    }
}

// 官方API|bili
$.exports.bilidm = function (realurl) {
    function overrideSave(dm) {
        var danmuData = request(dm);
        var size = JSON.parse(readFile('hiker://files/dm盒子/settings.json')).fontSize;
        var data = '';
        td = pdfa(danmuData, 'i&&d');
        for (let i = 0; i < td.length; i++) {
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


    if (getItem('bili_from_' + MY_RULE.title, '') == realurl) {
        return 'hiker://files/dm盒子/' + 'bili_from_' + MY_RULE.title + '.xml';
    }
    try {
        var epid, data, cid;
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
            dm = 'hiker://files/dm盒子/' + 'bili_from_' + MY_RULE.title + '.xml';
            downloadFile(file, dm);
            overrideSave(dm);
            setItem('bili_from_' + MY_RULE.title, realurl);
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
            dm = 'hiker://files/dm盒子/' + 'bili_from_' + MY_RULE.title + '.xml';
            downloadFile(file, dm);
            overrideSave(dm);
            setItem('bili_from_' + MY_RULE.title, realurl);
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
            dm = 'hiker://files/dm盒子/' + 'bili_from_' + MY_RULE.title + '.xml';
            downloadFile(file, dm);
            overrideSave(dm);
            setItem('bili_from_' + MY_RULE.title, realurl);
            putVar('dm_share', dm);
        }
        return dm;
    } catch (e) {
        log('出错了')
        showLoading('天呐撸，获取失败了呢！');
        return 'hiker://files/dm盒子/' + 'bili_from_' + MY_RULE.title + '.xml';
    }
}

//官方弹幕函数| mgtv
$.exports.MGdm = function (realurl) {
    if (getItem('Mg_from_' + MY_RULE.title, '') == realurl) {
        return 'hiker://files/dm盒子/' + 'Mg_from_' + MY_RULE.title + '.xml';
    }
    try {
        var vid = realurl.split('/')[5].split('.html')[0];
        var cid = realurl.split('/')[4];
        var fileNum = 0;
        var data = ''
        // 字体大小
        var size = JSON.parse(readFile('hiker://files/dm盒子/settings.json')).fontSize;
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
                for (let i = 0; i < danmu.length; i++) {
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
                for (let i = 0; i < danmu.length; i++) {
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
        dm = 'hiker://files/dm盒子/' + 'Mg_from_' + MY_RULE.title + '.xml';
        saveFile(dm, danmustr);
        setItem('Mg_from_' + MY_RULE.title, realurl);
        putVar('dm_share', dm);
        return dm;
    } catch (e) {
        log('出错了')
        showLoading('天呐撸，获取失败了呢！');
        return 'hiker://files/dm盒子/' + 'Mg_from_' + MY_RULE.title + '.xml';
    }
}
