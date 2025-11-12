import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

//css, png, svg
import '../css_file/login.css'
import backIcon from '../assets/back_icon.svg'
import visibleIcon from '../assets/visibility.svg'
import visibleoffIcon from '../assets/visibility_off.svg'

export default function SignUp(){
    const [visibilityicon, setVisibility] = useState(false);
    const navigate = useNavigate();
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const changeIcon = () => {
        setVisibility((prev) => !prev);
    };

    async function signup(){
        const respon = await fetch("http://localhost:5000/signup", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({id, password})
        });

        const result = await respon.text();
        let submit = confirm(result);
        if(submit){
           navigate("/");
        }
    }

    return(
        <>
            <div id="btn_div">
                <button id="back" ><img src={backIcon} onClick={() => navigate("/login")} />돌아가기</button>
            </div>
            <div id="form_div">
                <h1>회원가입</h1>
                <h5>아이디 입력</h5>
                <input type="Text" required value={id} onChange={(e) => setId(e.target.value)} />
                <h5>비밀번호 입력</h5>
                <input type={visibilityicon ? "text" : "password"} required id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <br />
                <img src={visibilityicon ? visibleoffIcon : visibleIcon} id="v_icon" onClick={changeIcon}  />
                <br />
                <br />
                <button id="sub_btn" onClick={signup}>회원가입</button>
            </div>
        </>
    )
}