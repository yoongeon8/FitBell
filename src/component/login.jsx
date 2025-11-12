import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

//css, png, svg
import '../css_file/login.css'
import backIcon from '../assets/back_icon.svg'
import visibleIcon from '../assets/visibility.svg'
import visibleoffIcon from '../assets/visibility_off.svg'

export default function Login(){
    const [visibilityicon, setVisibility] = useState(false);
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const changeIcon = () => {
        setVisibility((prev) => !prev);
    };

    async function login(){
        const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password })
        });

        const result = await response.json();
        if(response.ok && result.token){
            localStorage.setItem('accessToken', result.token);
            if(result.userName){
                localStorage.setItem('userName', result.userName);
            }
            let submit = confirm(result.message || "로그인 성공");
            if(submit){
                navigate("/")
            }
        }else{
            alert(result.message || "로그인 실패 id나 비밀번호를 확인하세요.")
        }

    }

    return(
        <>
            <div id="btn_div">
                <button id="back" onClick={() => navigate("/")}><img src={backIcon} />홈으로</button>
            </div>
            <div id="form_div">
                <h1>로그인</h1>
                <h5>아이디 입력</h5>
                <input type="text" required  value={id} onChange={(e) => setId(e.target.value)} />
                <h5>비밀번호 입력</h5>
                <input type={visibilityicon ? "text" : "password"} required id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <br />
                <img src={visibilityicon ? visibleoffIcon : visibleIcon} id="v_icon" onClick={changeIcon} />
                <br />
                <br />
                <button id="sub_btn" onClick={login} >로그인</button>
                <p>계정이 없으시다면 아래 회원가입 버튼을 눌러주세요.</p>
                <button onClick={() => navigate("/signup")} id="gosign" >회원가입 하러가기</button>
            </div>
        </>
    )
}