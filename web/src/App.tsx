const WIN_DOWNLOAD =
  import.meta.env.VITE_DOWNLOAD_URL_WIN ||
  import.meta.env.VITE_DOWNLOAD_URL ||
  '/downloads/Youxia-Setup-0.1.0.exe';
const MAC_ARM_DOWNLOAD =
  import.meta.env.VITE_DOWNLOAD_URL_MAC_ARM || '/downloads/Youxia-0.1.0-arm64.dmg';
const MAC_X64_DOWNLOAD =
  import.meta.env.VITE_DOWNLOAD_URL_MAC_X64 || '/downloads/Youxia-0.1.0-x64.dmg';

export default function App() {
  return (
    <div className="page">
      <header className="top">
        <div className="logo">游侠 <span>YOUXIA</span></div>
        <nav>
          <a href="#download">立即下载</a>
          <a href="#about">关于我们</a>
          <a href="#contact">联系我们</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">街机联网对战平台</p>
          <h1>游侠</h1>
          <p className="lead">
            联网匹配 / 本地 USB 街机杆 / 实时开房
            <br />
            支持 Windows 与 macOS，登录即可开战
          </p>
          <div className="cta" id="download">
            <a className="btn" href={WIN_DOWNLOAD}>
              Windows 下载
            </a>
            <a className="btn" href={MAC_ARM_DOWNLOAD}>
              macOS Apple 芯片
            </a>
            <a className="btn ghost" href={MAC_X64_DOWNLOAD}>
              macOS Intel
            </a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden>
          <div className="cabinet">
            <div className="screen">
              <span>VS</span>
              <small>NETPLAY READY</small>
            </div>
            <div className="stick" />
            <div className="buttons">
              <i /><i /><i /><i />
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <h2>平台能力</h2>
        <div className="feature-row">
          <article>
            <h3>联网匹配</h3>
            <p>同款街机一键排队，主机/客机自动开房连接。</p>
          </article>
          <article>
            <h3>USB 街机杆</h3>
            <p>支持常见 USB 摇杆；Windows 走 XInput/DInput，macOS 走 HID。</p>
          </article>
          <article>
            <h3>双端安装包</h3>
            <p>Windows NSIS 安装包与 macOS DMG，装完登录大厅选游戏开玩。</p>
          </article>
        </div>
      </section>

      <section className="about" id="about">
        <h2>关于我们</h2>
        <p>
          游侠面向街机爱好者提供对战大厅与客户端启动器。游戏 ROM 需用户自备合法拷贝，本站与客户端不分发商业游戏文件。
        </p>
      </section>

      <section className="contact" id="contact">
        <h2>联系我们</h2>
        <p>商务合作 / 意见反馈：support@youxia.local</p>
      </section>

      <footer>
        <div className="links">
          <a href="#">软件许可及服务协议</a>
          <a href="#">隐私协议</a>
          <a href="#">用户账号注销</a>
          <a href="#">免责声明</a>
        </div>
        <p>Copyright © 2026 游侠 Youxia · 适龄提示：本平台适合 18 岁以上玩家</p>
        <p className="fine">
          抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。
        </p>
      </footer>
    </div>
  );
}
