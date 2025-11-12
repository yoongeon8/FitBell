require("dotenv").config({path: "./config.env"});

const express = require("express");
const {MongoClient} = require("mongodb");
const bcrypt = require("bcrypt");
const cors = require("cors");
const webpush = require('web-push');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
app.use(cors());

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.log("jwt 인증 실패", err.name);
            return res.sendStatus(403);
        }
        req.user = user; 
        next();
    });
};

function startMealScheduler(){
    cron.schedule('0 * * * *', async () => {
        const db = app.locals.db;
        if(!db) return console.log('scheduler db 연결 대기중');

        console.log(`scheduler 식사 알림 확인 시작: ${new Date().toISOString()}`);

        const now = new Date();
        const dateKey = now.toISOString().split('T')[0];
        const getHour = now.getHours();

        try{
            const pipeline = [
                {
                    $lookup: {
                        from: "Users",
                        localField: "userId",
                        foreignField: "id",
                        as: "userInfo"
                    }
                },
                { $unwind: "$userInfo" },
                { $match: { "userInfo.fcmToken": { $exists: true, $ne: null } } }
            ];

            const notificationSend = await db.collection("DietPlan").aggregate(pipeline).toArray();
            const tokensSend = new Map();

            notificationSend.forEach(dailyPlan => {
                const userInfo = dailyPlan.userInfo;
                const fcmToken = userInfo?.fcmToken;

                if (!fcmToken) {
                    return;
                }
            
                Object.keys(dailyPlan).forEach(key => {
                    if (key.includes('(') && key.includes('시') && key.includes(')')) {
            
                        const timeMatch = key.match(/\(([^)]+)\)/);
                        if (!timeMatch || !timeMatch[1]) {
                            return;
                        }
            
                        const timeString = timeMatch[1];
                        const mealType = key.substring(0, key.indexOf('('));
                        const mealContent = dailyPlan[key];

                        const mealHour = parseInt(timeString.replace('시', ''));
                        
                        if (mealHour === getHour) {
                            const token = fcmToken;
                            
                            if (!tokensSend.has(token)) {
                                const contentString = mealContent || `${mealType} 식단 정보가 없습니다.`;
                                
                                const previewBody = contentString.substring(0, 50) + 
                                                    (contentString.length > 50 ? '...' : '');
            
                                tokensSend.set(token, {
                                    title: `${mealType} 식사 시간입니다. 식단을 확인하고 식사하세요.`,
                                    body: previewBody,
                                });
                            }
                        }
                    }
                });
            });

            if(tokensSend.size > 0){
                const tokens = Array.from(tokensSend.keys());
                const mainMessage = tokensSend.values().next().value;

                const message = {
                    notification: mainMessage,
                    tokens: tokens
                };

                const response = await admin.messaging().sendEachForMulticast(message);
                console.log("알림 성공:", response);
            }
        } catch(e){
            console.error('scheduler 오류 식단 알림 발송 에러 발생:', e);
        }
    });
}

const serviceAccount = require('./config/fitbell-firebase.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const client = new MongoClient(process.env.ATLAS_URI);
const dbName = "FitbellDB";

async function RunServer(){
    try{
        await client.connect();
        console.log("DB 연걸 완료");

        app.locals.db = client.db(dbName);
        startMealScheduler();

        app.listen(5000, () => {
            console.log("서버 실행중");
        });
    } catch(e) {
        console.error("DB 연결 실패", e);
        process.exit(1);
    }
}
RunServer();

process.on("SIGINT", async () => {
    await client.close();
    console.log("DB 연결 종료");
    process.exit(0);
});

app.post("/api/gemini", async (req, res) => {
    const { prompt } = req.body;
    try{
        const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                contents: [{parts: [{text: prompt}]}]
            })
        });
        const data = await response.json();
        res.json(data);

    }catch(error){
        res.status(500).json({ error: error.message});
    }
});

app.post("/signup", async(req, res) => {
    const {id, password} = req.body;
    try{
        const db = req.app.locals.db;
        const userdb = db.collection("Users");

        const existing = await userdb.findOne({id});
        if(existing){
            return res.status(400).send("이미 존재하는 아이디입니다.");
        }

        const UserPassword = await bcrypt.hash(password, 10);
        await userdb.insertOne({id, password: UserPassword});
        res.status(201).send("회원가입이 완료 되었습니다.");
    } catch(e){
        console.log(e);
        res.status(500).send("서버 오류");
    }
})

app.post("/login", async(req, res) => {
    const {id, password} = req.body;
    try{
        const db = req.app.locals.db;
        const users = db.collection("Users");

        const user = await users.findOne({id});
        if(!user){
            return res.status(400).json({ message: "아이디가 존재하지 않습니다."});
        }

        const match = await bcrypt.compare(password, user.password);
        if(!match){
            return res.status(400).json({ message: "비밀번호가 틀렸습니다."});
        }
    
        const idload = {
            userId: user._id.toString(),
            id: user.id
        };
        const token = jwt.sign(
            idload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d'}
        );
        
        res.json({
            message: "로그인 되었습니다.",
            token: token,
            userName: user.id
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "서버 오류 발생"});
    }
});

app.post("/api/fcm/save-token", authenticateToken, async(req, res) => {
    const { fcmToken } = req.body;
    const userId = req.user ? req.user.id : '인증 정보 없음'; 

    if(!fcmToken || !userId){
        return res.status(400).json({ message: "FCM 토큰이 제공 되지 않음."});
    }
    try{
        const db = req.app.locals.db;
        const usersCollection = db.collection("Users");

        await usersCollection.updateOne(
            {id: userId},
            {$set: {fcmToken: fcmToken}}
        );

        res.status(200).json({ message: "FCM 토큰이 저장됨." });
    } catch (err){
        console.error("FCM 저장 에러", err);
        res.status(500).json({ meesage: "서버 오류 발생: FCM토큰 저장 에러"});
    }
})

app.post("/api/diet", authenticateToken, async(req, res) => {
    try{
        const db = req.app.locals.db;
        const userId = req.user.id;
        const nowDate = new Date();
        const 식단 = Array.isArray(req.body) ? req.body : req.body.식단;

        if(!Array.isArray(식단) || 식단.length === 0){
            return res.status(400).json({error: "데이터 형식 오류"});
        }

        const deleteDatas = await db.collection("DietPlan").deleteMany({userId: userId});
        console.log(`${userId}사용자의 식단을 ${deleteDatas.deletedCount}개를 삭제함.`);

        const addDietPlans = 식단.map(meal => ({
            ...meal,
            userId: userId,
            saveDate: nowDate
        }));

        await db.collection("DietPlan").insertMany(addDietPlans);
        res.json({message: "식단 저장 성공"});
    } catch(error){
        console.error("저장 에러");
        res.status(500).json({error: "DB 저장 실패"});
    }
});

app.get("/api/homepage", authenticateToken, async(req, res) => {
    try{
        const db = req.app.locals.db;
        if(!req.user || !req.user.id){
            return res.status(401).json({message: "인증되지 않은 사용자입니다."});
        }
        const userId = req.user.id;
        const items = await db.collection("DietPlan").find({ userId: userId}).sort({saveDate: -1}).toArray();
        res.json(items);
    } catch(e){
        console.error("불러오기 에러", e);
        res.status(500).json({e: "DB 불러오기 실패"});
    }
});