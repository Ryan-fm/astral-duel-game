import { MobileScroll } from "./mobile";

// Build app-specific screens and flows in this file. The surrounding mobile
// runtime is template-owned and intentionally lives outside this component.
export default function Prototype() {
  return (
    <MobileScroll className="app-screen">
      <main className="screen-content" style={{minHeight:'100%',background:'#091426',padding:'30px 24px',color:'#e5f5ff'}}>
        <span style={{color:'#81dfff',letterSpacing:3,fontSize:12}}>ASTRAL DUEL</span>
        <h1>星域决斗</h1>
        <img src="/game-assets/blue-eyes.png" alt="青眼白龙" style={{width:'100%',margin:'25px 0'}}/>
        <h2>进入 3D 竞技场</h2>
        <p style={{color:'#9db6cd',lineHeight:1.8}}>横屏游玩 · 人机决斗 · 在线匹配 · 好友切磋</p>
        <a href="/game.html" style={{display:'block',padding:16,background:'#245368',color:'#dff8ff',textAlign:'center',borderRadius:6,textDecoration:'none'}}>打开横屏游戏 →</a>
        <p style={{color:'#7c9bb5',fontSize:12,marginTop:22,lineHeight:1.8}}>手机请旋转至横屏。在线匹配需要另一名玩家连接同一个决斗服务。</p>
      </main>
    </MobileScroll>
  );
}
