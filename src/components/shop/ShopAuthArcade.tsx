import { homepageGhostBody } from "@/components/ghost-shape";

export function ShopAuthArcade() {
  return (
    <svg viewBox="0 0 640 468" aria-hidden="true" focusable="false">
      <ellipse cx="321" cy="221" rx="259" ry="159" transform="rotate(-18 321 221)" fill="none" stroke="#c8dbc0" />
      <ellipse cx="321" cy="221" rx="257" ry="173" transform="rotate(18 321 221)" fill="none" stroke="#d8e6cf" strokeDasharray="3 6" />
      <ellipse cx="315" cy="399" rx="267" ry="34" fill="#cfdfc7" opacity=".43" />
      <ellipse cx="415" cy="370" rx="136" ry="20" fill="#557451" opacity=".14" />
      <ellipse cx="149" cy="374" rx="79" ry="13" fill="#557451" opacity=".17" />

      {/* Cables from the joystick to the console and from the console to the CRT. */}
      <g fill="none" stroke="#34493e" strokeWidth="5" strokeLinecap="round">
        <path d="M348 390C390 394 400 423 460 419S527 372 485 351" />
        <path d="M490 342C538 342 571 321 567 268" />
      </g>

      {/* CRT cabinet and recessed screen. */}
      <path d="M509 76l53 23q18 7 18 26v119q0 13-12 20l-45 27-20-33z" fill="#8ea28c" stroke="#293e33" strokeWidth="2" />
      <path d="M548 126l18 7m-18 3 18 7m-18 3 18 7m-18 3 18 7m-18 3 18 7" fill="none" stroke="#516a58" strokeWidth="3" strokeLinecap="round" />
      <rect x="560" y="261" width="12" height="12" rx="2" fill="#34493e" />
      <path d="M373 279h69l7 34h-83z" fill="#8ea28c" stroke="#293e33" strokeWidth="2" />
      <rect x="269" y="76" width="272" height="216" rx="23" fill="#dce6d1" stroke="#293e33" strokeWidth="3" />
      <path d="M291 84h226q12 0 16 10" fill="none" stroke="#f5f8ee" strokeWidth="3" strokeLinecap="round" />
      <rect x="285" y="94" width="240" height="172" rx="19" fill="#4e6455" />
      <rect x="293" y="102" width="224" height="156" rx="15" fill="#172b25" />

      {/* Original arcade maze, with a small pixel character and a trail of dots. */}
      <g fill="none" stroke="#507663" strokeWidth="4" strokeLinecap="square">
        <path d="M307 162v-38h71v33h-34m-20-15h35m35-18h105v30h-34m-47-15h28v28h-52" />
        <path d="M307 182v57h60v-20h-35m53 20h42v-18h51v18h21v-64h-38v24h-42" />
      </g>
      <path d="M351 173h16v4h6v8h-11v7h11v6h-6v5h-18v-4h-7v-6h-4v-12h5v-5h8z" fill="#b3ed79" />
      <path d="M359 177h5v5h-5z" fill="#172b25" />
      <path d="M386 186h4v4h-4zm14 0h4v4h-4zm14 0h4v4h-4zm14 0h4v4h-4z" fill="#e7f6cc" />
      <path d="M478 169h8v8h-8z" fill="#f1b688" />
      <path d="M300 115h209m-214 17h220m-220 17h220m-220 17h220m-220 17h220m-220 17h220m-220 17h220m-220 17h220m-215 17h211" stroke="#c1f1d2" opacity=".075" />
      <path d="M291 278h11m5 0h11m5 0h11" stroke="#779078" strokeWidth="3" strokeLinecap="round" />
      <circle cx="515" cy="277" r="4" fill="#649e51" />

      {/* Console and wired controller. */}
      <path d="M319 329l18-20h138l17 20v32H319z" fill="#acbc9f" stroke="#293e33" strokeWidth="2" strokeLinejoin="round" />
      <rect x="319" y="329" width="173" height="32" rx="5" fill="#485e50" stroke="#293e33" strokeWidth="2" />
      <path d="M371 317h63l5 5h-73z" fill="#485e50" />
      <rect x="333" y="341" width="24" height="7" rx="2" fill="#20332a" />
      <rect x="362" y="341" width="24" height="7" rx="2" fill="#20332a" />
      <circle cx="471" cy="344" r="4" fill="#98e56e" />

      {/* Evolve ghost, looking at the screen with a hand on the stick. */}
      <g transform="translate(148 302) scale(7.5)" shapeRendering="crispEdges">
        <path d={homepageGhostBody} fill="#70ad74" stroke="#294738" strokeWidth=".42" />
        <path d="M-9-2h2v6h2v2h2v2h-3V6h-3zM-2 6h5v2h-5z" fill="#548e64" />
        <path d="M-5-7h4v2h-4v2h-2v-2h2z" fill="#a0cf8f" />
        <path d="M-4-3h5v6h-5zM3-3h5v6H3z" fill="#f4f9eb" />
        <path d="M-1-2h2v4h-2zM6-2h2v4H6z" fill="#233d31" />
        <path d="M0 4h4v1H0z" fill="#39674d" />
      </g>
      <path d="M217 368h129l16 20v16a7 7 0 0 1-7 7H210a7 7 0 0 1-7-7v-16z" fill="#536a59" stroke="#2a4034" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M217 368h129l16 20H203z" fill="#a9bb9f" stroke="#2a4034" strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="245" cy="377" rx="15" ry="5" fill="#43594b" />
      <path d="M245 377l-5-30" stroke="#2a4034" strokeWidth="7" strokeLinecap="round" />
      <circle cx="239" cy="344" r="11" fill="#345943" stroke="#203d30" strokeWidth="2" />
      <path d="M209 319h10v7h9v7h12v7h-5v8h-13v-7h-9v-7h-8v-9h4z" fill="#70ad74" stroke="#294738" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="306" cy="377" rx="10" ry="5" fill="#4d7f55" />
      <ellipse cx="332" cy="377" rx="10" ry="5" fill="#447153" />
      <ellipse cx="306" cy="374" rx="9" ry="4" fill="#a5df7c" />
      <ellipse cx="332" cy="374" rx="9" ry="4" fill="#7bbb66" />
      <path d="M215 399h18" stroke="#859d84" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
