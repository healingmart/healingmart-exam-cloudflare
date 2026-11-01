(()=>{const key="healingmart-exam-theme";const root=document.documentElement;const button=document.getElementById("themeToggle");
function current(){return root.dataset.theme==="dark"?"dark":"light"}
function render(){const dark=current()==="dark";document.querySelector('meta[name="theme-color"]')?.setAttribute("content",dark?"#0b1424":"#ffffff");button?.setAttribute("aria-pressed",String(dark));button?.setAttribute("aria-label",dark?"라이트 모드로 전환":"다크 모드로 전환");button?.setAttribute("title",dark?"라이트 모드":"다크 모드");if(button){button.querySelector(".theme-toggle-label").textContent=dark?"라이트":"다크";}}
if(button){button.addEventListener("click",()=>{const next=current()==="dark"?"light":"dark";root.dataset.theme=next;root.style.colorScheme=next;try{localStorage.setItem(key,next)}catch(e){}render()});render()}
const mq=window.matchMedia?.("(prefers-color-scheme: dark)");
mq?.addEventListener?.("change",e=>{let saved=null;try{saved=localStorage.getItem(key)}catch(err){}if(saved!=="dark"&&saved!=="light"){root.dataset.theme=e.matches?"dark":"light";root.style.colorScheme=root.dataset.theme;render()}})
})();