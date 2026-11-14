"use strict";

const github = "https://github.com/53nu";
const notion = "https://53nu.notion.site/";
const instagram = "https://www.instagram.com/1015_53nu/";
const pages = "https://53nu.github.io/";
const repo = (slug) => github + "/" + slug;
const demo = (slug) => pages + slug + "/";
const article = (slug, id) => notion + slug + "-" + id;
const clip = (id) => instagram + "reel/" + id + "/";
const reel = (id, name, file) => ({
  type: "video", name, src: "media/" + file + ".mp4",
  poster: "media/" + file + ".jpg", preview: "media/" + file + ".gif", href: clip(id)
});
const photo = (name, alt) => ({ type: "image", src: "media/" + name, name: alt });

const portfolio = {
  name: "고민우",
  handle: "53nu",
  intro: "인터랙티브 비주얼과 웹 작업을 만들고, 드로잉과 입체 작업을 합니다.",
  links: [
    ["GitHub", github],
    ["연락 · Instagram", instagram],
    ["Notion 포트폴리오", notion + "portfolio?pvs=74"]
  ],
  groups: [
    { id: "about", label: "About", badge: "GO", badgeColor: "#384593", color: "#5964b6", pale: "#dddfff", mark: "person" },
    { id: "touchdesigner", label: "TouchDesigner", badge: "TD", badgeColor: "#03387d", color: "#356e83", pale: "#d1f2f3", mark: "wave", projects: [
      { id: "fruit-visuals", title: "Fruit Family", text: "딸기, 사과, 수박의 이름과 개인적인 기억에서 출발한 영상 시리즈입니다.", more: "ICHIGO는 딸기와 1·5의 일본어 발음을 연결해 약 15초로 구성했습니다. RINGO는 고향 거창의 사과를, SUI(水)KA는 水의 획이 뻗는 모양을 소재로 삼았습니다.", tags: ["TouchDesigner"], media: [reel("Dc8G4R8JDP1", "ICHIGO", "ichigo"), reel("DcpoYoVPj9A", "RINGO", "ringo"), reel("DcgIco4P6OQ", "SUI(水)KA", "suika")], links: [["Notion", article("Fruit-Visuals", "415b42633c8c81809704f759c6991a0a")]] },
      { id: "surface-waves", title: "Surface Waves from Raindrop", text: "물방울이 떨어질 때 생기는 원형 파동을 TouchDesigner에서 구현했습니다. 평면과 구체에 파동을 겹쳐 표면의 형태와 명암이 변하는 모습을 담았습니다.", more: "치이카와, 하치와레, 우라야하보즈를 소재로 파동의 형태를 변주했습니다.", tags: ["TouchDesigner", "GLSL"], media: [reel("DeBjk0Up1pw", "Sphere", "sphere"), reel("DdTBXH9JrwT", "Surface Waves", "waves"), reel("DeYVE7pp3Ty", "Chiikawa", "chiikawa")], links: [["Notion", article("Surface-Waves-from-Raindrop", "415b42633c8c81c28ecff764cd27aa65")]] },
      { id: "at-field", title: "AT-Field", text: "손바닥을 펼치면 에반게리온의 AT 필드가 전개됩니다. 손동작을 MediaPipe로 감지하고, TouchDesigner에서 타이포그래피와 스펙트럼, GUI를 함께 움직이도록 구성했습니다.", more: "Noise TOP, Feedback TOP과 Palette의 Graph 컴포넌트를 조합해 그래픽을 만들었습니다.", tags: ["TouchDesigner", "MediaPipe"], media: [reel("DVXcv0QjyT-", "AT-Field", "at-field")], links: [["Notion", article("AT-Field-MediaPipe-TouchDesigner", "415b42633c8c8174ae5efd57dba98865")], ["GitHub", repo("ATfieldTenkai")]] },
      { id: "muryokusho", title: "Muryokusho — 무량공처", text: "카메라에서 인물을 분리하고 손동작에 맞춰 주술회전의 무량공처를 전개하는 실시간 영상 작업입니다.", more: "MediaPipe로 인물과 손을 추적하고, TouchDesigner의 TOPs, POPs와 Lights Tunnel을 이용해 별빛과 터널이 깊이감을 만드는 장면을 구현했습니다.", tags: ["TouchDesigner", "MediaPipe"], media: [reel("DWoU1clj_dD", "Muryokusho", "muryokusho")], links: [["Notion", article("Muryokusho", "415b42633c8c81c7936dc88fc280c672")], ["GitHub", repo("Muryokusho")]] },
      { id: "uro", title: "Uro — Hand Tracking & GLSL", text: "손의 움직임에 따라 화면이 한 장의 면처럼 휘고 뒤틀립니다. 주술회전의 우로 타카코에서 출발한 비주얼입니다.", more: "MediaPipe의 손 추적을 TouchDesigner에 연결하고 Twirl 필터의 GLSL을 수정해 장막과 우수나탄을 표현했습니다.", tags: ["TouchDesigner", "MediaPipe", "GLSL"], media: [reel("DXHX75fj_Z1", "Uro", "uro")], links: [["Notion", article("Uro-Hand-Tracking-GLSL", "415b42633c8c8110bd6bce0943d8b165")]] },
      { id: "hand-landmarks", title: "MediaPipe × TouchDesigner", text: "양손의 랜드마크를 블록의 움직임에 연결했습니다. 한 손의 엄지와 검지 간격으로 블록 속 노이즈 밀도를 바꾸고, 다른 손을 일정 각도 이상 돌리면 소리와 함께 블록이 재배치됩니다.", tags: ["TouchDesigner", "Python", "MediaPipe"], links: [["Notion · 시연 영상", article("Mediapipe-x-Touch-Designer", "270b42633c8c80408ac9eb6291a30006")]] }
    ] },
    { id: "web", label: "WEB", badge: "WEB", badgeColor: "#25629b", color: "#926136", pale: "#fae9cc", mark: "window", projects: [
      { id: "icc", track: "JS", title: "Interactive Color Composition · ICC 아카이브", text: "몬드리안에서 영감을 받은 가변 격자에서 주차별 p5.js 스케치를 탐색할 수 있습니다. 격자가 천천히 움직이고, 각 타일에 커서를 올리면 작품이 나타납니다.", tags: ["p5.js", "Canvas"], media: [photo("icc-2.png", "Week 2"), photo("icc-6.jpg", "Week 6"), photo("icc-8.jpg", "Week 8")], links: [["실행", demo("ICC-Interactive-Color-Composition")], ["GitHub", repo("ICC-Interactive-Color-Composition")]] },
      { id: "connected-garage", track: "JS", title: "Connected Garage · CG 아카이브", text: "찻주전자, 기타, 고양이 등 방 안의 오브젝트를 클릭해 연결된 p5.js 작업으로 이동하는 3D 포트폴리오입니다.", tags: ["p5.js", "WebGL"], media: [photo("connected-garage.webp", "Connected Garage 실행 화면")], links: [["실행", demo("CG--Connected-Garage")], ["GitHub", repo("CG--Connected-Garage")]] },
      { id: "merry-go-round", track: "JS", title: "Midnight Merry-go-round", text: "눈을 감으면 빛과 음악이 켜지고 회전목마가 돌기 시작합니다. 눈을 떠 확인하는 순간 회전이 멈춥니다.", more: "참여자가 직접 볼 수 없는 장면을 만들기 위해 MediaPipe Face Landmarker로 눈의 상태를 추적하고 p5.js로 회전목마를 구현했습니다.", tags: ["p5.js", "WebGL", "MediaPipe"], media: [photo("carousel-closed.jpg", "눈을 감았을 때"), photo("carousel-open.jpg", "눈을 떴을 때")], links: [["실행", demo("Merry-go-round")], ["GitHub", repo("Merry-go-round")]] },
      { id: "integral", track: "JS", title: "INTEGRAL", text: "양손을 벌리고 모으며 3D 도자기를 빚습니다. 두 검지의 거리가 새로 쌓이는 층의 폭을 바꾸고, 쌓이는 동안 도자기는 자동으로 회전합니다.", tags: ["p5.js", "WebGL", "MediaPipe"], media: [photo("integral.webp", "INTEGRAL로 빚은 도자기")], links: [["실행", demo("CA_P4")], ["GitHub", repo("CA_P4")]] },
      { id: "rgb-photo-space", cover: "media/rgb-space.webp", track: "JS", title: "RGB Photo Space", text: "사진의 전체 픽셀에서 구한 평균 RGB를 3D 좌표로 바꾸는 인터랙티브 콜라주입니다. 공간을 회전하고 점을 클릭하면 원본 사진을 확인할 수 있습니다.", tags: ["p5.js", "WebGL"], media: [photo("rgb-space.webp", "RGB Photo Space 실행 화면"), photo("rgb-diagram.svg", "평균 RGB와 3D 좌표의 대응")], links: [["실행", demo("CA_P3")], ["GitHub", repo("CA_P3")]] },
      { id: "between-breaths", track: "JS", title: "Between Breaths", text: "출생은 하얀 십자 섬광이 되고, 사망은 검은 십자 섬광이 되어 점의 배열을 바꿉니다. 연간 인구 전망치를 바탕으로 두 사건이 일어나는 속도를 시각화한 설치형 웹 작업입니다.", tags: ["p5.js", "데이터 시각화"], media: [photo("breaths.jpg", "Between Breaths 실행 화면")], links: [["실행", demo("CA_P5")], ["GitHub", repo("CA_P5")]] },
      { id: "ascii-galaxy", track: "JS", title: "Make your own A.G.", text: "NASA 관측 자료를 바탕으로 사용자가 원하는 은하를 ASCII 아트로 만들어 보는 웹 프로젝트입니다. 관측 이미지를 3D 배열로 변환해 회전축과 속도를 조절할 수 있게 했습니다.", tags: ["NASA Space Apps Challenge", "팀 프로젝트"], media: [photo("ascii-galaxy.webp", "ASCII Galaxy 실행 화면")], links: [["Notion", article("Make-your-own-A-G-ASCII-Galaxy", "2aab42633c8c80ee8957c6eb15deb7c8")], ["GitHub", repo("2025_NasaHackathon_Seoul")]] },
      { id: "spotify-prototype", track: "UX", title: "Spotify UX · HCI", text: "탐색과 재생 대기열, 플레이리스트 저장을 중심으로 음악 앱의 모바일 사용 흐름을 구현한 HCI 프로토타입입니다.", tags: ["HCI", "React", "TypeScript"], media: [photo("spotify.webp", "Spotify UX 프로토타입")], links: [["실행", demo("hci_spotify")], ["GitHub", repo("hci_spotify")]] },
      { id: "smart-fridge", track: "UX", title: "냉잔고", text: "냉장고 속 식재료를 관리하고 보유한 재료에 맞는 레시피를 추천하는 웹 서비스입니다. 팀에서 UX/UI 디자인과 프론트엔드 설계를 맡았습니다.", more: "재료를 확인하는 화면은 냉장고 안쪽을 보는 장면으로, 보관 팁은 문에 붙은 포스트잇으로 표현했습니다.", tags: ["UX/UI", "Frontend"], media: [photo("fridge-dashboard.svg", "대시보드"), photo("fridge-inventory.svg", "재료 관리"), photo("fridge-recipes.svg", "추천 레시피")], links: [["Notion", article("UX-UI-Design-Frontend", "2a4b42633c8c80dd9a14fa1e5b0474e7")], ["GitHub", repo("25summer_Nangzango")]] },
      { id: "radar", track: "캡스톤 디자인", title: "Radar", text: "캡스톤 디자인 프로젝트입니다.", tags: ["Radar", "Capstone Design"], cover: "media/radar.gif", media: [photo("radar.jpg", "Radar 시연 화면")], links: [] }
    ] },
    { id: "cpp", label: "C++", badge: "C++", badgeColor: "#68558c", color: "#625aa1", pale: "#e3def9", mark: "maze", projects: [
      { id: "tilting-maze", title: "급할수록 돌아가라", text: "미로 자체를 회전시켜 돌을 굴리는 게임입니다. 카뮈의 『시지프 신화』와 ‘급할수록 돌아가라’는 속담에서 출발했습니다.", more: "미로의 각도에 맞춰 Box2D의 중력 방향을 갱신하고, 너비 우선 탐색(BFS)으로 최단 경로를 찾습니다.", tags: ["C++", "openFrameworks", "Box2D"], links: [["Notion · 작업 과정", article("Maze", "219b42633c8c80f88f11faa7cc64d376")]] }
    ] },
    { id: "vr", label: "VR", badge: "VR", badgeColor: "#052a6a", color: "#4a7198", pale: "#deebfa", mark: "vr", projects: [] },
    { id: "visual", label: "Visual", badge: "ART", badgeColor: "#a87d86", color: "#3b765b", pale: "#d9f0dc", mark: "prism", projects: [
      { id: "blender-clay", title: "Blender & Clay", text: "클레이로 캐릭터를 만들던 작업을 Blender의 모델링, 애니메이션과 렌더링으로 이어갔습니다. 기타 멀티이펙터의 분실된 노브를 모델링해 3D 프린터로 출력하기도 했습니다.", tags: ["Blender", "Clay", "3D Printing"], media: [photo("blender-bag.webp", "Blender 캐릭터 가방 렌더"), photo("blender-figure.webp", "Blender 캐릭터 렌더")], links: [["Notion · 작업 사진", article("3D-Modeling-with-blender-and-Clay-arts", "27bb42633c8c8003af37f3d9a9431d8b")]] },
      { id: "drawings-posters", title: "Posters & Drawings", text: "펜으로 기록한 사람과 풍경, 떠오른 생각을 모았습니다. 손으로 그리는 작업에서 출발해 이미지와 글자를 조합한 포스터로도 이어졌습니다.", tags: ["Drawing", "Graphic Design"], media: [photo("concert-poster.webp", "공연 포스터")], links: [["Notion · 작업 이미지", article("Drawing-Poster-works", "27bb42633c8c809aaf48d996c4b99cef")], ["Instagram", instagram]] }
    ] }
  ]
};
