import{s as g,l as Q,h as K,i as W,a as J}from"./countdown-1B-LzVIm.js";import{r as p,R as a,c as D,O as X,a as Z,b as R}from"./OrganizerSelect-FMxHs_QS.js";class ee{async fetchLeaderboardData(){try{const{data:t,error:r}=await g.from("bartenders").select(`
          id, 
          full_name,
          rating,
          rating_rd,
          rating_volatility,
          ranking,
          speed_rating,
          speed_rd,
          speed_volatility,
          speed_ranking,
          traditional_rating,
          traditional_rd,
          traditional_volatility,
          traditional_ranking,
          flair_rating,
          flair_rd,
          flair_volatility,
          flair_ranking
        `).eq("is_approved",!0).not("is_archived","eq",!0);if(r)throw r;return{legacy:t.filter(n=>n.rating!=null).sort((n,o)=>(o.rating||0)-(n.rating||0)).map(n=>({id:n.id,name:n.full_name,rating:n.rating,rating_rd:n.rating_rd,points:Math.round(n.rating||0),img:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'})),speed:t.filter(n=>n.speed_rating!=null).sort((n,o)=>(o.speed_rating||0)-(n.speed_rating||0)).map(n=>({id:n.id,name:n.full_name,rating:n.speed_rating,rating_rd:n.speed_rd,points:Math.round(n.speed_rating||0),img:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'})),traditional:t.filter(n=>n.traditional_rating!=null).sort((n,o)=>(o.traditional_rating||0)-(n.traditional_rating||0)).map(n=>({id:n.id,name:n.full_name,rating:n.traditional_rating,rating_rd:n.traditional_rd,points:Math.round(n.traditional_rating||0),img:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'})),flair:t.filter(n=>n.flair_rating!=null).sort((n,o)=>(o.flair_rating||0)-(n.flair_rating||0)).map(n=>({id:n.id,name:n.full_name,rating:n.flair_rating,rating_rd:n.flair_rd,points:Math.round(n.flair_rating||0),img:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'}))}}catch(t){return Q(t),{legacy:[],traditional:[],flair:[],speed:[]}}}}const te=new ee,ae='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>';function z({data:e,type:t,filter:r="total"}){const n=m=>t==="legacy"?Math.round(m.rating):r==="total"?m.points:m.points12mo,o=t==="legacy"?"Rating":"Points",i=m=>m%2===0?"even-row":"odd-row",c=e.map((m,w)=>`
    <tr class="${i(w)}">
      <td>${w+1}</td>
      <td>
        <div class="profile-pic" onclick="window.openProfile('${t}', ${w})">
          ${ae}
        </div>
      </td>
      <td>
        <span class="cursor-pointer hover:text-blue-400" onclick="window.showCompetitionHistory('${m.id}', '${m.name}')">${m.name}</span>
      </td>
      <td>${n(m)}</td>
    </tr>
  `).join("");return`
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Profile</th>
          <th>Name</th>
          <th>${o}</th>
        </tr>
      </thead>
      <tbody>
        ${c}
      </tbody>
    </table>
  `}const re=()=>`
  <div class="auth-prompt p-6 text-center">
    <h3 class="text-xl text-white mb-4">Sign in Required</h3>
    <p class="text-gray-300 mb-6">Please sign in or create an account to access this feature.</p>
    <a href="/enter" class="inline-block px-6 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors">
      Sign In / Sign Up
    </a>
  </div>
`,ne=e=>`
  <div class="p-6">
    <h3 class="text-xl text-white mb-4">Pending Profile Claim</h3>
    <p class="text-gray-300 mb-6">Your profile claim is currently under review.</p>
    <div class="bg-yellow-500/20 border border-yellow-400 rounded p-4 mb-6 text-yellow-200">
      <p>Please note that administrator approval is required before your claim is processed.</p>
    </div>
    <button id="cancel-claim" class="w-full py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors">
      Cancel Claim
    </button>
  </div>
`,$=D("BartenderSelect"),O=({value:e,onSelect:t,placeholder:r="Select a bartender",initialLabel:n="",excludeIds:o=[]})=>{const[i,c]=p.useState(n),[m,w]=p.useState(!1),[E,l]=p.useState([]),[b,y]=p.useState(!1),[v,k]=p.useState(null);p.useEffect(()=>{if(!i.trim()){l([]);return}const _=setTimeout(async()=>{y(!0);try{let x=g.from("bartenders").select("id, full_name, is_approved").ilike("full_name",`%${i}%`).is("is_archived",!1);o.length>0&&(x=x.not("id","in",`(${o.join(",")})`));const{data:L,error:q}=await x.limit(5);if(q)throw q;l(L||[])}catch(x){$.error("Failed to load bartenders:",x),k("Failed to load bartenders")}finally{y(!1)}},300);return()=>clearTimeout(_)},[i,o.join(",")]);const h=u=>{c(u.full_name),w(!1),t(u)},d=async()=>{try{const{data:{user:u}}=await g.auth.getUser();if(!u)throw new Error("Please sign in to add a new bartender");const{data:_,error:x}=await g.from("bartenders").insert({full_name:i.trim(),bar:"",rating:1500,rating_rd:350,rating_volatility:.06,is_profile_claimed:!1,is_approved:!1}).select().single();if(x)throw x;$.info("Created new bartender:",{id:_.id,name:_.full_name}),alert("New bartender created! Note: Bartenders need to be approved by an administrator before appearing on leaderboards."),c(_.full_name),w(!1),t(_)}catch(u){$.error("Error adding new bartender:",u),k(u.message)}};return a.createElement("div",{className:"relative"},a.createElement("input",{type:"text",value:i,onChange:u=>{c(u.target.value),w(!0)},onClick:()=>w(!0),placeholder:r,className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600"}),m&&(i.trim()||b||v)&&a.createElement("div",{className:"absolute z-50 w-full mt-1 bg-gray-800 rounded-md border border-gray-700 shadow-lg"},b&&a.createElement("div",{className:"p-2 text-gray-300 text-center"},"Loading..."),v&&a.createElement("div",{className:"p-2 text-red-400"},v),!b&&!v&&E.length>0&&a.createElement("div",null,E.map(u=>a.createElement("div",{key:u.id,className:"p-2 hover:bg-gray-700 cursor-pointer text-white",onClick:()=>h(u)},a.createElement("div",{className:"flex justify-between items-center"},a.createElement("span",null,u.full_name),u.is_approved===!1&&a.createElement("span",{className:"text-xs text-yellow-400 px-2 py-1 bg-gray-800 rounded"},"Pending")))),a.createElement("div",{className:"border-t border-gray-700 mt-2"})),i.trim()&&a.createElement("div",{className:"p-2 hover:bg-gray-700 cursor-pointer text-white flex justify-between items-center",onClick:d},a.createElement("span",null,'+ Add "',i.trim(),'" as new bartender'),a.createElement("span",{className:"text-gray-400"},"→")),!b&&!v&&i.trim()&&E.length===0&&!v&&a.createElement("div",{className:"p-2 text-gray-300 text-center"},"No matching bartenders found")))},oe=({onSuccess:e,onError:t})=>{const[r,n]=p.useState(null),[o,i]=p.useState(!1),[c,m]=p.useState(null),[w,E]=p.useState(!1),[l,b]=p.useState(null);p.useEffect(()=>{y()},[]);const y=async()=>{try{const{data:{user:h}}=await g.auth.getUser();if(!h)return;const{data:d,error:u}=await g.from("bartenders").select("id").contains("users_attempting_to_claim",[h.id]).single();if(u&&u.code!=="PGRST116")throw u;d&&m(d)}catch(h){t==null||t(h.message),b(h.message)}},v=async h=>{h.preventDefault(),i(!0),b(null),E(!1);try{const{data:{user:d}}=await g.auth.getUser();if(!d)throw new Error("Authentication required");if(!r)throw new Error("Please select a bartender profile");const{data:u,error:_}=await g.from("bartenders").select("is_profile_claimed, users_attempting_to_claim").eq("id",r.id).single();if(_)throw _;if(u!=null&&u.is_profile_claimed)throw new Error("This profile has already been claimed");const x=u.users_attempting_to_claim||[];if(!x.includes(d.id)){const{error:L}=await g.from("bartenders").update({users_attempting_to_claim:[...x,d.id]}).eq("id",r.id);if(L)throw L}E(!0),setTimeout(()=>{e==null||e()},2e3)}catch(d){b(d.message),t==null||t(d.message)}finally{i(!1)}},k=async()=>{if(c){i(!0);try{const{data:{user:h}}=await g.auth.getUser();if(!h)throw new Error("Authentication required");const{data:d}=await g.from("bartenders").select("users_attempting_to_claim").eq("id",c.id).single(),u=(d.users_attempting_to_claim||[]).filter(x=>x!==h.id),{error:_}=await g.from("bartenders").update({users_attempting_to_claim:u}).eq("id",c.id);if(_)throw _;m(null),e==null||e({cancelled:!0})}catch(h){b(h.message),t==null||t(h.message)}finally{i(!1)}}};return c?a.createElement("div",{className:"p-6"},a.createElement("h3",{className:"text-xl text-white mb-4"},"Pending Profile Claim"),a.createElement("p",{className:"text-gray-300 mb-6"},"Your profile claim is currently under review by an administrator."),a.createElement("button",{onClick:k,disabled:o,className:"w-full py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"},o?"Processing...":"Cancel Claim")):a.createElement("form",{onSubmit:v,className:"p-6"},a.createElement("h3",{className:"text-xl text-white mb-6"},"Claim Your Profile"),l&&a.createElement("div",{className:"error-message mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200"},l),w&&a.createElement("div",{className:"success-message mb-4 p-3 bg-green-500/20 border border-green-500 rounded text-green-200"},"Profile claim submitted successfully! Your claim will be reviewed by an administrator."),a.createElement("div",{className:"mb-6"},a.createElement("label",{className:"block text-white mb-2"},"Select Your Profile"),a.createElement(O,{onSelect:n,placeholder:"Search for your profile",unclaimedOnly:!0})),a.createElement("button",{type:"submit",disabled:o||!r||w,className:"w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"},o?"Submitting...":"Submit Claim"))},ie=({onSelect:e,placeholder:t="Search for competition"})=>{const[r,n]=p.useState(""),[o,i]=p.useState(!1),[c,m]=p.useState([]),[w,E]=p.useState(!1),[l,b]=p.useState(null);p.useEffect(()=>{if(!r.trim()){m([]);return}const k=setTimeout(async()=>{E(!0);try{const{data:h,error:d}=await g.from("legacy_competitions").select("id, name, date, venue").ilike("name",`%${r}%`).order("date",{ascending:!1}).limit(5);if(d)throw d;m(h||[])}catch(h){console.error("Error fetching competitions:",h),b("Failed to load competitions")}finally{E(!1)}},300);return()=>clearTimeout(k)},[r]);const y=()=>{e({name:r.trim(),isNew:!0}),n(r.trim()),i(!1)};return a.createElement("div",{className:"relative"},a.createElement("input",{type:"text",value:r,onChange:v=>{n(v.target.value),i(!0)},onClick:()=>i(!0),placeholder:t,className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600"}),o&&r.trim()&&a.createElement("div",{className:"absolute z-50 w-full mt-1 bg-gray-800 rounded-md border border-gray-700 shadow-lg max-h-60 overflow-y-auto"},w&&a.createElement("div",{className:"p-2 text-gray-300 text-center"},"Loading..."),l&&a.createElement("div",{className:"p-2 text-red-400"},l),!w&&!l&&c.length>0&&a.createElement("div",null,c.map(v=>a.createElement("div",{key:v.id,className:"p-2 hover:bg-gray-700 cursor-pointer text-white",onClick:()=>{e(v),n(v.name),i(!1)}},a.createElement("div",null,v.name),a.createElement("div",{className:"text-gray-400 text-sm"},new Date(v.date).toLocaleDateString()," - ",v.venue),a.createElement("hr",{className:"border-t border-gray-700 mt-2"}))),a.createElement("div",{className:"border-t border-gray-700 mt-2"})),a.createElement("div",{className:"p-2 hover:bg-gray-700 cursor-pointer text-white flex justify-between items-center",onClick:y},a.createElement("span",null,'+ Add "',r.trim(),'" as new competition'),a.createElement("span",{className:"text-gray-400"},"→"))))},H=D("VenueSelect"),se=({value:e,onSelect:t,placeholder:r="Select a venue",initialLabel:n=""})=>{const[o,i]=p.useState(n),[c,m]=p.useState(!1),[w,E]=p.useState([]),[l,b]=p.useState(!1),[y,v]=p.useState(null);p.useEffect(()=>{if(!o.trim()){E([]);return}const u=setTimeout(async()=>{b(!0);try{const{data:_,error:x}=await g.from("venues").select("id, name, city, country").ilike("name",`%${o}%`).is("is_archived",!1).order("name").limit(5);if(x)throw x;E(_||[])}catch(_){H.error("Failed to load venues:",_),v("Failed to load venues")}finally{b(!1)}},300);return()=>clearTimeout(u)},[o]);const k=d=>{i(d.name),m(!1),t(d)},h=async()=>{try{const{data:{user:d}}=await g.auth.getUser();if(!d)throw new Error("Please sign in to add a new venue");const{data:u,error:_}=await g.from("venues").insert({name:o.trim(),created_by:d.id}).select().single();if(_)throw _;H.info("Created new venue:",{id:u.id,name:u.name}),i(u.name),m(!1),t(u)}catch(d){H.error("Error adding new venue:",d),v(d.message)}};return a.createElement("div",{className:"relative"},a.createElement("input",{type:"text",value:o,onChange:d=>{i(d.target.value),m(!0)},onClick:()=>m(!0),placeholder:r,className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600"}),c&&(o.trim()||l||y)&&a.createElement("div",{className:"absolute z-50 w-full mt-1 bg-gray-800 rounded-md border border-gray-700 shadow-lg"},l&&a.createElement("div",{className:"p-2 text-gray-300 text-center"},"Loading..."),y&&a.createElement("div",{className:"p-2 text-red-400"},y),!l&&!y&&w.length>0&&a.createElement("div",null,w.map(d=>a.createElement("div",{key:d.id,className:"p-2 hover:bg-gray-700 cursor-pointer text-white",onClick:()=>k(d)},a.createElement("div",null,d.name),d.city&&d.country&&a.createElement("div",{className:"text-gray-400 text-sm"},d.city,", ",d.country))),a.createElement("div",{className:"border-t border-gray-700 mt-2"})),o.trim()&&a.createElement("div",{className:"p-2 hover:bg-gray-700 cursor-pointer text-white flex justify-between items-center",onClick:h},a.createElement("span",null,'+ Add "',o.trim(),'" as new venue'),a.createElement("span",{className:"text-gray-400"},"→")),!l&&!y&&o.trim()&&w.length===0&&!y&&a.createElement("div",{className:"p-2 text-gray-300 text-center"},"No matching venues found")))},le=[{id:"state final",label:"State Final"},{id:"national final",label:"National Final"},{id:"global final",label:"Global Final"}],ce=({onSuccess:e,onError:t})=>{const[r,n]=p.useState(!1),[o,i]=p.useState(""),[c,m]=p.useState([{id:"",position:""}]),[w,E]=p.useState(!1),[l,b]=p.useState({date:"",venue_id:"",venue_name:"",organizer_id:"",organizer_name:"",source_url:"",category:"legacy",country:"",round:"state final"}),[y,v]=p.useState(null),[k,h]=p.useState(!1),d=()=>{const{organizer_name:s,date:f,round:S,country:C}=l,M=(y==null?void 0:y.name)||"";if(!f||!s||!M||!S)return null;const N=new Date(f).getFullYear();return`${s} ${M} ${N} ${S} ${C||""}`.trim()},u=s=>{v(s),E(!(s!=null&&s.id)),s!=null&&s.id&&b(f=>({...f,date:s.date,venue_id:s.venue_id,venue_name:s.venue,organizer_id:s.organizer,category:s.category||"legacy",country:s.country||""}))},_=async s=>{try{const{data:f}=await g.from("organisers").select("organisation_name").eq("id",s.id).single();b(S=>({...S,organizer_id:s.id,organizer_name:(f==null?void 0:f.organisation_name)||""}))}catch(f){console.error("Error fetching organizer details:",f),i("Error fetching organizer details")}},x=s=>{b(f=>({...f,venue_id:s.id,venue_name:s.name}))},L=s=>({1:25,2:15,3:15,4:12,5:10,6:8,7:6,8:4,9:2,10:1})[s]||0,q=async s=>{s.preventDefault(),n(!0),i(""),h(!1);try{const{data:{user:f},error:S}=await g.auth.getUser();if(S)throw new Error("Authentication error");if(!f)throw new Error("Please sign in to submit results");if(w){if(!l.date)throw new Error("Date is required");if(!l.organizer_id)throw new Error("Organizer is required");if(!l.venue_id)throw new Error("Venue is required");if(!(y!=null&&y.name))throw new Error("Competition name is required");if(!l.round)throw new Error("Competition round is required")}let C;if(y!=null&&y.id)C=y.id;else{const N=d();if(!N)throw new Error("Unable to generate competition name - missing required fields");const{data:P,error:A}=await g.from("legacy_competitions").insert({name:N,date:l.date,venue:l.venue_name,venue_id:l.venue_id,organizer:l.organizer_id,category:l.category,country:l.country||null,created_by:f.id,status:"pending"}).select().single();if(A)throw A;C=P.id}const M=c.filter(N=>N.id&&N.position);if(M.length===0)throw new Error("At least one competitor with position is required");for(const N of M){const{error:P}=await g.from("legacy_results").insert({legacy_competition_id:C,bartender_id:N.id,placement:parseInt(N.position,10),points:L(parseInt(N.position,10)),status:"pending",created_by:f.id,competition_category:l.category});if(P)throw P}if(l.source_url){const{error:N}=await g.from("sources").insert({legacy_competition_id:C,url:l.source_url,created_by:f.id});if(N)throw N}h(!0),setTimeout(()=>{V(),e==null||e()},2e3)}catch(f){console.error("Submission error:",f),i(f.message),t==null||t(f.message)}finally{n(!1)}},V=()=>{b({date:"",venue_id:"",venue_name:"",organizer_id:"",organizer_name:"",source_url:"",category:"legacy",country:"",round:"state final"}),v(null),m([{id:"",position:""}]),E(!1),h(!1)},Y=()=>{m(s=>[...s,{id:"",position:""}])},G=s=>{m(f=>f.filter((S,C)=>C!==s))};return a.createElement("div",{className:"p-6 bg-gray-800 rounded-lg"},a.createElement("h3",{className:"text-xl text-white mb-6"},"Submit Competition Result"),o&&a.createElement("div",{className:"error-message mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200"},o),k&&a.createElement("div",{className:"success-message mb-4 p-3 bg-green-500/20 border border-green-500 rounded text-green-200"},"Competition result submitted successfully! Your submission will be reviewed by an administrator."),a.createElement("form",{onSubmit:q,className:"space-y-6"},a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Competition *"),a.createElement(ie,{onSelect:u,placeholder:"Search or add competition"})),w&&a.createElement(a.Fragment,null,a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Organizer *"),a.createElement(X,{onSelect:_,placeholder:"Select organizer"})),a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Venue *"),a.createElement(se,{onSelect:x,placeholder:"Select or add venue"})),a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Round *"),a.createElement("select",{value:l.round,onChange:s=>b({...l,round:s.target.value}),className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600",required:!0},le.map(s=>a.createElement("option",{key:s.id,value:s.id},s.label)))),a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Category *"),a.createElement("select",{value:l.category,onChange:s=>b({...l,category:s.target.value}),className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600",required:!0},a.createElement("option",{value:"legacy"},"Legacy Competition"),a.createElement("option",{value:"speed"},"Speed"),a.createElement("option",{value:"flair"},"Flair"),a.createElement("option",{value:"traditional"},"Traditional"))),a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Country"),a.createElement("select",{value:l.country,onChange:s=>b({...l,country:s.target.value}),className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600"},a.createElement("option",{value:""},"Select country"),Z.map(s=>a.createElement("option",{key:s,value:s},s)))),a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Date *"),a.createElement("input",{type:"date",value:l.date,onChange:s=>b({...l,date:s.target.value}),className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600",required:!0}))),a.createElement("div",{className:"form-group"},a.createElement("label",{className:"block text-white mb-2"},"Source URL *"),a.createElement("input",{type:"url",value:l.source_url,onChange:s=>b({...l,source_url:s.target.value}),className:"w-full p-2 bg-gray-700 text-white rounded border border-gray-600",required:!0,placeholder:"Link to competition results"})),a.createElement("div",{className:"competitors-section mt-8"},a.createElement("h3",{className:"text-lg text-white mb-4"},"Competitors *"),c.map((s,f)=>a.createElement("div",{key:f,className:"competitor-entry mb-4 p-4 bg-gray-700 rounded"},a.createElement("div",{className:"mb-3"},a.createElement("label",{className:"block text-white mb-2"},"Competitor Name *"),a.createElement(O,{onSelect:S=>{const C=[...c];C[f].id=S.id,m(C)},placeholder:"Search for competitor"})),a.createElement("div",{className:"mb-3"},a.createElement("label",{className:"block text-white mb-2"},"Position *"),a.createElement("input",{type:"number",value:s.position,onChange:S=>{const C=[...c];C[f].position=S.target.value,m(C)},className:"w-full p-2 bg-gray-600 text-white rounded border border-gray-500",required:!0,min:"1"})),f>0&&a.createElement("button",{type:"button",onClick:()=>G(f),className:"text-red-400 hover:text-red-300 px-4 py-2 border border-red-500 rounded hover:bg-red-500/20 transition-colors"},"Remove Competitor"))),a.createElement("button",{type:"button",onClick:Y,className:"w-full p-2 border border-gray-400 text-gray-300 rounded hover:bg-gray-700 transition-colors"},"Add Competitor")),a.createElement("button",{type:"submit",disabled:r,className:"w-full p-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"},r?"Submitting...":"Submit Result")))},de=`
  <style>
    .modal-content {
      max-height: 90vh;
      width: 90%;
      max-width: 500px;
      overflow-y: auto;
      background: var(--color-background);
      padding: var(--spacing-lg);
      border-radius: 8px;
    }

    .bartender-select-container {
      width: 100%;
      max-width: 400px;
    }

    .organizer-select-container {
      width: 100%;
      max-width: 400px;
    }

    .select-dropdown {
      max-height: 300px;
      overflow-y: auto;
      background: var(--color-background) !important;
    }

    .select-option {
      color: var(--color-text) !important;
      background: var(--color-background) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .select-option:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    .auth-prompt {
      text-align: center;
      padding: var(--spacing-xl);
    }

    .auth-prompt h3 {
      margin-bottom: var(--spacing-md);
      color: var(--color-text);
    }

    .auth-prompt p {
      margin-bottom: var(--spacing-lg);
      color: var(--color-text-muted);
    }

    .auth-prompt-button {
      display: inline-block;
      padding: var(--spacing-sm) var(--spacing-lg);
      background: var(--color-text);
      color: var(--color-background);
      border-radius: 4px;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .auth-prompt-button:hover {
      opacity: 0.9;
    }
  </style>
`;function me(e){if(!e)return;const t=e.closest(".profile-modal");t&&(e.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),B(t)}),t.addEventListener("click",r=>{r.target===t&&B(t)}),document.addEventListener("keydown",r=>{r.key==="Escape"&&t.style.display==="flex"&&B(t)}))}function B(e){e&&(e.style.opacity="0",setTimeout(()=>{e.style.display="none",e.style.opacity="1";const t=document.getElementById(e.dataset.previousFocus);t&&t.focus(),e.dispatchEvent(new CustomEvent("modalclose"))},300))}function ue(e){var r;if(!e)return;e.dataset.previousFocus=((r=document.activeElement)==null?void 0:r.id)||"",e.style.display="flex",e.style.opacity="0",e.offsetHeight,requestAnimationFrame(()=>{e.style.opacity="1"});const t=e.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');t&&t.focus()}const ge={initializeFocusTrap(e){const t=e.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),r=t[0],n=t[t.length-1];e.addEventListener("keydown",o=>{o.key==="Tab"&&(o.shiftKey?document.activeElement===r&&(o.preventDefault(),n.focus()):document.activeElement===n&&(o.preventDefault(),r.focus()))})},show:ue,close:B};window.modalHelpers=ge;let I=!1;function pe(){return`
    ${de}
    <div class="modal-wrapper">
      <!-- Profile Modal -->
      <div id="profile-modal" class="profile-modal" style="display: none;" tabindex="-1">
        <div class="modal-content">
          <button class="modal-close" type="button">&times;</button>
          <h2>Competitor Profile</h2>
          <div class="profile-details">
            <p><strong>Name:</strong> <span id="modal-name"></span></p>
            <p><strong>Total Points:</strong> <span id="modal-points"></span></p>
            <p><strong>Bio:</strong> <span id="modal-bio"></span></p>
          </div>
        </div>
      </div>

      <!-- Claim Profile Modal -->
      <div id="claim-profile-modal" class="profile-modal" style="display: none;" tabindex="-1">
        <div id="claim" class="modal-content">
          <button class="modal-close" type="button">&times;</button>
          <div id="claim-profile-content"></div>
        </div>
      </div>

      <!-- Submit Result Modal -->
      <div id="submit-result-modal" class="profile-modal" style="display: none;" tabindex="-1">
        <div class="modal-content">
          <button class="modal-close" type="button">&times;</button>
          <div id="submit-result-content"></div>
        </div>
      </div>
    </div>
  `}async function fe(){if(I)return;const e=document.querySelector(".modal-wrapper");if(!e){console.warn("Modal wrapper not found, skipping initialization");return}const t=e.querySelectorAll(".modal-close");t.length>0&&t.forEach(r=>me(r)),window.openProfile=(r,n)=>{he(document.getElementById("profile-modal"),r,n)},document.querySelectorAll(".action-button").forEach(r=>{r.addEventListener("click",async n=>{var E,l;n.preventDefault();const o=`${r.dataset.modal}-modal`,i=document.getElementById(o);if(!i){console.warn(`Modal ${o} not found`);return}const c=i.querySelector(`#${r.dataset.modal}-content`);if(!c){console.warn(`Content div not found in modal ${o}`);return}let m;try{m=await g.auth.getSession()}catch(b){if((E=b.message)!=null&&E.includes("storage is not allowed")){const{data:y}=await g.auth.getUser();m={data:{session:y?{user:y}:null}}}else throw b}!!((l=m==null?void 0:m.data)!=null&&l.session)?(c._root||(c._root=R(c)),r.dataset.modal==="claim-profile"?be(c):r.dataset.modal==="submit-result"&&c._root.render(a.createElement(ce,{onSuccess:()=>{i.style.display="none"},onError:b=>{console.error("Error submitting result:",b)}}))):c.innerHTML=re(),i.style.display="flex",i.focus()})}),I=!0}async function be(e){try{const{data:{user:t}}=await g.auth.getUser();if(!t)throw new Error("Authentication required");const{data:r}=await g.from("submissions").select("id, status").eq("user_id",t.id).eq("status","pending").like("content",'%"type":"profile_claim"%'),n=r==null?void 0:r[0];n?(e.innerHTML=ne(n),ye()):(e._root||(e._root=R(e)),e._root.render(a.createElement(oe,{onSuccess:()=>{const o=e.closest(".profile-modal");o&&(o.style.display="none")},onError:o=>{console.error("Error submitting claim:",o)}})))}catch(t){console.error("Error handling claim modal:",t),e.innerHTML=`
      <div class="error-message">
        An error occurred. Please try again later.
      </div>
    `}}function ye(){const e=document.getElementById("cancel-claim");e&&e.addEventListener("click",async()=>{try{const{data:{user:t}}=await g.auth.getUser();if(!t)return;const{data:r}=await g.from("submissions").select("*").eq("user_id",t.id).eq("status","pending").single();if(r){const{error:n}=await g.from("submissions").update({status:"cancelled"}).eq("id",r.id);if(n)throw n;const o=document.getElementById("claim-profile-modal");o&&(o.style.display="none");const i=document.createElement("div");i.className="success-message mb-4 p-3 bg-green-500/20 border border-green-500 rounded text-green-200",i.textContent="Claim cancelled successfully",document.body.appendChild(i),setTimeout(()=>{i.remove(),location.reload()},3e3)}}catch(t){console.error("Error cancelling claim:",t),alert(t.message)}})}const U={initializeFocusTrap(e){const t=e.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),r=t[0],n=t[t.length-1];e.addEventListener("keydown",o=>{o.key==="Tab"&&(o.shiftKey?document.activeElement===r&&(o.preventDefault(),n.focus()):document.activeElement===n&&(o.preventDefault(),r.focus()))})},show(e){var r;if(!e)return;e.dataset.previousFocus=((r=document.activeElement)==null?void 0:r.id)||"",e.style.display="flex",e.style.opacity="0",e.offsetHeight,requestAnimationFrame(()=>{e.style.opacity="1"});const t=e.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');t&&t.focus()},close(e){e&&(e.style.opacity="0",setTimeout(()=>{e.style.display="none",e.style.opacity="1";const t=document.getElementById(e.dataset.previousFocus);t&&t.focus(),e.dispatchEvent(new CustomEvent("modalclose"))},300))}};window.modalHelpers=U;function he(e,t,r){var o,i;const n=(i=(o=window.leaderboardData)==null?void 0:o[t])==null?void 0:i[r];n&&(document.getElementById("modal-name").textContent=n.name,document.getElementById("modal-points").textContent=n.points,document.getElementById("modal-bio").textContent=n.bio||"No bio available",U.show(e))}let T={traditional:[],flair:[],speed:[],legacy:[]};async function ve(e){if(!e)return!1;const{data:t}=await g.from("bartenders").select("id").contains("users_attempting_to_claim",[e]);return(t==null?void 0:t.length)>0}async function we(e){if(!e)return!1;const{data:t}=await g.from("bartenders").select("is_profile_claimed").eq("user_id",e).single();return(t==null?void 0:t.is_profile_claimed)||!1}async function Ee(){const e=document.querySelector(".column-right-content");if(e)try{await _e();const{data:{user:t}}=await g.auth.getUser(),r=t==null?void 0:t.id,n=await we(r),o=await ve(r),i=!n&&!o;e.innerHTML=await xe(i,o);const c=document.createElement("div");c.innerHTML=pe(),document.body.appendChild(c),await Ne(),await fe()}catch(t){console.error("Error initializing leaderboards:",t),e.innerHTML='<div class="error-message">Error loading leaderboard data</div>'}}async function _e(){try{T=await te.fetchLeaderboardData()}catch(e){throw console.error("Error loading leaderboard data:",e),e}}async function xe(e,t){return`
    ${Ce(e,t)}
    ${F("speed","MBC Speed Leaderboard")}
    ${F("traditional","MBC Traditional Leaderboard",!0)}
    ${F("flair","MBC Flair Leaderboard",!0)}
  `}function Ce(e,t){let r="";return t?r='<button class="action-button" disabled>Claim Pending</button>':e&&(r='<button class="action-button" data-modal="claim-profile">Claim Profile</button>'),`
    <div id="legacy-section" class="leaderboard-container">
      <h2>Legacy Leaderboard</h2>
      <div class="button-container">
        <div class="filter-buttons">
          <button class="filter-button active" data-filter="total">Total Points</button>
          <button class="filter-button" data-filter="12mo">Last 12 Months</button>
        </div>
        <div class="action-buttons">
          ${r}
          <button class="action-button" data-modal="submit-result">Submit Result</button>
        </div>
      </div>
      ${z({data:T.legacy,type:"legacy"})}
    </div>
  `}function F(e,t,r=!1){return`
    <div id="${e}-section" class="leaderboard-container${r?" coming-soon":""}">
      <h2>${t}</h2>
      ${z({data:T[e],type:e})}
    </div>
  `}async function Ne(){const e=document.querySelectorAll(".filter-button"),t=document.querySelector("#legacy-section tbody");e.forEach(r=>{r.addEventListener("click",()=>{const n=r.dataset.filter;if(e.forEach(o=>o.classList.remove("active")),r.classList.add("active"),t){const o=z({data:T.legacy,type:"legacy",filter:n}),i=document.createElement("div");i.innerHTML=o,t.innerHTML=i.querySelector("tbody").innerHTML}})})}function j(){const e=document.querySelector(".content");if(e&&!document.querySelector(".large-header")){const t=document.createElement("header");t.className="large-header";const r=document.createElement("div");r.className="scrolling-wrapper",r.innerHTML=`
      <div class="scrolling-text">
        MASTER BARTENDING CHAMPIONSHIP&nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div class="scrolling-text">
        MASTER BARTENDING CHAMPIONSHIP&nbsp;&nbsp;&nbsp;&nbsp;
      </div>
    `,t.appendChild(r);const n=document.querySelector(".small-header");n?n.after(t):e.insertBefore(t,e.firstChild),t.offsetHeight,r.style.animationPlayState="running"}}window.openProfile=function(e,t){const r=document.querySelector("#profile-modal");if(!r){console.error("Profile modal not found");return}if(!window.leaderboardData||!window.leaderboardData[e]||!window.leaderboardData[e][t]){console.error("Leaderboard data not found",{type:e,index:t});return}const n=window.leaderboardData[e][t],o=document.getElementById("modal-name"),i=document.getElementById("modal-points"),c=document.getElementById("modal-bio");o&&(o.textContent=n.name),i&&(i.textContent=e==="legacy"?Math.round(n.rating):n.points||0),c&&(c.textContent=n.bio||"No bio available"),r.classList.add("show"),r.style.display="flex"};window.showCompetitionHistory=function(e,t){let r=document.getElementById("competition-history-modal");r||(r=document.createElement("div"),r.id="competition-history-modal",r.className="profile-modal",document.body.appendChild(r)),r.innerHTML=`
    <div class="modal-content">
      <button class="modal-close" type="button" onclick="this.closest('.profile-modal').style.display = 'none'">&times;</button>
      <h2>${t}'s Competition History</h2>
      <div id="competition-history-content" class="competition-history-content">
        <div class="loading-spinner">Loading competition history...</div>
      </div>
    </div>
  `,r.style.display="flex",Se(e,t)};async function Se(e,t){try{const r=await window.supabase.from("legacy_results").select(`
        placement,
        post_competition_rating,
        pre_competition_rating,
        legacy_competition_id,
        legacy_competitions (
          name,
          date
        )
      `).eq("bartender_id",e);if(r.error)throw r.error;ke(r.data||[],e,t)}catch(r){console.error("Error fetching competition history:",r);const n=document.getElementById("competition-history-content");n&&(n.innerHTML=`
        <div class="error-message">
          Failed to load competition history. Please try again later.
        </div>
      `)}}function ke(e,t,r){const n=document.getElementById("competition-history-content");if(!n)return;if(e.length===0){n.innerHTML='<div class="no-data">No competition history found for this bartender.</div>';return}const o=e.map(i=>{var E,l;const c=i.post_competition_rating&&i.pre_competition_rating?Math.round(i.post_competition_rating-i.pre_competition_rating):0,m=c>0?"positive-change":c<0?"negative-change":"";return`
      <tr>
        <td>${(E=i.legacy_competitions)!=null&&E.date?new Date(i.legacy_competitions.date).toLocaleDateString():"Unknown date"}</td>
        <td>${((l=i.legacy_competitions)==null?void 0:l.name)||"Unknown competition"}</td>
        <td>${i.placement||"N/A"}</td>
        <td class="${m}">
          ${c>0?"+":""}${c}
        </td>
      </tr>
    `}).join("");n.innerHTML=`
    <table class="competition-history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Competition</th>
          <th>Placement</th>
          <th>Rating Change</th>
        </tr>
      </thead>
      <tbody>
        ${o}
      </tbody>
    </table>
  `}document.addEventListener("DOMContentLoaded",function(){j(),K(),W(),Ee(),J()});window.addEventListener("load",j);
