import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { messaging } from "../../server/firebase-config";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';


//css, png, svg
import Fitbelllogo from '../assets/Fitbell_logo_final.png'
import '../css_file/main.css'
import '../css_file/calender.css'
import "react-datepicker/dist/react-datepicker.css"


export default function Homepage(){
    const navigate = useNavigate();

    const [date, setDate] = useState(new Date());
    const [items, setItems] = useState([]);
    const [Meals, setMeals] = useState({});
    const [startDate, setStartDate] = useState(new Date());
    const [user, setUser] = useState(null);
    const [saved, setSaved] = useState(null);

    async function getDeviceToken() {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            registerServiceWorker();
    
            const token = await getToken(messaging, { 
                vapidKey: "BItxCc3iVFErimKhC2SdZ5315Hx6HtWVswzqKyiPfmOvn6868N0UylajpPNoCa-abZqeZcE9YtU847jjvJ6HKdo",
            });
    
            if (token) {
                return token;
            }
        }
        return null;
    }
    
    const sendTokenToServer = async (token) => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;
    
        try {
            const response = await fetch("/api/fcm/save-token", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ fcmToken: token }),
            });
            if (response.ok) {
                console.log("FCM 토큰이 성공적으로 서버에 저장되었습니다.");
            } else {
                const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            
                console.error(
                    "FCM 토큰 서버 저장 실패:", 
                    response.status, 
                    errorBody.error || errorBody.message || response.statusText,
                    " (서버에서 받은 상세 오류)"
                );
            }
        } catch (error) {
            console.error("FCM 토큰 전송 중 오류 발생:", error);
        }
    };

    async function registerServiceWorker(){
        if(typeof window === 'undefined' || !('serviceWorker' in navigator)){
            return undefined;
        }
        try{
            const registration = await navigator.serviceWorker.register('/firebase_messaging_sw.js');
            await navigator.serviceWorker.ready;
            return registration;
        } catch(e){
            console.error('serviceWorker 등록 실패', e);
            throw e;
        }
    }

    const mapCalender = (diets, start) => {
        const mealMap = {};

        diets.forEach((dayPlan) => {
            const dayNum = parseInt(dayPlan.날짜.replace('일차', ''));

            const eventDate = new Date(start);
            eventDate.setDate(start.getDate() + dayNum - 1);

            const daySaveKey = `${eventDate.getFullYear()}-${pad(eventDate.getMonth() + 1)}-${pad(eventDate.getDate())}`;
            const plans = [];

            Object.keys(dayPlan).forEach(key => {
                if (key.includes('아침') || key.includes('점심') || key.includes('저녁')){
                    const TypeMatch = key.match(/(아침|점심|저녁)/);
                    if (TypeMatch){
                        plans.push({
                            type: TypeMatch[1],
                            time: key.match(/\((\d+)시\)/)?.[1] + '시',
                            content: dayPlan[key]
                        });
                    }
                }
            });
            mealMap[daySaveKey] = plans;
        });
        return mealMap;
    };

    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        const UserName = localStorage.getItem('userName');

        onMessage(messaging, (payload) => {
            console.log('message received', payload);

            const { notification } = payload;
            new Notification(notification.title, {
                body: notification.body,
                icon: notification.icon
            });
        });

        getDeviceToken()
            .then(token => {
                if (token) {
                    sendTokenToServer(token);
                } else {
                    console.log("알림 권한 거부 또는 토큰 발급 실패.");
                }
            })
            .catch(e => console.error("FCM 초기화 과정에서 오류 발생:", e));

        if(accessToken && UserName){
            setUser({ name: UserName});
        }

        fetch("/api/homepage", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(res => {
            if (res.status === 401) {
                throw new Error('인증 실패: 다시 로그인해주세요.');
           }
           return res.json();
        })
        .then(data => {
            setItems(data);
            if(data && data.length > 0){
                const lastSaved = new Date(data[0].saveDate);
                const nextDay = new Date(lastSaved);
                nextDay.setDate(lastSaved.getDate() + 1);

                setSaved(lastSaved);
                setStartDate(nextDay);
            }
        })
        .catch(err => console.error("데이터 로드 실패", err));
    }, []);
    useEffect(() => {
        if (items && items.length > 0) {
            const mapped = mapCalender(items, startDate);
            setMeals(mapped);
        }
    }, [items, startDate]);

    const renderAuthButton = () => {
        if (user) {
            return (
                <li id="Login_Logout">
                    <button onClick={handleLogout}>{user.name}님</button>
                </li>
            );
        } else {
            return (
                <li id="Login_Logout">
                    <button onClick={() => navigate("./login")}>로그인</button>
                </li>
            );
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userName');
        setUser(null);
        alert("로그아웃 되었습니다.");
        navigate("/");
    };

    const pad = (num) => (num > 9 ? num : "0" + num);

    const renderCalender = (date) => {
        const renderDate = new Date(date.getTime());

        const viewYear = renderDate.getFullYear();
        const viewMonth = renderDate.getMonth();

        renderDate.setDate(1);

        const firstDay = renderDate.getDay();
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        const limitDay = firstDay + lastDay;
        const nextDay = Math.ceil(limitDay / 7) * 7;

        let days = [];

        for(let i = 0; i < firstDay; i++){
            days.push(<div key={`prev-${i}`} className='noColor' ></div>);
        }
        for(let i = 1; i <= lastDay; i++){
            let d =`${viewYear}-${pad(viewMonth + 1)}-${pad(i)}`;
            const daiilymeals = Meals[d];
            days.push(
                <div key={d} className='day'>
                    <p id='days'>{i}</p><br/>
                    {daiilymeals && daiilymeals.map((meal, idx) => (
                    <p key={idx} className='meal'><strong>{meal.type}: {meal.content}<br /></strong></p>
                    ))}
                </div>
            );
        }
        for(let i = 0; i < nextDay - limitDay; i++){
            days.push(<div key={`next-${i}`} className='noColor' ></div>);
        }

        return days;
    };

    const handlePrev = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() -1, 1));
    };
    const handleNext = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    };

 
    return(
        <>
            <header id="top_hr">
                <div id="img_div">
                    <img src={Fitbelllogo} alt="" width="150" height="150" />
                </div>
                <nav id="nav_top">
                    <ul> 
                        {renderAuthButton()}
                    </ul>
                </nav>
            </header>
            <header id="bottom_hr">
                <nav id="nav_bottom">
                    <ul>
                        <li><button onClick={() => navigate("./diet")}>식단표 만들기</button></li>
                    </ul>
                </nav>
            </header>
            <main>
                <div id="container">
                    <div id="month-wrap">
                        <button className="date-last" id="btn" onClick={handlePrev} >&lt;</button>
                        <h2 className="month">{date.getFullYear()}년 {date.getMonth() + 1}월</h2>
                        <button className="date-next" id="btn" onClick={handleNext} >&gt;</button>
                    </div>
                    <div id="calendar">
                        <div id="calendar-wrap">
                            <div className="grid date-title">
                                <div className="week" id="sun">일</div>
                                <div className="week" id="mon">월</div>
                                <div className="week" id="tue">화</div>
                                <div className="week" id="wed">수</div>
                                <div className="week" id="thu">목</div>
                                <div className="week" id="fri">금</div>
                                <div className="week" id="sat">토</div>
                            </div>
                            <div className="grid date-board">
                                {renderCalender(date)}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <footer>
                <p>이 사이트는 식단관리 및 식사 시간을 알려주는 웹 사이트입니다. 효과적으로 식단 관리를 할 수 있게 도와줍니다.</p>
            </footer>
        </>
    )
}