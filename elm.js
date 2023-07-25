/**
 * @author muzi
 * @name elmck
 * @description elmck同步青龙，查询日志（我用的🐯的）获取收益信息，禁用启用未试验，appck不是不会失效吗？UA改成自己的吧，青龙openapi参考yelc66/98MagnetDownload/main/V2P_Sync_elm_QL.js
 * @rule ^elm$
 * @rule ^(elm)([0-9]+)$
 * @rule ^elmgl$
 * @rule ^elmrz$
 * @rule ^(?=.*cookie2=[^;]+;)(?=.*SID=[^;]+;)(?!.*cookie2=[^;]+;.*cookie2=[^;]+;)(?!.*SID=[^;]+;.*SID=[^;]+;)
 * @version 1.0.0
 * @priority 100001
 * @admin false
 * @origin muzi
 * @disable false
 */
const got = require('got');
const qldb = new BncrDB("elm");
const usrDb = new BncrDB('elmDB');
const AmTool = require("../红灯区/mod/AmTool");


module.exports = async (s) => {
    let qlAuth = '';
    let globalEnv = [];
    const qlHost = await qldb.get("qlHost");
    const ql_client_id = await qldb.get("ql_client_id");
    const ql_client_secret = await qldb.get("ql_client_secret");
    const qlSecret = 'client_id=' + ql_client_id + '&client_secret=' + ql_client_secret;
    const userId = s.getUserId();
    let platform = s.getFrom();
    let param2 = await s.param(2);
    //检查是否有青龙配置
    if (!qlHost || !ql_client_id || !ql_client_secret) {
        if (!await s.isAdmin()) {
            s.reply("未配置青龙面板，请联系管理员配置");
            return;
        }
        s.reply("未配置青龙面板，是否配置？（y/n）");
        const inputA = await s.waitInput(() => { }, 60);
        if (inputA.getMsg() == "N" || inputA.getMsg() == "n") {
            await s.reply("已退出");
            return;
        }
        let urlBody = '';
        s.reply("请输入青龙面板地址：");
        const inputB = await s.waitInput(() => { }, 60);
        const urlinput = inputB.getMsg();
        const urlRegEx = /^https?:\/\/([a-zA-Z0-9-.]+(:[0-9]{1,5})?)(\/)?$/;
        if (urlRegEx.test(urlinput)) {
            // 提取URL主体部分
            let match = urlinput.match(urlRegEx);
            urlBody = match[1];
            s.reply(urlBody);
            console.log(urlBody);
        } else {
            s.reply("输入的地址不是有效的URL或者IP地址,exit。");
            return;
        }
        s.reply("请输入青龙面板ID：");
        const inputC = await s.waitInput(() => { }, 60);
        s.reply("请输入青龙面板密钥：");
        const inputD = await s.waitInput(() => { }, 60);
        await db.set("qlHost", urlBody);
        await db.set("ql_client_id", inputC.getMsg());
        await db.set("ql_client_secret", inputD.getMsg());
        //检查是否配置是否正确
        s.reply("青龙面板配置成功");
        return;
    }
    const input = s.getMsg();
    if (input == "elm") {
        //从elmDB中获取cookie
        let elminfo = await usrDb.get(platform + ':' + userId);
        if (!elminfo) {
            s.reply("未绑定elm账号，请直接发送elmck");
            return;
        }
        let globalEnv = elminfo.elmck;
        await getToken(s);
        //查找账户
        const key = platform + ':' + userId;
        let userInfo = await usrDb.get(key);

        if (userInfo) {
            // 遍历每一个账户，并获取其 elmck
            for (let account of userInfo.accounts) {
                const elmck = account.elmck;
                const username = account.username;
                // 使用得到的 elmck 调用 fetchUserDetail 函数
                await fetchUserDetail(s, elmck, username);

            }
        } else {
            s.reply("elm未绑定");
        }
    } else if (param2) {
        const key = platform + ':' + userId;
        let userInfo = await usrDb.get(key);
        let accountList = userInfo.accounts.map((account, index) => `编号：${index}，账户：${account.username}`).join('\n');
        let accountIndex = parseInt(param2, 10);
        if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= userInfo.accounts.length) {
            s.reply("输入的编号无效");
            return;
        }
        //根据编号拿到对应的username，进行日志查询
        let account = userInfo.accounts[accountIndex]; // 使用索引从账户列表中获取账户
        let username = account.username; // 获取账户的用户名
        await getToken(s);
        await searchlogs(s, 'pingxingsheng_elm_ele_assest_26', username);
    }
    else if (input == "elmgl") {
        accountmanager(s)
    } else if (input == "elmrz") {
        getToken(s);
        //查找账户
        const key = platform + ':' + userId;
        let userInfo = await usrDb.get(key);

        if (userInfo) {
            s.reply("是否运行资产查询任务？（y/n）");
            let userInput = await s.waitInput(() => { }, 60);
            let runTask = userInput.getMsg();

            let taskId = await qlsearchtask(s, "pingxingsheng_elm/ele_assest.js");
            if (runTask != "N" && runTask != "n" && taskId) {
                await qlruntask(s, taskId);
                s.reply("任务运行成功,100s后查询日志");
                await sleep(100000);
            }
            for (let account of userInfo.accounts) {
                const elmck = account.elmck;
                const username = account.username;
                await searchlogs(s, 'pingxingsheng_elm_ele_assest_26', username);
            }
        }
    }

    else {
        const elmck = str(s);
        // 检查 elmck 是否有效（即不为 undefined）
        if (elmck) {
            const username = await testCookie(s, elmck);
            if (username) {
                // 从 usrDb 中获取用户信息
                let userInfo = await usrDb.get(platform + ':' + userId);
                // 如果数据库中没有对应用户信息，则初始化
                if (!userInfo) {
                    userInfo = {
                        accounts: [],
                    };
                }
                // 查找账户
                const existingAccount = userInfo.accounts.find(account => account.elmck === elmck);
                // 添加到青龙中，先检查是否存在，存在则不添加
                await getToken(s);
                let envs = await searchenv(s, 'elmck');
                let existsInQingLong = envs.some(env => env.value == elmck);
                if (existingAccount && existsInQingLong) {
                    // 如果在数据库和青龙环境变量中都存在
                    s.reply(username + "的 cookie 已存在");
                } else {
                    // 如果账户在数据库中不存在
                    if (!existingAccount) {
                        // 将新的 elmck 添加到用户信息中
                        userInfo.accounts.push({ elmck, username });
                        await usrDb.set(platform + ':' + userId, userInfo);
                    }
                    // 如果账户在青龙环境变量中不存在
                    if (!existsInQingLong) {
                        // 将新的 elmck 添加到青龙中
                        await addenv(s, 'elmck', elmck);
                    }
                    // 只有在添加操作执行之后才发送添加成功的消息
                    s.reply(username + '添加成功');
                }
            } else {
                s.reply("提供的 cookie 无效");
            }
        }

    }
    // await getToken(s);
    // await searchenv(s, 'elmqqck')
    // await fetchUserDetail(s);
    // await searchlogs(s);
    //查询青龙接口
    async function getToken() {
        console.log("正在查询青龙接口");
        //s.reply("正在查询青龙接口");
        let url = `http://${qlHost}/open/auth/token?${qlSecret}`
        let body = ``
        let options = populateOptions(url, qlAuth, body);
        console.log(url);
        try {
            const response = await got.get(options);
            console.log(response.body);
            let result = response.body;
            if (result.code == 200) {
                qlAuth = result.data.token;
                ///s.reply(`查询青龙接口成功`);
                console.log(`查询青龙接口成功`);
            } else {
                s.reply(`查询青龙接口失败: ${result.message}`);
                console.log(`查询青龙接口失败: ${result.message}`);
            }
        } catch (error) {
            console.error(error);
            s.reply(`查询青龙接口失败: ${error.message}`);
        }
    }
    function populateOptions(url, auth, body = '') {
        let options = {
            url: url,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            responseType: 'json',
            timeout: 5000,
        }
        if (body) options.body = body;
        if (auth) options.headers.Authorization = 'Bearer ' + auth;
        return options;
    }
    //testCookie
    async function testCookie(s, cookie) {
        const options = {
            method: 'GET',
            url: 'https://restapi.ele.me/eus/v5/user_detail',
            headers: {
                Cookie: cookie,  // 使用参数 cookie 设置 Cookie 头
                'user-agent': 'Rajax/1 Apple/iPhone9,2 iOS/14.8.1 Eleme/11.0.8 ID/50E26F2E-64B8-46BE-887A-25F7BEB4D762; IsJailbroken/1 Mozilla/5.0 (iPhone; CPU iPhone OS 14_8_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AliApp(ELMC/11.0.8) UT4Aplus/ltracker-0.2.30.33 WindVane/8.7.2 1242x2208 PHA/2.0.0 WK (PHATemplate)',
                host: 'restapi.ele.me',
            },
        };

        try {
            const response = await got(options);
            const responseBody = JSON.parse(response.body);
            // 如果响应没有错误，那么返回响应体中的 username
            return responseBody.username;
        } catch (error) {
            const errorBody = JSON.parse(error.response.body);
            if (errorBody.name === "UNAUTHORIZED") {
                console.log("未登录，跳过该账号");
            } else {
                console.log(error.response.body);
            }
            // 如果响应有错误，那么返回 false
            return false;
        }
    }
    //查询elm个人信息
    async function fetchUserDetail(s, cookie, username) {
        //s.reply("正在查询elm个人信息");
        const options = {
            method: 'GET',
            url: 'https://restapi.ele.me/eus/v5/user_detail',
            headers: {
                Cookie: cookie,  // 使用全局数组中的值设置 Cookie 头
                'user-agent': 'Rajax/1 Apple/iPhone9,2 iOS/14.8.1 Eleme/11.0.8 ID/50E26F2E-64B8-46BE-887A-25F7BEB4D762; IsJailbroken/1 Mozilla/5.0 (iPhone; CPU iPhone OS 14_8_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AliApp(ELMC/11.0.8) UT4Aplus/ltracker-0.2.30.33 WindVane/8.7.2 1242x2208 PHA/2.0.0 WK (PHATemplate)',
                host: 'restapi.ele.me',
            },
        };
        try {
            const response = await got(options);
            const responseBody = JSON.parse(response.body);
            let username = responseBody.username;
            let phone = responseBody.mobile;
            s.reply(`用户名：${username} 手机尾号：${(AmTool.Masking(phone, 0, 4))}`);
            console.log(response.body);
            // 检查环境变量的状态，如果它被禁用，则启用它
            let envs = await searchenv(s, "elmck");
            let envInfo = envFindId(envs, cookie);
            if (envInfo && envInfo.status === 1) {
                await enableEnv(s, envInfo.id);
            }
        } catch (error) {
            const errorBody = JSON.parse(error.response.body);
            if (errorBody.name === "UNAUTHORIZED") {
                s.reply(username + '好像过期了,进app看一下？');
                // 禁用无效的环境变量
                let envs = await searchenv(s, "elmck");
                let envId = envFindId(envs, cookie);
                if (envId) {
                    await disableEnv(s, envId);
                }
            } else {
                console.log(error.response.body);
            }

        }
    }
    //查询elm其他信息
    async function performAdditionalQueries(s) {
        for (let cookie of globalEnv) {
            //通过cookie寻找青龙环境变量位置，然后修改青龙任务运行参数进行指定账号查询
            await qlAssetQuery(s, cookie);
            await sleep(2000);
            //await fetchBalance(s, cookie);
        }
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    //accountmanager
    async function accountmanager(s) {
        // 从 usrDb 中获取用户信息
        let key = platform + ':' + userId;
        let userInfo = await usrDb.get(key);
        if (!userInfo || !Array.isArray(userInfo.accounts)) {
            s.reply("未找到任何账户信息");
            return;
        }
        // 列出所有账户的编号和用户名
        let accountList = userInfo.accounts.map((account, index) => `编号：${index}，账户：${account.username}`).join('\n');
        s.reply("账户列表：\n" + accountList + '\n' + "请输入编号进行删除，q退出");
        // 等待用户输入账号编号
        let input = await s.waitInput(() => { }, 60);
        if (input.getMsg() == "q" || input.getMsg() == "Q") {
            await s.reply("已退出");
            return;
        }
        // 将用户输入的账号编号转换为数字
        let accountIndex = parseInt(input.getMsg(), 10);
        if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= userInfo.accounts.length) {
            s.reply("输入的编号无效");
            return;
        }
        // 根据编号寻找对应的账号，执行删除account操作
        userInfo.accounts.splice(accountIndex, 1);
        await usrDb.set(key, userInfo);
        s.reply("删除账户成功");
    }
    //searchenv
    async function searchenv(s, envName = "elmck") {
        let url = `http://${qlHost}/open/envs?searchValue=${envName}`
        let body = ``
        let options = populateOptions(url, qlAuth, body);
        try {
            const response = await got.get(options);
            //console.log(response.body);
            let result = response.body;
            if (result.code == 200) {
                let envs = result.data;
                let env = envs.filter((env) => env.name === envName);
                if (env.length > 0) { // 如果找到了匹配的环境变量
                    //s.reply(`查询到${env.length}个` + envName + `环境变量`);
                    for (let i = 0; i < env.length; i++) {
                        await sleep(100);
                        //s.reply(`${env[i].value}`);
                        console.log(`${env[i].value}`);
                        globalEnv.push(env[i]);
                    }
                    return env;
                } else {
                    //s.reply(`未查询到环境变量：${envName}`);
                    console.log(`未查询到环境变量：${envName}`);
                    return;
                }
            } else {
                s.reply("查询环境变量失败")
            }
        } catch (error) {
            console.error(error);
            s.reply(`查询青龙接口失败: ${error.message}`);
        }
    }

    //addenv
    async function addenv(s, envName = "elmck", envValue, remarks = "") {
        let url = `http://${qlHost}/open/envs`;
        let param = { value: envValue, name: envName, remarks };
        let body = JSON.stringify([param]);
        let options = populateOptions(url, qlAuth, body);
        try {
            const response = await got.post(options);
            let result = response.body;
            if (result.code == 200) {
                s.reply(`添加环境变量成功`);
                console.log(`添加环境变量成功`);
            } else {
                s.reply(`添加环境变量失败`);
                console.log(`添加环境变量失败`);
            }
        } catch (error) {
            console.error(error);
            s.reply(`添加环境变量失败: ${error.message}`);
        }
    }


    //updateenv
    async function updateenv(s, envName = "elmck", envValue) {
        let url = `http://${qlHost}/open/envs`
        let body = `name=${envName}&value=${envValue}`
        let options = populateOptions(url, qlAuth, body);
        try {
            const response = await got.put(options);
            console.log(response.body);
            let result = response.body;
            if (result.code == 200) {
                s.reply(`更新环境变量成功`);
                console.log(`更新环境变量成功`);
            } else {
                s.reply(`更新环境变量失败`);
                console.log(`更新环境变量失败`);
            }
        } catch (error) {
            console.error(error);
            s.reply(`更新环境变量失败: ${error.message}`);
        }
    }
    //启用禁用env
    async function enableenv(s, id) {
        let url = `http://${qlHost}/open/envs/enable`
        let body = JSON.stringify([id]);
        let options = populateOptions(url, qlAuth, body);
        try {
            console.log(`envId: ${envId}`);
            const response = await got.put(options);
            console.log(response.body);
            let result = response.body;
            if (result.code === 200) {
                s.reply(`启用环境变量${envId}成功`);
                console.log(`启用环境变量成功`);
            } else {
                s.reply(`启用环境变量${envId}失败`);
                console.log(`启用环境变量失败`);
            }
        } catch (error) {
            console.error(error);
            s.reply(`启用环境变量失败:${envId}+ ${error.message}`);
        }
    }
    async function disableEnv(s, envId) {
        let url = `http://${qlHost}/open/envs/disable`;
        let body = JSON.stringify([envId]);  // 创建一个包含 id 的数组
        let options = populateOptions(url, qlAuth, body);
        try {
            console.log(`envId: ${envId}`);
            const response = await got.put(options);
            console.log(response.body);
            let result = response.body;
            if (result.code === 200) {
                s.reply(`禁用环境变量${envId}成功`);
                console.log(`禁用环境变量成功`);
            } else {
                s.reply(`禁用环境变量${envId}失败`);
                console.log(`禁用环境变量失败`);
            }
        } catch (error) {
            console.error(error);
            s.reply(`禁用环境变量失败:${envId}+ ${error.message}`);
        }
    }
    function envFindId(envs, invalidCookie) {
        let invalidEnv = envs.find((env) => env.value === invalidCookie);
        if (invalidEnv) {
            return invalidEnv._id;  // 返回找到的环境变量的 id
        } else {
            console.log(`未查询到匹配的环境变量`);
            return null;
        }
    }
    // qlsearchtask
    async function qlsearchtask(s, taskName = "pingxingsheng_elm/ele_assest.js") {
        let url = `http://${qlHost}/open/crons?searchValue=${taskName}`;
        let body = '';
        let options = populateOptions(url, qlAuth, body);
        try {
            const response = await got.get(options);
            let result = response.body;  // Need to parse the response body to a JavaScript object
            if (result.code == 200) {
                let tasks = result.data.data; // The tasks are nested in data.data
                let matchingTasks = tasks.filter((task) => task.command.includes(taskName));
                if (matchingTasks.length > 0) { // If matching tasks are found
                    for (let i = 0; i < matchingTasks.length; i++) {
                        await sleep(100);
                        console.log(`${matchingTasks[i].id}`);
                    }
                    return matchingTasks[0].id; // return the id of the first matching task
                } else {
                    console.log(`未查询到任务：${taskName}`);
                    return;
                }
            } else {
                s.reply("查询任务失败");
            }
        } catch (error) {
            console.error(error);
            s.reply(`查询青龙任务失败: ${error.message}`);
        }
    }

    //qlruntask
    async function qlruntask(s, taskid) {
        let url = `http://${qlHost}/open/crons/run`
        let body = JSON.stringify([taskid]);
        let options = populateOptions(url, qlAuth, body);
        try {
            const response = await got.put(options);
            console.log(response.body);
            let result = response.body;
            if (result.code == 200) {
                console.log(`运行任务成功`);
            } else {
                console.log(`运行任务失败`);
            }
        } catch (error) {
            console.error(error);
            s.reply(`运行任务失败: ${error.message}`);
        }
    }
    //searchlogs
    async function searchlogs(s, task, username) {
        let url = `http://${qlHost}/open/logs`;
        let options = populateOptions(url, qlAuth);

        try {
            const response = await got(options);
            const data = response.body;

            // 查找匹配的主目录
            const matchedDir = data.data.find(d => d.key === task);

            if (!matchedDir) {
                console.log(`没有找到关于 ${task} 的目录`);
                return null;
            }

            // 在主目录的 children 中找到 mtime 最大的项
            const latestLog = matchedDir.children.reduce((latest, current) => {
                return (current.mtime > latest.mtime) ? current : latest;
            });
            // 返回最新日志的 key
            let logKey = latestLog.key;

            // 获取日志详情
            console.log(`获取日志详情: ${logKey}`);
            const logDetails = await getlogs(s, logKey, username);
            if (logDetails) {
                console.log(logDetails); // 打印出日志的详情
                s.reply(logDetails);
            }
        } catch (error) {
            console.error(`获取日志列表失败: ${error.message}`);
            return null;
        }
    }
    //getlogs
    async function getlogs(s, key, username) {
        if (!key) {
            console.log("请提供有效的日志key");
            return null;
        }

        // 从 key 中获取父目录名和日志文件名
        const [parentDir, logFileName] = key.split('/');

        // 根据父目录名和日志文件名生成日志的URL
        let url = `http://${qlHost}/open/logs/${logFileName}?path=${parentDir}`;

        console.log(`获取日志详情: ${url}`);
        const options = populateOptions(url, qlAuth);

        try {
            const response = await got(options);
            console.log(response.body);
            let result = response.body.data;
            if (parentDir == 'pingxingsheng_elm_ele_assest_26') {
                // 开始提取数据
                const logContent = result;

                const accountRegex = /开始【饿了么账号 \d+ 】 (.*) \*{9}/g;
                let match;
                let accountDetails = [];

                // 迭代匹配所有账号
                while ((match = accountRegex.exec(logContent)) !== null) {
                    let accountName = match[1];

                    // 为每个账户创建一个新的正则表达式实例
                    const accountRegex = /开始【饿了么账号 \d+ 】 (.*?) \*{9}/g;

                    const detailRegex = new RegExp(`开始【饿了么账号 \\d+ 】 ${accountName} \\*{9}([\\s\\S]*?)没有获取到推送 uid，不推送消息`, 'g');

                    const detailsMatch = detailRegex.exec(logContent);
                    if (detailsMatch) {
                        const details = detailsMatch[1];
                        const leYuanBiMatch = details.match(/乐园币：(\d+)/);
                        const currentLeYuanBiMatch = details.match(/当前乐园币：(\d+)/);
                        const chiHuoDouMatch = details.match(/总吃货豆：(\d+)/);
                        const balanceMatch = details.match(/余额：(\d+\.\d+)/);

                        if (leYuanBiMatch && currentLeYuanBiMatch && chiHuoDouMatch && balanceMatch) {
                            let leYuanBi = leYuanBiMatch[1];
                            let currentLeYuanBi = currentLeYuanBiMatch[1];
                            let chiHuoDou = chiHuoDouMatch[1];
                            let balance = balanceMatch[1];

                            accountDetails.push({
                                accountName,
                                leYuanBi,
                                currentLeYuanBi,
                                chiHuoDou,
                                balance
                            });
                        }
                    }
                }


                // 在 accountDetails 中查找匹配的用户名
                let matchingAccount = accountDetails.find(detail => detail.accountName === username);

                if (matchingAccount) {
                    // 如果找到了匹配的账户，就返回相关的账户详情
                    return `账号名: ${matchingAccount.accountName}\n乐园币: ${matchingAccount.leYuanBi}\n当前乐园币: ${matchingAccount.currentLeYuanBi}\n吃货豆: ${matchingAccount.chiHuoDou}\n余额: ${matchingAccount.balance}`;
                } else {
                    // 如果没有找到匹配的账户，就返回一个错误消息或其他适当的响应
                    return `找不到 '${username}' 的账户日志`;
                }
            } else {
                return response.body;
            }

        } catch (error) {
            console.error(`获取日志详情失败: ${error.message}`);
            return null;
        }
    }

    function str(s) {
        const str = s.getMsg();
        let sidMatch = str.match(/SID=[^;]*/);
        let cookie2Match = str.match(/cookie2=[^;]*/);

        let result = '';
        let missing = '';

        if (sidMatch) {
            result += sidMatch[0] + ';';
        } else {
            missing += 'SID is missing. ';
        }
        if (cookie2Match) {
            result += cookie2Match[0] + ';';
        } else {
            missing += 'cookie2 is missing. ';
        }

        if (missing === '') {
            //s.reply(result);
            return result;
        } else {
            s.reply(missing);
            return;
        }
    }

}
    // // 查询吃货豆信息
    // async function fetchEatingBeans(s, cookie) {
    //     s.reply("正在查询吃货豆信息");
    //     const options = {
    //         method: 'GET',
    //         url: 'https://h5.ele.me/restapi/svip_biz/v1/supervip/foodie/records?latitude=30.153352&limit=20&longitude=104.153352&offset=0',
    //         headers: {
    //             Cookie: cookie,
    //             'user-agent': 'Rajax/1 Apple/iPhone9,2 iOS/14.8.1 Eleme/11.0.8 ID/50E26F2E-64B8-46BE-887A-25F7BEB4D762; IsJailbroken/1 Mozilla/5.0 (iPhone; CPU iPhone OS 14_8_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AliApp(ELMC/11.0.8) UT4Aplus/ltracker-0.2.30.33 WindVane/8.7.2 1242x2208 PHA/2.0.0 WK (PHATemplate)',
    //             host: 'h5.ele.me',
    //         },
    //     };
    //     try {
    //         const response = await got(options);
    //         const responseBody = JSON.parse(response.body);
    //         let peaCount = responseBody.peaCount;
    //         let recordsText = responseBody.records.slice(0, 3).map(record => `最近吃货豆收益为: ${record.count} 豆，时间: ${record.createdTime}`).join('\n');
    //         s.reply(`吃货豆数量为: ${peaCount}\n${recordsText}`);
    //     } catch (error) {
    //         console.log(error.response.body);
    //     }
    // }

    //    //余额
    //    async function fetchBalance(s, cookie) {
    //     s.reply("正在查询余额信息");

    //     // 构造请求
    //     const options = {
    //         method: 'GET',
    //         url: 'https://httpizza.ele.me/walletUserV2/storedcard/queryBalanceBycardType?cardType=platform',
    //         headers: {
    //             Cookie: cookie,
    //             'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
    //             host: 'httpizza.ele.me',
    //         },
    //     };

    //     try {
    //         const response = await got(options);
    //         const responseBody = JSON.parse(response.body);
    //         console.log(responseBody)
    //         // 输出余额
    //         let totalAmount = responseBody.data.totalAmount / 100;
    //         s.reply(`余额为: ${totalAmount} 元`);

    //     } catch (error) {
    //         console.log(error.response.body);
    //     }
    // }


