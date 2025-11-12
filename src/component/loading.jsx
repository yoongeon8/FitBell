import loadingLogo from '../assets/load.png'
import '../css_file/loading.css'

export default function Loading(){
    return(
        <>
        <div id='load_div'>
            <h2>AI 답변 대기 중...</h2>
            <img src={loadingLogo} alt='' id='load_logo' />
        </div>
        </>
    )
}