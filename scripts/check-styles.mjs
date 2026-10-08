// Native CSS regression checks in a fresh, synthetic browser profile.
// No installed extension, user settings, broadcast or chat content is used.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
const fixture=`<style>body{margin:0}a,ul,div{display:block}.message{font-size:14px}img{width:24px;height:24px}</style>
<header id="header"><a id="studio" href="https://studio.chzzk.naver.com/example">Studio</a><a id="legacy-studio" class="toolbar_studio_button__old" href="/legacy-studio">Legacy studio</a>
<ul id="topics" class="_list_w2gsx_20"><li><a href="/home/game/HOME">Game</a></li></ul>
<ul id="legacy-topics" class="topic_tab_tab_list__old"><li>Legacy topics</li></ul>
<ul id="other-header-list"><li><a href="/following">Following</a></li></ul></header>
<a id="foreign-studio" href="https://studio.chzzk.naver.com/other">Unrelated content</a>
<ul id="foreign-topics"><li><a href="/home/game/HOME">Unrelated list</a></li></ul>
<aside id="sidebar"><ul><li id="offline-row" class="_item_qz74s_107"><div id="offline" class="_item_bwftz_57 _type_profile_bwftz_84"><div class="_profile_bwftz_70"></div><a href="/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">Offline</a></div></li></ul>
<div id="live" class="_item_bwftz_57 _type_profile_bwftz_84"><div class="_profile_bwftz_70 _is_live_bwftz_174"></div><a href="/live/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb">Live</a></div>
<div id="schedule" class="_item_bwftz_57 _type_schedule_bwftz_99"><a href="/cccccccccccccccccccccccccccccccc">Scheduled</a></div></aside>
<div id="legacy-offline" class="navigator_type_profile__old">Legacy offline</div><div id="legacy-live" class="navigator_type_profile__old"><span class="navigator_is_live__old">Live</span></div>
<div id="foreign-profile" class="_item_current _type_profile_current"><a href="/other">Unrelated profile</a></div>
<aside id="aside-chatting"><div role="log"><div class="_item_8lqsk_7">
<div id="message" class="_chatting_message_w9pvh_21 message">Synthetic message<img id="emoji" alt=""></div>
<span id="nickname" class="_nickname_w9pvh_33 message">Name</span></div></div></aside>
<div id="foreign-message" class="_chatting_message_other message">Unrelated text</div>`;
const checks=[
  {name:'hide-studio targets current header button without hiding content links',file:'hide-studio',hidden:['studio','legacy-studio'],visible:['foreign-studio']},
  {name:'hide-topics targets current topic list without hiding other lists',file:'hide-topics',hidden:['topics','legacy-topics'],visible:['other-header-list','foreign-topics']},
  {name:'hide-offline hides only sidebar offline profile rows',file:'hide-offline',hidden:['offline','offline-row','legacy-offline'],visible:['live','schedule','foreign-profile','legacy-live']},
];
const failures=[];
let checked=0;
const checkNative=async(name,fn)=>{checked++;try{await fn();}catch(error){failures.push({name,error:error.message});}};
try{
  const page=await browser.newPage();
  // Source-derived native JSX structure, confirmed for the actual mission
  // panel and normal card parent. No real mission, blocked account or data.
  const panel=(kind,expanded,id)=>kind==='mission'
    ? `<div id="${id}" class="_container_panel"><div class="_header_panel"><button class="_mission_button_panel"><svg class="_icon_mission_panel"></svg>Mission</button><button class="_folded_button_panel" aria-expanded="${expanded}">Fold</button></div>${expanded?'<div class="_item_panel">Synthetic mission</div>':''}</div>`
    : `<div id="${id}" class="_container_panel"><button class="_header_panel" aria-controls="party-wrapper" aria-expanded="${expanded}"><em class="_highlight_panel"><svg class="_icon_party_panel"></svg>Party</em></button>${expanded?'<div class="_wrapper_panel" id="party-wrapper">Synthetic party</div>':''}</div>`;
  const panelFrame=content=>'<style>#layout-body{display:flex}#native-player{width:800px;flex:none}aside{width:300px;flex:none}div{display:block}</style><div id="layout-body"><main id="native-player">Player</main><aside id="aside-chatting">'+content+'<div id="native-log" role="log">Ordinary chat</div></aside></div>';
  for(const kind of ['mission','party'])for(const expanded of [true,false])await checkNative(`hide-mission hides current ${kind} panel when expanded=${expanded}`,async()=>{
    await page.setContent(panelFrame(panel(kind,expanded,'native-panel')));
    await page.addStyleTag({content:await fs.readFile('styles/hide-mission.css','utf8')});
    assert.equal(await page.locator('#native-panel').evaluate(n=>getComputedStyle(n).display),'none');
    assert.equal(await page.locator('#native-log').evaluate(n=>getComputedStyle(n).display),'block');
    assert.equal(await page.locator('#native-player').evaluate(n=>n.getBoundingClientRect().width),800);
    assert.equal(await page.locator('#aside-chatting').evaluate(n=>n.getBoundingClientRect().width),300);
  });
  await checkNative('hide-mission OFF restores both native panels without rewriting them',async()=>{
    await page.setContent(panelFrame(panel('mission',true,'native-mission')+panel('party',false,'native-party')));
    const css=await page.addStyleTag({content:await fs.readFile('styles/hide-mission.css','utf8')});
    await css.evaluate(n=>n.remove());
    for(const id of ['native-mission','native-party'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'block');
    assert.equal(await page.locator('#native-party button').getAttribute('aria-expanded'),'false');
  });
  await checkNative('hide-mission preserves sidebar, foreign, ordinary and enclosing chat containers',async()=>{
    const normal='<div id="normal-panel" class="_container_panel"><div class="_header_panel"><button class="_mission_button_panel"><svg class="_icon_archive_panel"></svg></button></div></div>';
    const unrelatedParty='<div id="unrelated-party" class="_container_panel"><button class="_header_panel" aria-controls="other-wrapper"><em class="_highlight_panel"><svg class="_icon_party_panel"></svg></em></button></div>';
    await page.setContent(panelFrame('<div id="enclosing-chat" class="_container_outer">'+panel('mission',true,'inner-panel')+'</div>'+normal+unrelatedParty)+'<aside id="sidebar" aria-label="사이드바">'+panel('mission',true,'sidebar-panel')+'</aside>'+panel('party',true,'foreign-panel'));
    await page.addStyleTag({content:await fs.readFile('styles/hide-mission.css','utf8')});
    for(const id of ['normal-panel','unrelated-party','enclosing-chat','sidebar-panel','foreign-panel'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'block',id);
  });
  await checkNative('hide-mission retains both legacy fixed-panel selectors',async()=>{
    await page.setContent('<div id="old-mission" class="live_chatting_fixed_mission_container__old"></div><div id="old-party" class="live_chatting_fixed_party_container__old"></div>');
    await page.addStyleTag({content:await fs.readFile('styles/hide-mission.css','utf8')});
    for(const id of ['old-mission','old-party'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'none');
  });
  const card=(id,blocked,extra='')=>`<div id="${id}" class="_container_card${blocked?' _is_block_card':''}"><div class="_thumbnail_card"></div>${extra}</div>`;
  for(const tag of ['li','div'])await checkNative(`hide-blocked hides current card and direct ${tag} item without a grid gap`,async()=>{
    await page.setContent('<style>div,li{display:block}#grid{display:grid;grid-template-columns:200px 200px}</style><div id="layout-body"><div id="grid"><'+tag+' id="blocked-item" class="_item_grid">'+card('blocked-card',true)+'</'+tag+'><'+tag+' id="normal-item" class="_item_grid">'+card('normal-card',false)+'</'+tag+'></div></div>');
    await page.addStyleTag({content:await fs.readFile('styles/hide-blocked.css','utf8')});
    for(const id of ['blocked-card','blocked-item'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'none',id);
    for(const id of ['grid','normal-item','normal-card'])assert.notEqual(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'none',id);
    assert.equal(await page.locator('#normal-item').evaluate(n=>n.getBoundingClientRect().x),await page.locator('#grid').evaluate(n=>n.getBoundingClientRect().x),'remaining card occupies the first grid cell');
  });
  await checkNative('hide-blocked hides a standalone native blocked card without a wrapper',async()=>{
    await page.setContent('<main id="layout-body">'+card('standalone-blocked',true)+'</main>');
    await page.addStyleTag({content:await fs.readFile('styles/hide-blocked.css','utf8')});
    assert.equal(await page.locator('#standalone-blocked').evaluate(n=>getComputedStyle(n).display),'none');
  });
  await checkNative('hide-blocked OFF restores the card and its grid item',async()=>{
    await page.setContent('<style>div,li{display:block}</style><div id="layout-body"><li id="blocked-item" class="_item_grid">'+card('blocked-card',true)+'</li></div>');
    const css=await page.addStyleTag({content:await fs.readFile('styles/hide-blocked.css','utf8')});
    await css.evaluate(n=>n.remove());
    for(const id of ['blocked-item','blocked-card'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'block');
  });
  await checkNative('hide-blocked preserves unrelated block widgets, normal cards and outer lists',async()=>{
    await page.setContent('<style>div,li{display:block}</style><div id="layout-body"><div id="outer-list" class="_item_outer"><li id="direct-item" class="_item_grid">'+card('inner-blocked',true)+'</li></div>'+card('normal-card',false)+'<div id="noncard-block" class="_container_widget _is_block_widget"><div class="_content_widget">Other widget</div></div><div id="false-token" class="_container_card _not_is_block_card"><div class="_thumbnail_card"></div></div></div>'+card('foreign-blocked',true));
    await page.addStyleTag({content:await fs.readFile('styles/hide-blocked.css','utf8')});
    for(const id of ['outer-list','normal-card','noncard-block','false-token','foreign-blocked'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'block',id);
  });
  await checkNative('hide-blocked preserves the existing floating-popup exception for current and legacy cards',async()=>{
    const popup='<div style="position: absolute; left: 0px;">Synthetic popup</div>';
    await page.setContent('<style>div,li{display:block}</style><div id="layout-body"><li id="popup-item" class="_item_grid">'+card('popup-card',true,popup)+'</li></div><div id="legacy-popup-item" class="component_item__old"><div class="video_card_is_block__old"></div>'+popup+'</div>');
    await page.addStyleTag({content:await fs.readFile('styles/hide-blocked.css','utf8')});
    for(const id of ['popup-item','popup-card','legacy-popup-item'])assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).display),'block',id);
  });
  await checkNative('hide-blocked retains legacy item hiding',async()=>{
    await page.setContent('<div id="legacy-blocked-item" class="component_item__old"><div class="video_card_is_block__old"></div></div>');
    await page.addStyleTag({content:await fs.readFile('styles/hide-blocked.css','utf8')});
    assert.equal(await page.locator('#legacy-blocked-item').evaluate(n=>getComputedStyle(n).display),'none');
  });
  // Break caught: a marker on the native text itself must style/label it
  // without JSX children, overriding only its native inline text color.
  const deletedFixture='<style>:root{--color-content-04:rgb(120,120,120);--color-content-05:rgb(160,160,160)}span{font-size:22px}</style><aside><div role="log"><div class="_item_current"><div class="_chatting_message_current"><button class="_nickname_current">Synthetic</button><span id="deleted-current" class="_text_current" style="color:rgb(255,0,0)" data-knife-deleted="1">Synthetic<img id="deleted-emote" width="24" height="24"></span><span id="normal-current" class="_text_current" style="color:rgb(255,0,0)">Ordinary</span></div></div><span id="legacy-deleted" class="live_chatting_message_text__old"><span class="knife-deleted">Legacy</span></span></div></aside>';
  for(const part of ['style','label'])await checkNative(`native deleted text ${part} uses an owned marker without JSX`,async()=>{
    await page.setContent(deletedFixture);await page.addStyleTag({content:await fs.readFile('web/main.css','utf8')});
    if(part==='style'){
      const style=await page.locator('#deleted-current').evaluate(n=>({color:getComputedStyle(n).color,decoration:getComputedStyle(n).textDecorationLine,size:getComputedStyle(n).fontSize}));
      assert.deepEqual(style,{color:'rgb(120, 120, 120)',decoration:'line-through',size:'22px'});
      assert.equal(await page.locator('#deleted-emote').evaluate(n=>getComputedStyle(n).width),'24px');
    }else assert.equal(await page.locator('#deleted-current').evaluate(n=>getComputedStyle(n,'::after').content),'"__MSG_content_deletedMessage__"');
  });
  await checkNative('native deletion OFF restores ordinary color and preserves legacy labeling',async()=>{
    await page.setContent(deletedFixture);await page.addStyleTag({content:await fs.readFile('web/main.css','utf8')});
    await page.locator('#deleted-current').evaluate(n=>n.removeAttribute('data-knife-deleted'));
    for(const id of ['deleted-current','normal-current'])assert.deepEqual(await page.locator('#'+id).evaluate(n=>({color:getComputedStyle(n).color,decoration:getComputedStyle(n).textDecorationLine,label:getComputedStyle(n,'::after').content})),{color:'rgb(255, 0, 0)',decoration:'none',label:'none'});
    assert.equal(await page.locator('#legacy-deleted').evaluate(n=>getComputedStyle(n,'::after').content),'"__MSG_content_deletedMessage__"');
  });
  for(const check of checks){
    checked++;
    await page.setContent(fixture);
    await page.addStyleTag({content:await fs.readFile(`styles/${check.file}.css`,'utf8')});
    try{
      for(const id of check.hidden)assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'none',`${id} must hide`);
      for(const id of check.visible)assert.notEqual(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'none',`${id} must stay visible`);
    }catch(error){failures.push({name:check.name,error:error.message});}
  }
  await page.setContent(fixture);
  await page.addStyleTag({content:await fs.readFile('styles/chat-font-size.css','utf8')});
  for(const [offset,size,emoji] of [[-6,'8px','18px'],[0,'14px','24px'],[8,'22px','32px']]){
    checked++;
    await page.evaluate(offset=>document.documentElement.style.setProperty('--knife-chat-size-1',`${offset}px`),offset);
    try{
      assert.equal(await page.locator('#message').evaluate(n=>getComputedStyle(n).fontSize),size);
      assert.equal(await page.locator('#nickname').evaluate(n=>getComputedStyle(n).fontSize),size);
      assert.equal(await page.locator('#emoji').evaluate(n=>getComputedStyle(n).height),emoji);
      assert.equal(await page.locator('#foreign-message').evaluate(n=>getComputedStyle(n).fontSize),'14px');
    }catch(error){failures.push({name:`current chat font offset ${offset}`,error:error.message});}
  }
  const sectionStyles=[['popular','hide-recommended'],['schedule','hide-schedule'],['partner','hide-sidebar-partner'],['shortcut','hide-shortcut']];
  const sectionFixture=names=>'<style>nav{display:block}</style><aside id="sidebar" aria-label="사이드바"><div>'+names.map(id=>`<nav id="section-${id}" class="_section_test"${['popular','schedule','partner','shortcut'].includes(id)?` data-knife-sidebar-section="${id}"`:''}>${id}</nav>`).join('')+'</div></aside>';
  for(let mask=0;mask<16;mask++)await checkNative(`sidebar hiding preserves general/following with target subset ${mask}`,async()=>{
    const names=['general','following',...sectionStyles.filter((_,i)=>mask&(1<<i)).map(([id])=>id)];
    await page.setContent(sectionFixture(names.reverse()));
    for(const [,file]of sectionStyles)await page.addStyleTag({content:await fs.readFile(`styles/${file}.css`,'utf8')});
    for(const id of names)assert.equal(await page.locator(`#section-${id}`).evaluate(n=>getComputedStyle(n).display),['general','following'].includes(id)?'block':'none',id);
  });
  for(const [target,file]of sectionStyles)await checkNative(`${file} hides only its section and OFF restores native visibility`,async()=>{
    await page.setContent(sectionFixture(['general','following','popular','schedule','partner','shortcut']));
    const css=await page.addStyleTag({content:await fs.readFile(`styles/${file}.css`,'utf8')});
    for(const id of ['general','following','popular','schedule','partner','shortcut'])assert.equal(await page.locator(`#section-${id}`).evaluate(n=>getComputedStyle(n).display),id===target?'none':'block',id);
    await css.evaluate(n=>n.remove());
    assert.equal(await page.locator(`#section-${target}`).evaluate(n=>getComputedStyle(n).display),'block');
  });
  await checkNative('unidentified sidebar and foreign marked navigation stay visible',async()=>{
    await page.setContent('<style>nav{display:block}</style><aside aria-label="사이드바"><nav id="unidentified-general"></nav><nav id="unidentified-service"></nav></aside><nav id="foreign-section" data-knife-sidebar-section="partner"></nav>');
    for(const [,file]of sectionStyles)await page.addStyleTag({content:await fs.readFile(`styles/${file}.css`,'utf8')});
    for(const id of ['unidentified-general','unidentified-service','foreign-section'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'block',id);
  });
  for(const [target,file]of sectionStyles)await checkNative(`${file} preserves scoped legacy section support`,async()=>{
    await page.setContent('<style>section{display:block}</style><aside class="aside_content__old">'+['general','following','popular','schedule','partner','shortcut'].map(id=>`<section id="legacy-section-${id}" class="navigation_bar_section__old"></section>`).join('')+'</aside><section id="foreign-legacy" class="navigation_bar_section__old"></section>');
    await page.addStyleTag({content:await fs.readFile(`styles/${file}.css`,'utf8')});
    for(const id of ['general','following','popular','schedule','partner','shortcut'])assert.equal(await page.locator(`#legacy-section-${id}`).evaluate(n=>getComputedStyle(n).display),id===target?'none':'block',id);
    assert.equal(await page.locator('#foreign-legacy').evaluate(n=>getComputedStyle(n).display),'block');
  });
  const currentFixture=`<style>body{margin:0;--color-content-02:#fff}#sidebar{position:fixed;left:0;top:60px;width:78px}#sidebar._is_expanded_test{width:240px}#layout-body{box-sizing:border-box;width:100%;padding-left:78px}#layout-body._is_expanded_test{padding-left:240px}.round,img.avatar{border-radius:50%}#header{height:60px}#header img{width:85px;height:26px}</style>
    <header id="header"><div><button id="menu">Menu</button><h1><img id="logo" class="_logo_chzzk_test" alt="Logo"></h1></div><div class="_section_test"></div></header>
    <aside id="sidebar"><div id="sidebar-profile" class="_profile_test round"><img id="sidebar-avatar" class="avatar"></div></aside>
    <main id="layout-body"><a id="profile" class="_image_test round" href="/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"><img id="profile-avatar" style="border-radius:50%"></a>
    <a id="video-thumb" class="_thumbnail_test round" href="/video/123"><img class="avatar"></a>
    <em id="live-badge" class="_container_test _live_test _is_on_test _badge_test">LIVE</em><em id="vod-badge" class="_container_test _badge_test">VOD</em></main>
    <div id="foreign-profile" class="_profile_test round"></div><img id="foreign-logo" class="_logo_chzzk_test" style="width:85px">`;
  await checkNative('static-logo replaces only the header image',async()=>{
    await page.setContent(currentFixture);await page.addStyleTag({content:await fs.readFile('styles/static-logo.css','utf8')});
    const logo=await page.locator('#logo').evaluate(n=>({width:getComputedStyle(n).width,mask:getComputedStyle(n).maskImage}));
    assert.equal(logo.width,'0px');assert.notEqual(logo.mask,'none');
    assert.equal(await page.locator('#foreign-logo').evaluate(n=>getComputedStyle(n).maskImage),'none');
  });
  await checkNative('rectangle-profile squares profile wrapper and image, not video cards or foreign content',async()=>{
    await page.setContent(currentFixture);await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    for(const id of ['profile','profile-avatar','sidebar-profile','sidebar-avatar'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).borderRadius),'0px',id);
    for(const id of ['video-thumb','foreign-profile'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).borderRadius),'50%',id);
  });
  const channelProfileRow=(id,metadata='<div class="_inner_profile"><div class="_channel_profile"></div><div class="_control_profile"></div></div>',imageClass='')=>`<div class="_row_profile"><a id="${id}" class="_thumbnail_profile" href="/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"><img id="${id}-image"${imageClass?` class="${imageClass}"`:''}><span class="blind">Channel profile</span></a>${metadata}</div>`;
  const channelProfileBase='<style>a._thumbnail_profile{display:block;box-sizing:border-box;width:70px;height:70px;padding:5px;border-radius:50%}a._thumbnail_profile>img{display:block;width:60px;height:60px;border-radius:50%}</style>';
  const channelProfileFixture=route=>channelProfileBase+'<div id="layout-body">'+(route==='live'?'<main class="_container_live"><div class="_contents_live"><div id="live_player_layout"></div></div><div class="_details_live"><div class="_container_profile">'+channelProfileRow('channel-profile')+'</div></div></main>':'<section class="_container_vod"><div class="_wrapper_vod"><div id="player_layout"></div><div class="_area_vod"><div class="_content_vod"><div class="_content_left_vod"><div class="_container_profile">'+channelProfileRow('channel-profile')+'</div></div></div></div></div></section>')+'</div>';
  for(const route of ['live','vod'])await checkNative(`rectangle-profile squares the native ${route} channel-info avatar without resizing it`,async()=>{
    await page.setContent(channelProfileFixture(route));await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    for(const id of ['channel-profile','channel-profile-image'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).borderRadius),'0px',id);
    assert.deepEqual(await page.locator('#channel-profile').evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),{width:70,height:70});
    assert.deepEqual(await page.locator('#channel-profile-image').evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),{width:60,height:60});
  });
  await checkNative('channel-avatar rule leaves generic video thumbnails and mismatched direct metadata untouched',async()=>{
    await page.setContent(channelProfileBase+'<div id="layout-body"><div class="_container_profile">'+channelProfileRow('video-thumbnail','<div class="_inner_profile"><div class="_video_profile"></div></div>')+channelProfileRow('nested-channel','<div class="_inner_profile"><div><div class="_channel_profile"></div></div></div>')+'<div>'+channelProfileRow('nested-row')+'</div></div></div>');
    await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    for(const id of ['video-thumbnail','nested-channel','nested-row'])for(const nodeId of [id,id+'-image'])assert.equal(await page.locator(`#${nodeId}`).evaluate(n=>getComputedStyle(n).borderRadius),'50%',nodeId);
  });
  await checkNative('channel-avatar rule does not square matching foreign content outside layout-body',async()=>{
    await page.setContent(channelProfileBase+'<div class="_container_profile">'+channelProfileRow('foreign-channel')+'</div>');
    await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    for(const id of ['foreign-channel','foreign-channel-image'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).borderRadius),'50%',id);
  });
  await checkNative('channel-avatar rule requires the native classless direct profile image',async()=>{
    await page.setContent(channelProfileBase+'<div id="layout-body"><div class="_container_profile">'+channelProfileRow('classed-image',undefined,'video-artwork')+'</div></div>');
    await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    for(const id of ['classed-image','classed-image-image'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).borderRadius),'50%',id);
  });
  await checkNative('removing rectangle-profile restores both native channel-info avatar radii',async()=>{
    await page.setContent(channelProfileFixture('vod'));const css=await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    assert.equal(await page.locator('#channel-profile-image').evaluate(n=>getComputedStyle(n).borderRadius),'0px');
    await css.evaluate(n=>n.remove());
    for(const id of ['channel-profile','channel-profile-image'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).borderRadius),'50%',id);
  });
  await checkNative('channel-avatar addition preserves legacy channel profile styling',async()=>{
    await page.setContent('<style>.channel_profile_thumbnail__legacy{border-radius:50%}</style><div class="channel_profile_thumbnail__legacy" id="legacy-channel-profile"></div>');
    await page.addStyleTag({content:await fs.readFile('styles/rectangle-profile.css','utf8')});
    assert.equal(await page.locator('#legacy-channel-profile').evaluate(n=>getComputedStyle(n).borderRadius),'0px');
  });
  await checkNative('hide-live-badge leaves non-live badges visible',async()=>{
    await page.setContent(currentFixture);await page.addStyleTag({content:await fs.readFile('styles/hide-live-badge.css','utf8')});
    assert.equal(await page.locator('#live-badge').evaluate(n=>getComputedStyle(n).display),'none');
    assert.notEqual(await page.locator('#vod-badge').evaluate(n=>getComputedStyle(n).display),'none');
  });
  for(const [width,expanded,padding,sidebarLeft] of [[1600,true,'240px',1360],[1600,false,'78px',1522],[1100,false,'78px',1022]])await checkNative(`right-sidebar viewport ${width}, expanded=${expanded}`,async()=>{
    await page.setViewportSize({width,height:900});await page.setContent(currentFixture);
    if(expanded)await page.evaluate(()=>{document.querySelector('#sidebar').classList.add('_is_expanded_test');document.querySelector('#layout-body').classList.add('_is_expanded_test');});
    await page.addStyleTag({content:await fs.readFile('styles/right-sidebar.css','utf8')});
    assert.equal(await page.locator('#sidebar').evaluate(n=>n.getBoundingClientRect().left),sidebarLeft);
    assert.deepEqual(await page.locator('#layout-body').evaluate(n=>({left:getComputedStyle(n).paddingLeft,right:getComputedStyle(n).paddingRight})),{left:'0px',right:padding});
  });
  const vodFixture='<style>#layout-body>div{display:flex;flex-direction:row}#vod-aside{width:353px}._chatting_message_test{font-size:14px}</style><main id="layout-body"><div><section>Player</section><aside id="vod-aside" class="_aside_test"><div role="log"><div class="_chatting_message_test">Synthetic</div></div></aside></div></main>';
  await checkNative('VOD resize uses the stored chat width',async()=>{
    await page.setContent(vodFixture);await page.addStyleTag({content:await fs.readFile('styles/chat-resize.css','utf8')});
    await page.evaluate(()=>document.documentElement.style.setProperty('--knife-chat-width','420px'));
    assert.equal(await page.locator('#vod-aside').evaluate(n=>getComputedStyle(n).width),'420px');
  });
  await checkNative('VOD chat font matches live font parameters',async()=>{
    await page.setContent(vodFixture);await page.addStyleTag({content:await fs.readFile('styles/chat-font-size.css','utf8')});
    await page.evaluate(()=>document.documentElement.style.setProperty('--knife-chat-size-1','8px'));
    assert.equal(await page.locator('#vod-aside ._chatting_message_test').evaluate(n=>getComputedStyle(n).fontSize),'22px');
  });
  await checkNative('VOD left-chat reverses only the player/chat row',async()=>{
    await page.setContent(vodFixture);await page.addStyleTag({content:await fs.readFile('styles/left-chat.css','utf8')});
    assert.equal(await page.locator('#vod-aside').evaluate(n=>getComputedStyle(n.parentElement).flexDirection),'row-reverse');
  });
  await checkNative('live left-chat reverses the outer chat row without shrinking the inner player main',async()=>{
    await page.setViewportSize({width:1200,height:900});
    await page.setContent('<style>#layout-body>div{display:flex;width:1000px}main{display:flex;flex-direction:column;flex:1;min-width:0}.contents{min-width:60px}.player{height:300px;width:100%}#aside-chatting{width:200px;flex:none}</style><div id="layout-body"><div><main class="_container_live"><div class="contents"><div id="live_player_layout" class="player"></div></div></main><aside id="aside-chatting"></aside></div></div><main id="foreign-main" class="_container_unrelated"><div>Other view</div></main>');
    await page.addStyleTag({content:await fs.readFile('styles/left-chat.css','utf8')});
    assert.equal(await page.locator('#live_player_layout').evaluate(n=>n.getBoundingClientRect().width),800,'player retains full remaining width');
    assert.equal(await page.locator('#aside-chatting').evaluate(n=>getComputedStyle(n.parentElement).flexDirection),'row-reverse');
    assert.equal(await page.locator('#foreign-main').evaluate(n=>getComputedStyle(n).flexDirection),'column','other main containers stay unchanged');
  });
  const exploreFixture='<style>body{margin:0}#sidebar{position:fixed;left:0;top:60px;width:240px}#sidebar ._content_current{position:relative;padding:4px 20px}nav{padding-bottom:15px}ul{display:block;margin:0;padding:0;list-style:none}li{margin-top:3px}a{display:block;white-space:nowrap}#layout-body{padding-left:240px}</style><aside id="sidebar" class="_container_current _is_expanded_current" aria-label="사이드바"><div class="_wrapper_current"><div class="_content_current"><nav id="explore" class="_section_current _is_expanded_current"><ul id="explore-list" class="_list_current"><li class="_item_current"><a href="/lives">Live</a></li><li class="_item_current"><a href="/clips">Clips</a></li><li class="_item_current"><a href="/category">Categories</a></li></ul></nav><nav id="following" class="_section_current"><ul id="following-list" class="_list_current"><li>Following</li></ul></nav></div></div></aside><main id="layout-body" class="_is_expanded_current"></main><nav id="foreign-explore"><ul id="foreign-list"><li>Other</li></ul></nav>';
  for(const [width,right] of [[1800,false],[1800,true],[1799,false],[1100,false]])await checkNative(`top-explore current first section width ${width}, right=${right}`,async()=>{
    await page.setViewportSize({width,height:900});await page.setContent(exploreFixture);
    if(right)await page.addStyleTag({content:await fs.readFile('styles/right-sidebar.css','utf8')});
    await page.addStyleTag({content:await fs.readFile('styles/top-explore.css','utf8')});
    const nav=await page.locator('#explore').evaluate(n=>({position:getComputedStyle(n).position,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y}));
    assert.equal(nav.position,width>=1800?'absolute':'static','only wide view moves the first section');
    assert.equal(await page.locator('#explore-list').evaluate(n=>getComputedStyle(n).display),width>=1800?'flex':'block');
    if(width>=1800){assert.ok(nav.x>=0&&nav.x<width,'top navigation remains within viewport');assert.ok(nav.y>=0&&nav.y<60,'top navigation reaches toolbar row');}
    for(const id of ['following','foreign-explore'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).position),'static',id);
    for(const id of ['following-list','foreign-list'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'block',id);
  });
  for(const width of [1800,1799,1100])await checkNative(`top-explore keeps promotional farm out of toolbar only at wide breakpoint ${width}`,async()=>{
    await page.setViewportSize({width,height:900});
    await page.setContent(exploreFixture.replace('</ul>','<li id="farm"><a href="/cheezefarm">Promotional farm</a></li></ul>')+'<a id="foreign-farm" href="/cheezefarm">Unrelated farm link</a>');
    await page.addStyleTag({content:await fs.readFile('styles/top-explore.css','utf8')});
    assert.equal(await page.locator('#farm').evaluate(n=>getComputedStyle(n).display),width>=1800?'none':'list-item');
    assert.notEqual(await page.locator('#explore-list>li').first().evaluate(n=>getComputedStyle(n).display),'none','ordinary navigation remains visible');
    assert.notEqual(await page.locator('#foreign-farm').evaluate(n=>getComputedStyle(n).display),'none','no global farm-link hiding');
  });
  const toolbarFixture='<style>body{margin:0}header{position:sticky;top:0;height:60px;transform:translateY(0)}#layout-body{min-height:900px}#sidebar{position:fixed;top:60px}</style><div class="_glive_current"><header id="header" aria-label="헤더" style="transform:translateY(0px)"><input id="search" aria-label="Search"></header><aside id="sidebar" aria-label="사이드바"><nav><a id="nav-link" href="/lives">Live</a></nav></aside><main id="layout-body"></main></div>';
  await checkNative('auto-hide collapses current sticky header and reveals it on hover',async()=>{
    await page.setViewportSize({width:1600,height:900});await page.setContent(toolbarFixture);await page.mouse.move(1100,400);
    await page.addStyleTag({content:await fs.readFile('styles/auto-hide-toolbar.css','utf8')});
    await page.waitForFunction(()=>Math.abs(document.querySelector('#header').getBoundingClientRect().y+45)<0.1,{},{timeout:2000});
    assert.equal(Math.round(await page.locator('#header').evaluate(n=>n.getBoundingClientRect().y)),-45,'collapsed toolbar leaves a 15px hover strip');
    await page.mouse.move(500,5);
    await page.waitForFunction(()=>Math.abs(document.querySelector('#header').getBoundingClientRect().y)<0.1,{},{timeout:2000});
    assert.ok(Math.abs(await page.locator('#header').evaluate(n=>n.getBoundingClientRect().y))<0.1,'expanded toolbar returns to top');
  });
  await checkNative('auto-hide reveals current toolbar for keyboard focus without hover',async()=>{
    await page.setContent(toolbarFixture);await page.mouse.move(1100,400);await page.locator('#search').focus();
    await page.addStyleTag({content:await fs.readFile('styles/auto-hide-toolbar.css','utf8')});
    assert.equal(await page.locator('#header').evaluate(n=>n.matches(':hover')),false);
    assert.equal(Math.round(await page.locator('#header').evaluate(n=>n.getBoundingClientRect().y)),0,'focused search remains visible');
    assert.equal(await page.locator('._glive_current').evaluate(n=>getComputedStyle(n).getPropertyValue('--knife-top-explore-top').trim()),'-11px','top-explore follows keyboard focus');
  });
  await checkNative('top-explore follows auto-hide offset and returns on keyboard focus',async()=>{
    await page.setViewportSize({width:1800,height:900});
    await page.setContent(toolbarFixture.replace('<aside id="sidebar"','<aside class="_container_current _is_expanded_current" id="sidebar"'));await page.mouse.move(1100,400);
    await page.addStyleTag({content:await fs.readFile('styles/auto-hide-toolbar.css','utf8')});
    await page.addStyleTag({content:await fs.readFile('styles/top-explore.css','utf8')});
    assert.ok(await page.locator('#sidebar nav').evaluate(n=>n.getBoundingClientRect().bottom<=15),'navigation must not stay over the collapsed toolbar');
    await page.locator('#search').focus();
    await page.waitForFunction(()=>{const y=document.querySelector('#sidebar nav').getBoundingClientRect().y;return y>=0&&y<15},{},{timeout:2000});
    assert.ok(await page.locator('#sidebar nav').evaluate(n=>n.getBoundingClientRect().y>=0),'focused header exposes navigation');
  });
  const searchFixture=`<style>body{margin:0}#header{height:60px;display:flex;align-items:center;padding:0 20px;position:relative;box-sizing:border-box}.logo{width:129px;flex:none}.tools{display:flex;flex:1;justify-content:space-between;align-items:center}.topics{width:244.5px;height:40px;flex:none}.search{position:absolute;left:50%;transform:translateX(-50%);width:400px;height:38px}form{margin:0}input{box-sizing:border-box;width:100%}._section_controls{width:340px;height:40px;flex:none}#sidebar{position:fixed;top:60px;left:0;width:240px}._content_current{position:relative;padding:4px 20px}nav{padding-bottom:15px}ul{margin:0;padding:0;list-style:none}li{flex-shrink:0;height:38px}li:nth-child(1),li:nth-child(2){width:111.9375px}li:nth-child(3){width:108.65625px}li:nth-child(4){width:104px}li:nth-child(5){width:96px}#layout-body{padding-left:240px}</style>
    <header id="header"><div class="logo">Logo</div><div class="tools"><div class="topics">Topics</div><div id="search-container" class="search"><form><div><input id="search-input" aria-label="Search"></div></form></div><div id="controls" class="_section_controls">Account controls</div></div></header>
    <aside id="sidebar" class="_container_current _is_expanded_current"><div class="_content_current"><nav id="explore"><ul><li>Live</li><li>Clips</li><li>Category</li><li>Schedule</li><li>Following</li></ul></nav><nav id="following">Following channels</nav></div></aside><main id="layout-body"></main><div><form><input id="foreign-search"></form></div>`;
  for(const [width,right] of [[1200,false],[1799,false],[1800,false],[1920,false],[2560,false],[1800,true],[1920,true]])await checkNative(`top-explore avoids search and account overlap at ${width}, right=${right}`,async()=>{
    await page.setViewportSize({width,height:900});await page.setContent(searchFixture);
    if(right)await page.addStyleTag({content:await fs.readFile('styles/right-sidebar.css','utf8')});
    const baseline=await page.locator('#search-container').evaluate(n=>n.getBoundingClientRect().x);
    const css=await page.addStyleTag({content:await fs.readFile('styles/top-explore.css','utf8')});
    const layout=await page.evaluate(()=>({nav:document.querySelector('#explore').getBoundingClientRect().toJSON(),search:document.querySelector('#search-container').getBoundingClientRect().toJSON(),controls:document.querySelector('#controls').getBoundingClientRect().toJSON(),position:getComputedStyle(document.querySelector('#explore')).position}));
    if(width>=1800){
      assert.ok(layout.nav.right+8<=layout.search.left,'search stays beyond navigation');
      assert.ok(layout.search.right+8<=layout.controls.left,'search stays before account controls');
      assert.ok(layout.nav.y>=0&&layout.nav.bottom<=60,'menu fits toolbar');
      assert.ok(layout.search.width>=300,'search remains usable');
    }else{
      assert.equal(layout.position,'static','narrow view keeps sidebar navigation');
      assert.equal(layout.search.x,baseline,'narrow view keeps native search placement');
    }
    assert.equal(await page.locator('#foreign-search').evaluate(n=>getComputedStyle(n.parentElement.parentElement).position),'static');
    await css.evaluate(n=>n.remove());
    assert.equal(await page.locator('#search-container').evaluate(n=>getComputedStyle(n).position),'absolute','removing option restores native search');
    assert.equal(await page.locator('#search-container').evaluate(n=>n.getBoundingClientRect().x),baseline);
  });
  const homeFixture='<style>section{display:block}ul{height:40px}</style><main id="layout-body" data-knife-home="1"><div class="_swap_current"><div class="_content_current"><section id="recommended"><ul class="_grid_current _is_two_columns_current"><li>Recommended</li></ul></section><section id="following"><ul class="_list_current _type_vod_current"><li>Following</li></ul></section><section id="recent-vod"><ul class="_list_current _type_vod_current"><li>Recent VOD</li></ul></section></div></div><section id="other-grid"><ul class="_grid_current"><li>Other layout</li></ul></section><section id="nested-grid"><div><ul class="_grid_current _is_two_columns_current"><li>Nested unrelated layout</li></ul></div></section></main><section id="foreign-grid"><ul class="_grid_current _is_two_columns_current"><li>Outside home content</li></ul></section><div id="legacy-recommended" class="home_recommend_live_container__old">Legacy recommendations</div>';
  await checkNative('hide-recommended-live hides only the current home recommendation section',async()=>{
    await page.setContent(homeFixture);await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    for(const id of ['recommended','legacy-recommended'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'none',id);
    for(const id of ['following','recent-vod','other-grid','nested-grid','foreign-grid'])assert.notEqual(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'none',id);
  });
  await checkNative('hide-recommended-live leaves unmarked routes visible',async()=>{
    await page.setContent(homeFixture.replace(' data-knife-home="1"',''));await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    assert.notEqual(await page.locator('#recommended').evaluate(n=>getComputedStyle(n).display),'none');
    assert.equal(await page.locator('#legacy-recommended').evaluate(n=>getComputedStyle(n).display),'none','legacy home layout remains supported');
  });
  await checkNative('removing recommendation style restores the current home section',async()=>{
    await page.setContent(homeFixture);const css=await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    await css.evaluate(n=>n.remove());
    assert.notEqual(await page.locator('#recommended').evaluate(n=>getComputedStyle(n).display),'none');
  });
  // Break caught: depending on the two-column modifier exposes recommendations
  // after native responsive rerender; expectations use the real CSS engine.
  await checkNative('home recommendation stays hidden when responsive rerender removes the two-column modifier',async()=>{
    await page.setContent(homeFixture);await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    for(const [width,columns] of [[2560,true],[1200,false],[1800,false],[2560,true]]){
      await page.setViewportSize({width,height:900});
      await page.locator('#recommended>ul').evaluate((n,columns)=>{n.className=columns?'_grid_current _is_two_columns_current':'_grid_current';},columns);
      assert.equal(await page.locator('#recommended').evaluate(n=>getComputedStyle(n).display),'none',`responsive width ${width}`);
      assert.equal(await page.locator('#recommended').evaluate(n=>n.getBoundingClientRect().height),0,'hidden section leaves no space');
      for(const id of ['following','recent-vod','other-grid','nested-grid','foreign-grid'])assert.notEqual(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'none',id);
    }
  });
  // Break caught: dropping a home-content boundary hides unrelated grids.
  await checkNative('home recommendation hiding preserves grids outside the direct swap-content section boundary',async()=>{
    const unrelated='<div class="_content_other"><section id="no-swap"><ul class="_grid_current _is_two_columns_current"><li>Other content</li></ul></section></div><div class="_swap_other"><div class="other"><section id="no-content"><ul class="_grid_current"><li>Other content</li></ul></section></div><div><div class="_content_current"><section id="indirect-content"><ul class="_grid_current"><li>Nested content</li></ul></section></div></div><div class="_content_current"><div><section id="indirect-section"><ul class="_grid_current"><li>Nested section</li></ul></section></div><section id="indirect-grid"><div><ul class="_grid_current"><li>Nested grid</li></ul></div></section></div></div>';
    await page.setContent(homeFixture.replace('</main>',unrelated+'</main>'));await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    for(const id of ['no-swap','no-content','indirect-content','indirect-section','indirect-grid'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).display),'block',id);
  });
  await checkNative('unmarked responsive home content is not hidden',async()=>{
    await page.setContent(homeFixture.replace(' data-knife-home="1"','').replace(' _is_two_columns_current',''));await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    assert.equal(await page.locator('#recommended').evaluate(n=>getComputedStyle(n).display),'block');
  });
  await checkNative('removing recommendation style restores the responsive home section',async()=>{
    await page.setContent(homeFixture.replace(' _is_two_columns_current',''));const css=await page.addStyleTag({content:await fs.readFile('styles/hide-recommended-live.css','utf8')});
    await css.evaluate(n=>n.remove());
    assert.equal(await page.locator('#recommended').evaluate(n=>getComputedStyle(n).display),'block');
    assert.ok(await page.locator('#recommended').evaluate(n=>n.getBoundingClientRect().height>0));
  });
  // Break caught: the current VOD inline height wins over the non-important
  // generic player rule; the legacy VOD selector no longer matches this DOM.
  const fitFixture='<style>body{margin:0}#layout-body{height:640px;width:800px}._player_current,.vod_player__old{height:100%;width:100%}</style><main id="layout-body"><div id="fit-player" class="_player_current" style="max-height:calc(100% - 84px)"><div id="player_layout" class="type_vod"></div></div></main>';
  for(const large of [false,true])await checkNative(`fit-player fills current VOD despite inline limit, wide=${large}`,async()=>{
    await page.setViewportSize({width:1800,height:700});
    await page.setContent(large?fitFixture.replace('id="layout-body"','id="layout-body" class="_is_large_current"'):fitFixture);
    assert.equal(await page.locator('#fit-player').evaluate(n=>n.getBoundingClientRect().height),556,'native reserved space');
    await page.addStyleTag({content:await fs.readFile('styles/fit-player.css','utf8')});
    assert.equal(await page.locator('#fit-player').evaluate(n=>n.getBoundingClientRect().height),640,'option uses available parent height');
  });
  await checkNative('fit-player retains legacy VOD fill',async()=>{
    await page.setContent(fitFixture.replace('class="_player_current"','class="vod_player__old"'));
    await page.addStyleTag({content:await fs.readFile('styles/fit-player.css','utf8')});
    assert.equal(await page.locator('#fit-player').evaluate(n=>n.getBoundingClientRect().height),640);
  });
  for(const [name,html] of [
    ['live',fitFixture.replace('id="player_layout" class="type_vod"','id="live_player_layout" class="type_live"')],
    ['foreign layout',fitFixture.replaceAll('layout-body','foreign-layout')],
    ['popup',fitFixture.replace('<main id="layout-body">','<main id="layout-body"><div class="knife-popup">').replace('</main>','</div></main>').replace('.vod_player__old{height:100%;width:100%}', '.vod_player__old,.knife-popup{height:100%;width:100%}')],
  ])await checkNative(`fit-player does not override ${name} inline height`,async()=>{
    await page.setContent(html);await page.addStyleTag({content:await fs.readFile('styles/fit-player.css','utf8')});
    assert.equal(await page.locator('#fit-player').evaluate(n=>n.getBoundingClientRect().height),556);
  });
  await checkNative('removing fit-player restores current VOD inline reservation',async()=>{
    await page.setContent(fitFixture);const css=await page.addStyleTag({content:await fs.readFile('styles/fit-player.css','utf8')});
    assert.equal(await page.locator('#fit-player').evaluate(n=>n.getBoundingClientRect().height),640);
    await css.evaluate(n=>n.remove());
    assert.equal(await page.locator('#fit-player').evaluate(n=>n.getBoundingClientRect().height),556);
  });
  // Break caught: overriding an ancestor of a fullscreen player or a
  // fullscreen root changes native mode sizing. Use real fullscreen state.
  for(const target of ['player_layout','root'])await checkNative(`fit-player leaves native fullscreen height when ${target} is fullscreen`,async()=>{
    await page.setContent(fitFixture+`<button id="enter" onclick="${target==='root'?'document.documentElement':'document.getElementById(\'player_layout\')'}.requestFullscreen()">Fullscreen</button>`);
    await page.addStyleTag({content:await fs.readFile('styles/fit-player.css','utf8')});
    await page.locator('#enter').click();
    await page.waitForFunction(()=>!!document.fullscreenElement,{},{timeout:2000});
    assert.equal(await page.locator('#fit-player').evaluate(n=>getComputedStyle(n).maxHeight),'calc(100% - 84px)');
    await page.evaluate(()=>document.exitFullscreen());
  });
  // Break caught: generic message-image sizing treats 18px nickname badges
  // as 24px emotes. Icon sizing must also carry the flex wrapper naturally,
  // including multiple badges; never force that wrapper to one badge width.
  const badgeFixture='<style>._chatting_message_current{font-size:14px;line-height:1.429}._nickname_current{display:inline-flex;align-items:center}._wrapper_current{display:flex;gap:4px}._icon_current{width:18px;height:18px;flex:none}img{display:block}</style><aside id="aside-chatting"><div role="log"><div id="badge-message" class="_chatting_message_current"><span class="_nickname_current"><span id="badge-holder" class="_wrapper_current"><span id="badge-icon" class="_icon_current"><img id="nickname-badge" width="18" height="18"></span><span class="_icon_current"><img width="18" height="18"></span></span><span id="badge-name">Synthetic name</span></span><img id="body-emote" width="24" height="24"><span class="_icon_current"><img id="non-nickname-icon" width="18" height="18"></span></div></div><span class="_nickname_current"><span class="_icon_current"><img id="outside-log" width="18" height="18"></span></span></aside><div id="foreign-chat"><div role="log"><div class="_chatting_message_current"><span class="_nickname_current"><span class="_wrapper_current"><span class="_icon_current"><img id="foreign-badge" width="18" height="18"></span></span></span></div></div></div><div class="badge_container__a64XB"><img id="legacy-badge" width="18" height="18"></div>';
  for(const root of ['aside-chatting','vod-aside'])for(const [offset,badge,emote,font,holder] of [[-6,'12px','18px','8px','28px'],[0,'18px','24px','14px','40px'],[8,'26px','32px','22px','56px']])await checkNative(`nickname badges keep their own base size at ${root}, offset=${offset}`,async()=>{
    await page.setContent(badgeFixture.replace('id="aside-chatting"',`id="${root}"`));
    await page.evaluate(offset=>document.documentElement.style.setProperty('--knife-chat-size-1',`${offset}px`),offset);
    await page.addStyleTag({content:await fs.readFile('styles/chat-font-size.css','utf8')});
    for(const id of ['nickname-badge','badge-icon'])assert.deepEqual(await page.locator(`#${id}`).evaluate(n=>({w:getComputedStyle(n).width,h:getComputedStyle(n).height})),{w:badge,h:badge},id);
    assert.deepEqual(await page.locator('#badge-holder').evaluate(n=>({w:getComputedStyle(n).width,h:getComputedStyle(n).height})),{w:holder,h:badge},'two badges flow without overflow or forced single-badge width');
    assert.equal(await page.locator('#body-emote').evaluate(n=>getComputedStyle(n).width),emote);
    assert.equal(await page.locator('#badge-name').evaluate(n=>getComputedStyle(n).fontSize),font);
  });
  await checkNative('nickname badge sizing does not resize other icons or foreign chat',async()=>{
    await page.setContent(badgeFixture);await page.evaluate(()=>document.documentElement.style.setProperty('--knife-chat-size-1','8px'));
    await page.addStyleTag({content:await fs.readFile('styles/chat-font-size.css','utf8')});
    assert.equal(await page.locator('#non-nickname-icon').evaluate(n=>getComputedStyle(n).width),'32px','existing message-image rule is preserved outside nickname badges');
    for(const id of ['foreign-badge','outside-log'])assert.equal(await page.locator(`#${id}`).evaluate(n=>getComputedStyle(n).width),'18px',id);
  });
  await checkNative('nickname badge fix retains legacy badge sizing',async()=>{
    await page.setContent(badgeFixture);await page.evaluate(()=>document.documentElement.style.setProperty('--knife-chat-size-1','8px'));
    await page.addStyleTag({content:await fs.readFile('styles/chat-font-size.css','utf8')});
    assert.equal(await page.locator('#legacy-badge').evaluate(n=>getComputedStyle(n).width),'26px');
  });
  await checkNative('removing font style restores native badge and emote sizes',async()=>{
    await page.setContent(badgeFixture);await page.evaluate(()=>document.documentElement.style.setProperty('--knife-chat-size-1','8px'));
    const css=await page.addStyleTag({content:await fs.readFile('styles/chat-font-size.css','utf8')});
    assert.equal(await page.locator('#nickname-badge').evaluate(n=>getComputedStyle(n).width),'26px');
    await css.evaluate(n=>n.remove());
    assert.equal(await page.locator('#nickname-badge').evaluate(n=>getComputedStyle(n).width),'18px');
    assert.equal(await page.locator('#body-emote').evaluate(n=>getComputedStyle(n).width),'24px');
    assert.equal(await page.locator('#badge-holder').evaluate(n=>getComputedStyle(n).width),'40px');
  });
  await checkNative('production sidebar marker and CSS cooperate through cold loading, collapse and retirement',async()=>{
    const nativePage=await browser.newPage();
    try{
      // All requests are fulfilled locally; this is not a real service page.
      await nativePage.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<main id="layout-body"></main><aside id="sidebar" aria-label="사이드바"><div id="sections"><nav id="native-general" class="_section_test"></nav><nav id="native-shortcut" class="_section_test"><div class="_header_test"><strong class="_title_test">서비스 바로가기<span>새 창</span></strong></div><ul><li><a href="https://game.naver.com">Game</a></li><li><a href="https://game.naver.com/esports">Esports</a></li></ul></nav></div></aside>'}));
      await nativePage.goto('https://sidebar-fixture.invalid/');
      for(const file of ['web/runtime.js','web/site-adapter.js','web/inject.js'])await nativePage.addScriptTag({content:await fs.readFile(file,'utf8')});
      for(const [,file]of sectionStyles)await nativePage.addStyleTag({content:await fs.readFile(`styles/${file}.css`,'utf8')});
      assert.equal(await nativePage.locator('#native-general').evaluate(n=>getComputedStyle(n).display),'block','config-unready never guesses ordinal targets');
      await nativePage.evaluate(()=>{const r=window[Symbol.for('cheese-knife.runtime.v1')];window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{namespace:'cheese-knife',protocol:1,type:'config',requestId:r.requestId,revision:1,config:{}}}));});
      assert.equal(await nativePage.locator('#native-shortcut').getAttribute('data-knife-sidebar-section'),'shortcut');
      assert.equal(await nativePage.locator('#native-general').evaluate(n=>getComputedStyle(n).display),'block');
      assert.equal(await nativePage.locator('#native-shortcut').evaluate(n=>getComputedStyle(n).display),'none','configured cold service section');
      await nativePage.evaluate(()=>document.querySelector('#sections').insertAdjacentHTML('beforeend','<nav id="native-following" class="_section_test" aria-label="팔로우"></nav><nav id="native-popular" class="_section_test" aria-label="인기 카테고리"><div class="_header_test"><strong class="_title_test">인기 카테고리</strong></div></nav><nav id="native-schedule" class="_section_test"><div class="_header_test"><strong class="_title_test">다가오는 방송 일정</strong></div></nav><nav id="native-partner" class="_section_test"><div class="_header_test"><strong class="_title_test">파트너 스트리머<a href="/partner">목록</a></strong></div></nav>'));
      await nativePage.waitForFunction(()=>document.querySelector('#native-partner').dataset.knifeSidebarSection==='partner');
      for(const id of ['popular','schedule','partner','shortcut'])assert.equal(await nativePage.locator(`#native-${id}`).evaluate(n=>getComputedStyle(n).display),'none',id);
      for(const id of ['general','following'])assert.equal(await nativePage.locator(`#native-${id}`).evaluate(n=>getComputedStyle(n).display),'block',id);
      await nativePage.evaluate(()=>{for(const id of ['popular','partner'])document.querySelector(`#native-${id} strong`).firstChild.data='';document.querySelector('#native-shortcut ._header_test').remove();document.querySelector('#native-shortcut').insertAdjacentHTML('afterbegin','<span class="blind">서비스 바로가기</span>');document.querySelector('#native-schedule strong').firstChild.data='방송일정';});
      await nativePage.waitForFunction(()=>document.querySelector('#native-schedule strong').textContent==='방송일정');
      for(const id of ['popular','schedule','partner','shortcut'])assert.equal(await nativePage.locator(`#native-${id}`).evaluate(n=>getComputedStyle(n).display),'none',id+' collapsed');
      await nativePage.evaluate(()=>{document.querySelector('#native-schedule strong').firstChild.data='Unknown';document.querySelector('#native-partner').remove();});
      await nativePage.waitForFunction(()=>!document.querySelector('#native-schedule').hasAttribute('data-knife-sidebar-section'));
      assert.equal(await nativePage.locator('#native-schedule').evaluate(n=>getComputedStyle(n).display),'block','reused unknown section is visible');
      await nativePage.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
      assert.equal(await nativePage.locator('#native-popular').evaluate(n=>getComputedStyle(n).display),'block','disposal releases CSS identity');
    }finally{await nativePage.close();}
  });
  console.log(JSON.stringify({browser:browser.version(),checks:checked,passed:checked-failures.length,failures},null,2));
  assert.equal(failures.length,0,'Native CSS behavior regressions');
}finally{await browser.close();}
