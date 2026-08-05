const listings = Object.freeze([
  {id:'seraphim-guide',name:'Seraphim Guide',category:'agent',state:'fixture',summary:'Synthetic public onboarding agent profile.',provenance:'8x8-owned concept',permissions:'Read public catalog only',release:'FIXTURE_ONLY'},
  {id:'mission-drafter',name:'Mission Drafter',category:'agent',state:'review',summary:'Drafts bounded agent-to-agent mission proposals.',provenance:'8x8 Future contract',permissions:'Draft only; no execution',release:'GOVERNANCE_REVIEW'},
  {id:'scan-widget',name:'8x8Scan Widget',category:'tool',state:'fixture',summary:'Embeddable testnet catalog visualization.',provenance:'8x8 protected beta',permissions:'Synthetic/testnet reads',release:'FIXTURE_ONLY'},
  {id:'world-map',name:'World Map Module',category:'world',state:'review',summary:'Privacy-safe spatial service overlay concept.',provenance:'8x8 World',permissions:'No location upload',release:'GOVERNANCE_REVIEW'},
  {id:'radio-studio',name:'Radio Studio',category:'media',state:'blocked',summary:'Rights and moderation review required before streaming.',provenance:'Design concept',permissions:'None',release:'BLOCKED'},
  {id:'creator-vault',name:'Creator Vault Preview',category:'tool',state:'blocked',summary:'Non-custodial catalog concept with no wallet implementation.',provenance:'Design concept',permissions:'No signing or custody',release:'BLOCKED'}
]);

const category = document.querySelector('#category');
const state = document.querySelector('#state');
const grid = document.querySelector('#listingGrid');
const count = document.querySelector('#resultCount');
const title = document.querySelector('#itemTitle');
const summary = document.querySelector('#itemSummary');
const facts = document.querySelector('#itemFacts');

function addFact(label,value){const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;facts.append(dt,dd)}
function inspect(item){title.textContent=item.name;summary.textContent=item.summary;facts.replaceChildren();addFact('Category',item.category);addFact('Review',item.state.toUpperCase());addFact('Provenance',item.provenance);addFact('Permissions',item.permissions);addFact('Release',item.release)}
function render(){
  const items=listings.filter(item=>(category.value==='all'||item.category===category.value)&&(state.value==='all'||item.state===state.value));
  grid.replaceChildren();
  for(const item of items){const button=document.createElement('button');button.type='button';button.className='card';button.dataset.listingId=item.id;const tag=document.createElement('span');tag.className='tag';tag.textContent=item.state.toUpperCase();const h=document.createElement('h3');h.textContent=item.name;const p=document.createElement('p');p.textContent=item.summary;button.append(tag,h,p);button.addEventListener('click',()=>inspect(item));grid.append(button)}
  count.textContent=`${items.length} synthetic listing${items.length===1?'':'s'}`;
}
category.addEventListener('change',render);state.addEventListener('change',render);render();
