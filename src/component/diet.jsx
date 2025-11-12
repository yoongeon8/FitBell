import React, { useState, useEffect } from 'react'
import { useNavigate} from "react-router-dom";
import {  GoogleGenerativeAI } from "@google/generative-ai";
import Loading from './loading';

//css, png, svg
import FitbellLogo from '../assets/Fitbell_logo_final.png'
import '../css_file/diet.css'
import '../css_file/main.css'


export default function Diet(){
    const [diet_keywords, setInput] = useState("");
    const [week_daliy, setWeek_dailly] = useState("");
    const [alarm_time, setTimes] = useState("");
    const [isLoad, setIsLoad] = useState(false);

    async function subscribeUser(){
      if('serviceWorker' in  navigator){
        const reg = await navigator.serviceWorker.register("./sw.js");

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: ""
        });

        await fetch("/api/save-subscription", {
          method: "POST",
          body: JSON.stringify(sub),
          headers: { 'Content-Type': 'application/json'}
        });
      }
    }

    const sendPrompt = async () => {
        alert("제출이 완료되었습니다.");
        setIsLoad(true);
        
        const res = await fetch("http://localhost:5000/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${diet_keywords}을/를 ${week_daliy}에 맞게 식단을 하루 단위로 짜줘 ${alarm_time}시간으로 아침 점심 저녁으로 나눠줘 json형태로 json데이터만 출력해줘 그리고 json내의 내용은 한국어로 적어줘 json데이터 외의 내용은 적지 말아줘 json 저장 형태는 n일차: {아침(x시): ~~, 점심(x시): ~~, 저녁(x시): ~~} 이런식으로 저장해줘`
          }),
        });

        setIsLoad(false);
      
        const data = await res.json();
        const dietPlandata = data.candidates[0].content.parts[0].text;
        
        try {
          const cleanJson = dietPlandata.replace(/```json|```/g, "").trim();
          const planObj = JSON.parse(cleanJson);

          const planArray = Object.entries(planObj).map(([day, meals]) => {
            return {
              날짜: day,
              ...meals
            }
          });
      
          await sendDietData(planArray);
          navigate("/");
        } catch (err) {
          console.error("JSON 파싱 오류:", err);
        }

      
        async function sendDietData(plan) {
          try {
            const accessToken = localStorage.getItem("accessToken");
            if(!accessToken){
              alert("로그인이 필요합니다.");
              return;
            }
            const res = await fetch("http://localhost:5000/api/diet", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
              body: JSON.stringify({식단: plan}),
            });

      
            const re = await res.json();
            console.log("서버 응답:", re);
          } catch (err) {
            console.error("전송 오류:", err);
          }
        }
      };
    
    const navigate = useNavigate();

    if (isLoad) {
      return <Loading />;
  }

    return(
        <>
            <header id="top_hr">
                <div id="img_div">
                    <img src={FitbellLogo} alt="" width="150" height="150" />
                </div>
                <nav id="nav_top">
                    <ul>
                        <li><button onClick={() => navigate("/")}>돌아가기</button></li>
                    </ul>
                </nav>
            </header>
            <main>
                <div id='diet_form'>
                    <h3>식단 키워드 입력</h3>
                    <input type="text" name="diet_keyword" className='subinput' id="keyword" value={diet_keywords} onChange={(e) => setInput(e.target.value)} placeholder="예: 단백질 중심 식단" required />
                    <p id="explan">자세히 적을수록 더 좋은 결과가 나옵니다.</p>
                    <h3>식단 기간 입력</h3>
                    <input type="text" name="calendar_inp" className='subinput' id="cal_inp" value={week_daliy} onChange={(e) => setWeek_dailly(e.target.value)} placeholder="예: 2주, 7일, 1달, 1년" required />
                    <h3>알림 시간 입력</h3>
                    <input type="text" name='' className='subinput' id='alarm_times' value={alarm_time} onChange={(e) => setTimes(e.target.value)} placeholder='예: 6,13,19' required />
                    <br /><br /><br />
                    <button id='submit_btn' onClick={sendPrompt}>제출</button>
                </div>
            </main>
        </>
    )
}