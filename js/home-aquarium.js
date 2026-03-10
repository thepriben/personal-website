(function(){
  var k='postit-pos';
  var sk='submarine-visible';
  var legacyDef={lang:{x:40,y:40},book:{x:328,y:80},quakes:{x:40,y:432}};
  var def={lang:{x:8,y:36},book:{x:420,y:72},quakes:{x:980,y:48},fish:{x:-150,y:196},clown:{x:820,y:282},violet:{x:240,y:314},green:{x:610,y:238}};
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function wrapCoord(value,min,max){var span=Math.max(1,max-min);if(value<min)return max-(min-value)%span;if(value>max)return min+(value-max)%span;return value;}
  function load(){try{var s=localStorage.getItem(k);return s?JSON.parse(s):def;}catch(e){return def;}}
  function hasSavedPositions(){try{return !!localStorage.getItem(k);}catch(e){return false;}}
  function loadAquariumMode(){try{var raw=localStorage.getItem(sk);if(raw==='2')return 2;if(raw==='1')return 1;return 0;}catch(e){return 0;}}
  function saveAquariumMode(mode){try{localStorage.setItem(sk,String(mode));}catch(e){}}
  function save(p){try{localStorage.setItem(k,JSON.stringify(p));}catch(e){}}
  var pos=load();
  if(!pos.fish)pos.fish={x:def.fish.x,y:def.fish.y};
  pos.fish.x=def.fish.x;
  if(typeof pos.fish.y!=='number')pos.fish.y=def.fish.y;
  if(!pos.clown)pos.clown={x:def.clown.x,y:def.clown.y};
  if(typeof pos.clown.x!=='number')pos.clown.x=def.clown.x;
  if(typeof pos.clown.y!=='number')pos.clown.y=def.clown.y;
  if(!pos.violet)pos.violet={x:def.violet.x,y:def.violet.y};
  if(typeof pos.violet.x!=='number')pos.violet.x=def.violet.x;
  if(typeof pos.violet.y!=='number')pos.violet.y=def.violet.y;
  if(!pos.green)pos.green={x:def.green.x,y:def.green.y};
  if(typeof pos.green.x!=='number')pos.green.x=def.green.x;
  if(typeof pos.green.y!=='number')pos.green.y=def.green.y;
  var lang=document.getElementById('postit-lang');
  var book=document.getElementById('postit-book');
  var quakes=document.getElementById('postit-quakes');
  var fish=document.getElementById('swim-fish');
  var clown=document.getElementById('clown-fish');
  var violet=document.getElementById('violet-fish');
  var green=document.getElementById('green-fish');
  var fishToggle=document.getElementById('submarine-toggle');
  var container=document.querySelector('.postit-container');
  var posts=[{el:lang,key:'lang'},{el:book,key:'book'},{el:quakes,key:'quakes'},{el:fish,key:'fish'}];
  var bounds={w:0,h:0,pad:8};
  var fishState={cruiseSpeed:156,dir:1,vx:156,vy:0,lastTs:0,bumpTimer:0,xResumeAt:0,yResumeAt:0,hitShift:0,hitLift:0,anchorY:def.fish.y};
  var clownState={vx:-44,vy:5,targetVx:-44,targetVy:5,lastTs:0,nextDecisionAt:0,hitX:0,hitY:0,facing:-1,driftPhase:1.7};
  var violetState={vx:36,vy:-3,targetVx:36,targetVy:-3,lastTs:0,nextDecisionAt:0,hitX:0,hitY:0,facing:1,driftPhase:4.3};
  var greenState={vx:-38,vy:4,targetVx:-38,targetVy:4,lastTs:0,nextDecisionAt:0,hitX:0,hitY:0,facing:-1,driftPhase:2.9};
  var clownMotion={turnChance:0.09,dartChance:0.1,dartMin:56,dartMax:16,baseMin:24,baseMax:18,nextMin:2600,nextMax:2600,driftFreq:0.0028,driftAmp:10,lerpX:1.4,lerpY:1.8,releaseScale:0.12,releaseMaxX:96,releaseMaxY:72,releaseBase:24,releaseVar:20,releaseYJitter:14,releaseDecisionMin:1400,releaseDecisionVar:2200,separateMin:52,separateVar:18};
  var violetMotion={turnChance:0.13,dartChance:0.16,dartMin:52,dartMax:18,baseMin:22,baseMax:20,nextMin:2200,nextMax:3000,driftFreq:0.0033,driftAmp:12,lerpX:1.7,lerpY:2.1,releaseScale:0.13,releaseMaxX:102,releaseMaxY:76,releaseBase:22,releaseVar:24,releaseYJitter:16,releaseDecisionMin:1200,releaseDecisionVar:1900,separateMin:56,separateVar:22};
  var greenMotion={turnChance:0.16,dartChance:0.22,dartMin:48,dartMax:16,baseMin:20,baseMax:16,nextMin:1800,nextMax:2600,driftFreq:0.0037,driftAmp:13,lerpX:1.9,lerpY:2.3,releaseScale:0.14,releaseMaxX:108,releaseMaxY:82,releaseBase:20,releaseVar:22,releaseYJitter:18,releaseDecisionMin:1000,releaseDecisionVar:1700,separateMin:58,separateVar:20};
  var fishChat={active:false,until:0,anchorY:0,leftKey:'',rightKey:'',pairId:''};
  var fishChatPairs=[
    {id:'clown-violet',keys:['clown','violet'],probeAt:0,cooldownUntil:0,lastChatAt:0},
    {id:'clown-green',keys:['clown','green'],probeAt:0,cooldownUntil:0,lastChatAt:0},
    {id:'violet-green',keys:['violet','green'],probeAt:0,cooldownUntil:0,lastChatAt:0}
  ];
  var aquariumMode=loadAquariumMode();
  var fishVisible=aquariumMode!==0;
  function aquariumCardsHidden(){return aquariumMode===2;}
  function cycleAquariumMode(){aquariumMode=(aquariumMode+1)%3;fishVisible=aquariumMode!==0;updateFishVisibility();}
  function updateBounds(){var r=container?container.getBoundingClientRect():{width:0,height:0};var ft=document.querySelector('footer');bounds.w=r.width;bounds.h=ft?Math.min(r.height,Math.max(0,ft.getBoundingClientRect().top-r.top)):r.height;}
  function samePos(a,b){return !!a&&!!b&&Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2;}
  function shouldUseAquariumDefaults(loaded){return !hasSavedPositions()||!loaded||!loaded.lang||!loaded.book||!loaded.quakes||samePos(loaded.lang,legacyDef.lang)&&samePos(loaded.book,legacyDef.book)&&samePos(loaded.quakes,legacyDef.quakes);}
  function desktopLayout(){var pad=6;var langPos={x:pad,y:38};var quakesX=Math.max(pad,Math.round(bounds.w-278));var bookX=Math.max(pad+300,Math.min(quakesX-292,Math.round(bounds.w*0.49)-130));return {lang:langPos,book:{x:bookX,y:72},quakes:{x:quakesX,y:52}};}
  function desktopFishY(layout){var y=def.fish.y,clearance=18;posts.forEach(function(p){if(p.el&&p.key!=='fish'){var item=layout&&layout[p.key]?layout[p.key]:pos[p.key];if(item)y=Math.max(y,item.y+p.el.offsetHeight+clearance);}});if(fish){var yr=fishVerticalRange(fish);y=Math.max(yr.minY,Math.min(yr.maxY,y));}return y;}
  function desktopClownLayout(layout){var xr=clown?clownRange(clown):{minX:def.clown.x,maxX:def.clown.x},yr=clown?clownVerticalRange(clown):{minY:def.clown.y,maxY:def.clown.y},x=clamp(Math.round(bounds.w*0.74),xr.minX,xr.maxX),y=clamp(desktopFishY(layout)+86,yr.minY,yr.maxY);return {x:x,y:y};}
  function desktopVioletLayout(layout){var xr=violet?clownRange(violet):{minX:def.violet.x,maxX:def.violet.x},yr=violet?clownVerticalRange(violet):{minY:def.violet.y,maxY:def.violet.y},x=clamp(Math.round(bounds.w*0.18),xr.minX,xr.maxX),y=clamp(desktopFishY(layout)+118,yr.minY,yr.maxY);return {x:x,y:y};}
  function desktopGreenLayout(layout){var xr=green?clownRange(green):{minX:def.green.x,maxX:def.green.x},yr=green?clownVerticalRange(green):{minY:def.green.y,maxY:def.green.y},x=clamp(Math.round(bounds.w*0.5),xr.minX,xr.maxX),y=clamp(desktopFishY(layout)+44,yr.minY,yr.maxY);return {x:x,y:y};}
  function fishRange(el){var off=Math.max(42,Math.round(el.offsetWidth*0.46));return {minX:-el.offsetWidth-off,maxX:bounds.w+off};}
  function fishDragRange(el){var off=Math.max(18,Math.round(el.offsetWidth*0.42));return {minX:-off,maxX:bounds.w-el.offsetWidth+off};}
  function fishVerticalRange(el){var off=Math.max(42,Math.round(el.offsetHeight*0.95)),minY=-off,maxY=Math.max(minY,bounds.h-el.offsetHeight+off);return {minY:minY,maxY:maxY};}
  function fishRectAt(x,y){return {left:x+12,top:y+8,right:x+fish.offsetWidth-12,bottom:y+fish.offsetHeight-8};}
  function updateFishVisual(){if(fish){fish.style.setProperty('--sub-hit-shift',fishState.hitShift.toFixed(2)+'px');fish.style.setProperty('--sub-hit-lift',fishState.hitLift.toFixed(2)+'px');fish.style.setProperty('--sub-dir',fishState.dir>=0?'1':'-1');}}
  function setSubmarineDirection(dir){if(!fish)return;fishState.dir=dir>=0?1:-1;fishState.vx=fishState.dir*Math.max(52,Math.min(fishState.cruiseSpeed,Math.abs(fishState.vx)||fishState.cruiseSpeed));fishState.xResumeAt=0;fishState.lastTs=0;updateFishVisual();}
  function flipSubmarineDirection(){setSubmarineDirection(-fishState.dir);}
  function clownRange(el){var off=Math.max(22,Math.round(el.offsetWidth*0.18));return {minX:-off,maxX:Math.max(-off,bounds.w-el.offsetWidth+off)};}
  function clownDragRange(el){var off=Math.max(14,Math.round(el.offsetWidth*0.14));return {minX:-off,maxX:Math.max(-off,bounds.w-el.offsetWidth+off)};}
  function clownVerticalRange(el){var off=Math.max(20,Math.round(el.offsetHeight*0.22)),minY=-off,maxY=Math.max(minY,bounds.h-el.offsetHeight+off);return {minY:minY,maxY:maxY};}
  function updateBuddyVisual(el,state){if(el){el.style.setProperty('--clown-hit-x',state.hitX.toFixed(2)+'px');el.style.setProperty('--clown-hit-y',state.hitY.toFixed(2)+'px');el.style.setProperty('--clown-dir',state.facing>=0?'1':'-1');}}
  function updateClownVisual(){updateBuddyVisual(clown,clownState);}
  function updateVioletVisual(){updateBuddyVisual(violet,violetState);}
  function updateGreenVisual(){updateBuddyVisual(green,greenState);}
  function buddyElByKey(key){if(key==='clown')return clown;if(key==='violet')return violet;if(key==='green')return green;return null;}
  function buddyStateByKey(key){if(key==='clown')return clownState;if(key==='violet')return violetState;if(key==='green')return greenState;return null;}
  function buddyMotionByKey(key){if(key==='clown')return clownMotion;if(key==='violet')return violetMotion;if(key==='green')return greenMotion;return null;}
  function clampBuddyPos(el,key){if(!container||!el)return;updateBounds();var xr=clownRange(el),yr=clownVerticalRange(el);pos[key].x=clamp(pos[key].x,xr.minX,xr.maxX);pos[key].y=clamp(pos[key].y,yr.minY,yr.maxY);el.style.left=pos[key].x+'px';el.style.top=pos[key].y+'px';}
  function clampClownPos(){clampBuddyPos(clown,'clown');}
  function clampVioletPos(){clampBuddyPos(violet,'violet');}
  function clampGreenPos(){clampBuddyPos(green,'green');}
  function buddyCenter(el,key){return {x:pos[key].x+el.offsetWidth*0.5,y:pos[key].y+el.offsetHeight*0.5};}
  function setBuddyCourse(state,motion,ts,forcedDir,boost){var dir=forcedDir;if(!dir)dir=Math.random()<motion.turnChance?-state.facing:state.facing;if(!dir)dir=Math.random()<0.5?-1:1;var dart=!boost&&Math.random()<motion.dartChance,speed=boost?motion.separateMin+Math.random()*motion.separateVar:dart?motion.dartMin+Math.random()*motion.dartMax:motion.baseMin+Math.random()*motion.baseMax;state.targetVx=dir*speed;state.targetVy=(Math.random()-0.5)*(boost?18:dart?34:18);state.nextDecisionAt=ts+(boost?880:motion.nextMin)+Math.random()*(boost?880:motion.nextMax);state.facing=dir>=0?1:-1;}
  function flipBuddyDirection(state,motion,updateVisual){var now=performance.now();stopFishChat(now,false);setBuddyCourse(state,motion,now,-state.facing,true);state.vx=state.targetVx;state.vy=state.targetVy;state.lastTs=0;updateVisual();}
  function bindTapToggle(el,isMoved,toggle,canToggle){
    var clickTimer=0;
    function clearClickTimer(){if(clickTimer){window.clearTimeout(clickTimer);clickTimer=0;}}
    el.addEventListener('click',function(){if(isMoved()||(canToggle&&!canToggle()))return;clearClickTimer();clickTimer=window.setTimeout(function(){clickTimer=0;toggle();},220);});
    el.addEventListener('dblclick',function(e){if(isMoved()||(canToggle&&!canToggle()))return;e.preventDefault();e.stopPropagation();clearClickTimer();toggle();});
  }
  function setFishChatClasses(activeKeys){
    if(clown)clown.classList.toggle('clown-fish-chatting',!!activeKeys&&activeKeys.indexOf('clown')!==-1);
    if(violet)violet.classList.toggle('clown-fish-chatting',!!activeKeys&&activeKeys.indexOf('violet')!==-1);
    if(green)green.classList.toggle('clown-fish-chatting',!!activeKeys&&activeKeys.indexOf('green')!==-1);
  }
  function stopFishChat(ts,withSeparation){
    var wasActive=fishChat.active,leftKey=fishChat.leftKey,rightKey=fishChat.rightKey,leftEl=buddyElByKey(leftKey),rightEl=buddyElByKey(rightKey),leftState=buddyStateByKey(leftKey),rightState=buddyStateByKey(rightKey),leftMotion=buddyMotionByKey(leftKey),rightMotion=buddyMotionByKey(rightKey);
    fishChat.active=false;
    fishChat.until=0;
    fishChat.anchorY=0;
    fishChat.leftKey='';
    fishChat.rightKey='';
    fishChat.pairId='';
    setFishChatClasses([]);
    if(!wasActive)return;
    if(withSeparation&&leftEl&&rightEl&&leftState&&rightState&&leftMotion&&rightMotion){
      if(pos[leftKey].x<=pos[rightKey].x){
        setBuddyCourse(leftState,leftMotion,ts,-1,true);
        setBuddyCourse(rightState,rightMotion,ts,1,true);
      }else{
        setBuddyCourse(leftState,leftMotion,ts,1,true);
        setBuddyCourse(rightState,rightMotion,ts,-1,true);
      }
    }
  }
  function maybeStartFishChat(ts){
    if(fishChat.active)return;
    var candidates=[];
    fishChatPairs.forEach(function(pair){
      var leftKey=pair.keys[0],rightKey=pair.keys[1],leftEl=buddyElByKey(leftKey),rightEl=buddyElByKey(rightKey),leftState=buddyStateByKey(leftKey),rightState=buddyStateByKey(rightKey);
      if(!leftEl||!rightEl||!leftState||!rightState)return;
      var pairCoolingDown=ts<pair.cooldownUntil;
      if(pairCoolingDown||leftEl.classList.contains('postit-dragging')||rightEl.classList.contains('postit-dragging'))return;
      var leftCenter=buddyCenter(leftEl,leftKey),rightCenter=buddyCenter(rightEl,rightKey),xDist=Math.abs(leftCenter.x-rightCenter.x),yDist=Math.abs(leftCenter.y-rightCenter.y),converging=leftCenter.x<rightCenter.x?leftState.vx>5&&rightState.vx<-5:leftState.vx<-5&&rightState.vx>5,facingEachOther=leftCenter.x<rightCenter.x?leftState.facing===1&&rightState.facing===-1:leftState.facing===-1&&rightState.facing===1;
      if(xDist<74&&yDist<28&&(converging||facingEachOther||xDist<42)){
        candidates.push({pair:pair,leftKey:leftKey,rightKey:rightKey,xDist:xDist,yDist:yDist});
      }else if(xDist>98||yDist>42){
        pair.probeAt=0;
      }
    });
    if(!candidates.length)return;
    candidates.sort(function(a,b){
      var lastA=a.pair.lastChatAt||0,lastB=b.pair.lastChatAt||0;
      if(lastA!==lastB)return lastA-lastB;
      return (a.xDist+a.yDist*1.6)-(b.xDist+b.yDist*1.6);
    });
    var candidate=candidates[0],pair=candidate.pair;
    if(!pair.probeAt||ts>=pair.probeAt){
      pair.probeAt=ts+380;
      if(Math.random()<0.62){
        var leftKey=pos[candidate.leftKey].x<=pos[candidate.rightKey].x?candidate.leftKey:candidate.rightKey,rightKey=leftKey===candidate.leftKey?candidate.rightKey:candidate.leftKey;
        fishChat.active=true;
        fishChat.until=ts+1800+Math.random()*2000;
        fishChat.anchorY=(pos[candidate.leftKey].y+pos[candidate.rightKey].y)*0.5;
        fishChat.leftKey=leftKey;
        fishChat.rightKey=rightKey;
        fishChat.pairId=pair.id;
        pair.lastChatAt=ts;
        pair.cooldownUntil=fishChat.until+1200+Math.random()*1800;
        setFishChatClasses([leftKey,rightKey]);
      }else{
        pair.cooldownUntil=ts+860;
      }
    }
  }
  function updateFishChat(ts){
    if(!fishVisible){stopFishChat(ts,false);return;}
    if(fishChat.active){
      var leftEl=buddyElByKey(fishChat.leftKey),rightEl=buddyElByKey(fishChat.rightKey);
      if(!leftEl||!rightEl||leftEl.classList.contains('postit-dragging')||rightEl.classList.contains('postit-dragging')){stopFishChat(ts,false);return;}
      if(ts>=fishChat.until){stopFishChat(ts,true);return;}
    }else{
      maybeStartFishChat(ts);
    }
  }
  function updateFishVisibility(){if(!fish)return;fishVisible=aquariumMode!==0;var cardsHidden=aquariumCardsHidden();fish.classList.toggle('swim-fish-hidden',!fishVisible);fish.setAttribute('aria-hidden',fishVisible?'false':'true');if(clown){clown.classList.toggle('clown-fish-hidden',!fishVisible);clown.setAttribute('aria-hidden',fishVisible?'false':'true');}if(violet){violet.classList.toggle('clown-fish-hidden',!fishVisible);violet.setAttribute('aria-hidden',fishVisible?'false':'true');}if(green){green.classList.toggle('clown-fish-hidden',!fishVisible);green.setAttribute('aria-hidden',fishVisible?'false':'true');}if(container){container.classList.toggle('aquarium-active',fishVisible);container.classList.toggle('aquarium-postits-hidden',cardsHidden);}if(fishToggle){fishToggle.classList.toggle('is-active',fishVisible);fishToggle.classList.toggle('is-muted',cardsHidden);fishToggle.setAttribute('aria-pressed',fishVisible?'true':'false');fishToggle.setAttribute('aria-label',aquariumMode===0?'Show aquarium':aquariumMode===1?'Hide cards':'Turn aquarium off');}if(!fishVisible){fishState.hitShift=0;fishState.hitLift=0;updateFishVisual();stopFishChat(performance.now(),false);if(clown){clownState.hitX=0;clownState.hitY=0;updateClownVisual();clown.classList.remove('clown-fish-bumped');}if(violet){violetState.hitX=0;violetState.hitY=0;updateVioletVisual();violet.classList.remove('clown-fish-bumped');}if(green){greenState.hitX=0;greenState.hitY=0;updateGreenVisual();green.classList.remove('clown-fish-bumped');}}else{fishState.lastTs=0;fishState.anchorY=pos.fish.y;clampPos(fish,'fish');if(clown){clownState.lastTs=0;clownState.nextDecisionAt=0;clampClownPos();updateClownVisual();}if(violet){violetState.lastTs=0;violetState.nextDecisionAt=0;clampVioletPos();updateVioletVisual();}if(green){greenState.lastTs=0;greenState.nextDecisionAt=0;clampGreenPos();updateGreenVisual();}}saveAquariumMode(aquariumMode);}
  function rectsOverlap(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
  function rectInContainer(el){if(!container||!el)return null;var cr=container.getBoundingClientRect();var r=el.getBoundingClientRect();return {left:r.left-cr.left,top:r.top-cr.top,right:r.right-cr.left,bottom:r.bottom-cr.top};}
  function obstacleRects(){if(aquariumCardsHidden())return [];return posts.filter(function(p){return p.el&&p.key!=='fish';}).map(function(p){return rectInContainer(p.el);}).filter(Boolean);}
  function fishBlockedAt(x,y){return false;}
  function fishStopX(obstacle,vx){return vx>=0?obstacle.left-fish.offsetWidth+10:obstacle.right-10;}
  function fishImpact(boxRect,fishRect,vx,vy){var left=fishRect.right-boxRect.left,right=boxRect.right-fishRect.left,top=fishRect.bottom-boxRect.top,bottom=boxRect.bottom-fishRect.top,minX=Math.min(left,right),minY=Math.min(top,bottom),absVx=Math.abs(vx),absVy=Math.abs(vy);if(absVy>absVx*0.95&&minY<=minX+8){if(vy<-3)return {axis:'y',dir:-1,pen:top};if(vy>3)return {axis:'y',dir:1,pen:bottom};}if(minY+2<minX&&absVy>absVx*0.78){if(top<=bottom)return {axis:'y',dir:-1,pen:top};return {axis:'y',dir:1,pen:bottom};}return {axis:'x',dir:vx<0?1:-1,pen:minX};}
  function bumpFish(vx,vy,boxRect,fishRect){if(!fish||!fishVisible)return;var r=fishRange(fish),yr=fishVerticalRange(fish),now=performance.now(),impact=fishImpact(boxRect,fishRect,vx,vy),swimSpeed=Math.abs(fishState.vx),relativeSpeed=Math.max(0,Math.hypot(vx,vy)+swimSpeed*0.2);if(impact.axis==='y'){var reboundY=Math.min(138,5+impact.pen*6.8+relativeSpeed*0.06),separationY=1.1+Math.min(4.6,impact.pen*0.22+reboundY*0.014),driftDelayY=Math.max(110,Math.min(360,95+reboundY*1.7)),targetY=pos.fish.y+impact.dir*separationY;if(boxRect){targetY=impact.dir<0?Math.min(targetY,boxRect.top-fish.offsetHeight+8-separationY):Math.max(targetY,boxRect.bottom-8+separationY);}targetY=Math.max(yr.minY,Math.min(yr.maxY,targetY));pos.fish.y=targetY;fishState.anchorY=targetY;fishState.vy=impact.dir<0?Math.min(fishState.vy,-reboundY):Math.max(fishState.vy,reboundY);fishState.vx=fishState.dir>=0?Math.max(fishState.vx,Math.min(fishState.cruiseSpeed,reboundY*0.45)):Math.min(fishState.vx,-Math.min(fishState.cruiseSpeed,reboundY*0.45));fishState.yResumeAt=now+driftDelayY;fishState.lastTs=0;clampPos(fish,'fish');var settledY=rectInContainer(fish);if(settledY&&rectsOverlap(settledY,boxRect)){var remainY=impact.dir<0?Math.max(0,settledY.bottom-boxRect.top):Math.max(0,boxRect.bottom-settledY.top),snapY=impact.dir<0?boxRect.top-fish.offsetHeight+8-separationY-remainY:boxRect.bottom-8+separationY+remainY;pos.fish.y=Math.max(yr.minY,Math.min(yr.maxY,snapY));fishState.anchorY=pos.fish.y;clampPos(fish,'fish');}var liftMag=0.3+Math.min(1.2,impact.pen*0.04)+Math.min(0.85,reboundY*0.0065);fishState.hitLift=impact.dir<0?Math.min(fishState.hitLift,-liftMag):Math.max(fishState.hitLift,liftMag);}else{var reboundX=Math.min(138,5+impact.pen*6.8+relativeSpeed*0.06),separationX=1.1+Math.min(4.6,impact.pen*0.22+reboundX*0.014),driftDelayX=Math.max(120,Math.min(720,110+reboundX*2.35)),targetX=pos.fish.x+impact.dir*separationX;if(boxRect)targetX=impact.dir<0?Math.min(targetX,boxRect.left-fish.offsetWidth-separationX):Math.max(targetX,boxRect.right-10+separationX);pos.fish.x=impact.dir<0?Math.max(r.minX,targetX):Math.min(r.maxX,targetX);fishState.vx=impact.dir<0?Math.min(fishState.vx,-reboundX):Math.max(fishState.vx,reboundX);fishState.xResumeAt=now+driftDelayX;fishState.lastTs=0;clampPos(fish,'fish');var settledX=rectInContainer(fish);if(settledX&&rectsOverlap(settledX,boxRect)){var remainX=impact.dir<0?Math.max(0,settledX.right-boxRect.left):Math.max(0,boxRect.right-settledX.left);if(remainX>0){pos.fish.x=impact.dir<0?Math.max(r.minX,pos.fish.x-(remainX+separationX)):Math.min(r.maxX,pos.fish.x+(remainX+separationX));clampPos(fish,'fish');}}var shiftMag=0.3+Math.min(1.2,impact.pen*0.04)+Math.min(0.85,reboundX*0.0065);fishState.hitShift=impact.dir<0?Math.min(fishState.hitShift,-shiftMag):Math.max(fishState.hitShift,shiftMag);}updateFishVisual();fish.classList.remove('swim-fish-bumped');void fish.offsetWidth;fish.classList.add('swim-fish-bumped');if(fishState.bumpTimer)clearTimeout(fishState.bumpTimer);fishState.bumpTimer=window.setTimeout(function(){fish.classList.remove('swim-fish-bumped');},320);}
  function maybeBumpFishWith(el,key,vx,vy,ts){return false;}
  function pushPostWithFish(post,dx,dy){
    if(!fish||!fishVisible||!post||!post.el||post.key==='fish'||post.el.classList.contains('postit-dragging'))return false;
    var boxRect=rectInContainer(post.el),fishRect=rectInContainer(fish);
    if(!boxRect||!fishRect||!rectsOverlap(boxRect,fishRect))return false;
    var overlapLeft=fishRect.right-boxRect.left,overlapRight=boxRect.right-fishRect.left,overlapTop=fishRect.bottom-boxRect.top,overlapBottom=boxRect.bottom-fishRect.top,minX=Math.min(overlapLeft,overlapRight),minY=Math.min(overlapTop,overlapBottom),absDx=Math.abs(dx),absDy=Math.abs(dy),axis=absDy>absDx*0.95&&minY<=minX+8?'y':minY+2<minX&&absDy>absDx*0.78?'y':'x',pad=3;
    if(axis==='y'){
      pos[post.key].y+=(dy<0?-(overlapBottom+pad):overlapTop+pad);
    }else{
      pos[post.key].x+=(dx<0?-(overlapRight+pad):overlapLeft+pad);
    }
    clampPos(post.el,post.key);
    boxRect=rectInContainer(post.el);
    fishRect=rectInContainer(fish);
    if(boxRect&&fishRect&&rectsOverlap(boxRect,fishRect)){
      if(axis==='y'){
        var remainY=dy<0?Math.max(0,boxRect.bottom-fishRect.top):Math.max(0,fishRect.bottom-boxRect.top);
        if(remainY>0){pos[post.key].y+=(dy<0?-(remainY+pad):remainY+pad);clampPos(post.el,post.key);}
      }else{
        var remainX=dx<0?Math.max(0,boxRect.right-fishRect.left):Math.max(0,fishRect.right-boxRect.left);
        if(remainX>0){pos[post.key].x+=(dx<0?-(remainX+pad):remainX+pad);clampPos(post.el,post.key);}
      }
    }
    return true;
  }
  function maybePushPostsWithFish(dx,dy){
    if(!fish||!fishVisible||aquariumCardsHidden()||!fish.classList.contains('postit-dragging'))return false;
    var moved=false;
    posts.forEach(function(post){if(post.key!=='fish'&&pushPostWithFish(post,dx,dy))moved=true;});
    return moved;
  }
  function clampPos(el,key){if(!container||!el)return;updateBounds();var p=bounds.pad;if(key==='fish'){var r=fishRange(el),yr=fishVerticalRange(el);pos[key].x=Math.max(r.minX,Math.min(r.maxX,pos[key].x));pos[key].y=Math.max(yr.minY,Math.min(yr.maxY,pos[key].y));el.style.left=pos[key].x+'px';el.style.top=pos[key].y+'px';return;}var w=Math.max(0,bounds.w-el.offsetWidth-p),h=Math.max(0,bounds.h-el.offsetHeight-p);pos[key].x=Math.max(p,Math.min(w,pos[key].x));pos[key].y=Math.max(p,Math.min(h,pos[key].y));el.style.left=pos[key].x+'px';el.style.top=pos[key].y+'px';}
  function applyMobileLayout(){if(!container)return;updateBounds();var loaded=load();if(bounds.w<600){var y=bounds.pad;posts.forEach(function(p){if(p.el&&p.key!=='fish'){pos[p.key]={x:Math.max(bounds.pad,(bounds.w-p.el.offsetWidth)/2),y:y};y+=p.el.offsetHeight+16;}});if(fish){pos.fish.y=loaded.fish&&typeof loaded.fish.y==='number'?loaded.fish.y:y+12;fishState.anchorY=pos.fish.y;}if(clown){var mobileX=clamp(Math.round(bounds.w*0.58),clownRange(clown).minX,clownRange(clown).maxX);var mobileY=clamp(y+54,clownVerticalRange(clown).minY,clownVerticalRange(clown).maxY);if(loaded.clown&&typeof loaded.clown.x==='number'&&typeof loaded.clown.y==='number')pos.clown={x:loaded.clown.x,y:loaded.clown.y};else pos.clown={x:mobileX,y:mobileY};}if(violet){var mobileVX=clamp(Math.round(bounds.w*0.18),clownRange(violet).minX,clownRange(violet).maxX);var mobileVY=clamp(y+88,clownVerticalRange(violet).minY,clownVerticalRange(violet).maxY);if(loaded.violet&&typeof loaded.violet.x==='number'&&typeof loaded.violet.y==='number')pos.violet={x:loaded.violet.x,y:loaded.violet.y};else pos.violet={x:mobileVX,y:mobileVY};}if(green){var mobileGX=clamp(Math.round(bounds.w*0.4),clownRange(green).minX,clownRange(green).maxX);var mobileGY=clamp(y+36,clownVerticalRange(green).minY,clownVerticalRange(green).maxY);if(loaded.green&&typeof loaded.green.x==='number'&&typeof loaded.green.y==='number')pos.green={x:loaded.green.x,y:loaded.green.y};else pos.green={x:mobileGX,y:mobileGY};}}else{var wideDefaults=desktopLayout();var useWideDefaults=shouldUseAquariumDefaults(loaded);posts.forEach(function(p){if(!p.el)return;if(p.key==='fish'){if(useWideDefaults||!(loaded.fish&&typeof loaded.fish.y==='number'))pos.fish.y=desktopFishY(wideDefaults);else pos.fish.y=loaded.fish.y;fishState.anchorY=pos.fish.y;}else if(useWideDefaults){pos[p.key]=wideDefaults[p.key];}else if(loaded[p.key]){pos[p.key]=loaded[p.key];}else{pos[p.key]=wideDefaults[p.key];}});if(clown){if(useWideDefaults||!(loaded.clown&&typeof loaded.clown.x==='number'&&typeof loaded.clown.y==='number'))pos.clown=desktopClownLayout(wideDefaults);else pos.clown={x:loaded.clown.x,y:loaded.clown.y};}if(violet){if(useWideDefaults||!(loaded.violet&&typeof loaded.violet.x==='number'&&typeof loaded.violet.y==='number'))pos.violet=desktopVioletLayout(wideDefaults);else pos.violet={x:loaded.violet.x,y:loaded.violet.y};}if(green){if(useWideDefaults||!(loaded.green&&typeof loaded.green.x==='number'&&typeof loaded.green.y==='number'))pos.green=desktopGreenLayout(wideDefaults);else pos.green={x:loaded.green.x,y:loaded.green.y};}}posts.forEach(function(p){if(p.el)clampPos(p.el,p.key);});if(clown)clampClownPos();if(violet)clampVioletPos();if(green)clampGreenPos();}
  posts.forEach(function(p){if(p.el){if(!pos[p.key])pos[p.key]=def[p.key];}});
  updateFishVisual();
  updateClownVisual();
  updateVioletVisual();
  updateGreenVisual();
  applyMobileLayout();
  updateFishVisibility();
  if(fishToggle){fishToggle.addEventListener('click',cycleAquariumMode);}
  if(container){updateBounds();window.addEventListener('resize',function(){fishState.lastTs=0;clownState.lastTs=0;violetState.lastTs=0;greenState.lastTs=0;applyMobileLayout();});}
  function animateFish(ts){if(!fish){return;}if(!fishState.lastTs)fishState.lastTs=ts;var dt=Math.min(0.05,(ts-fishState.lastTs)/1000);fishState.lastTs=ts;if(Math.abs(fishState.hitShift)>0.08){fishState.hitShift+=(0-fishState.hitShift)*Math.min(1,dt*11);}else if(fishState.hitShift!==0){fishState.hitShift=0;}if(Math.abs(fishState.hitLift)>0.08){fishState.hitLift+=(0-fishState.hitLift)*Math.min(1,dt*11);}else if(fishState.hitLift!==0){fishState.hitLift=0;}updateFishVisual();if(!fishVisible){window.requestAnimationFrame(animateFish);return;}if(!fish.classList.contains('postit-dragging')){var r=fishRange(fish),yr=fishVerticalRange(fish),spanX=Math.max(1,r.maxX-r.minX),targetCruiseVx=fishState.dir*fishState.cruiseSpeed;fishState.anchorY=Math.max(yr.minY,Math.min(yr.maxY,fishState.anchorY));if(ts<fishState.xResumeAt){fishState.vx+=(0-fishState.vx)*Math.min(1,dt*(fishState.vx*targetCruiseVx<0?4.8:5.2));if(Math.abs(fishState.vx)<1.5)fishState.vx=0;}else{fishState.vx+=(targetCruiseVx-fishState.vx)*Math.min(1,dt*2.3);}if(ts<fishState.yResumeAt){fishState.vy+=(0-fishState.vy)*Math.min(1,dt*3.8);}else{fishState.vy+=(fishState.anchorY-pos.fish.y)*180*dt;}fishState.vy*=Math.max(0,1-dt*4.6);if(Math.abs(fishState.anchorY-pos.fish.y)<0.15&&Math.abs(fishState.vy)<0.4){pos.fish.y=fishState.anchorY;fishState.vy=0;}else{var nextY=pos.fish.y+fishState.vy*dt;if(nextY<yr.minY||nextY>yr.maxY){pos.fish.y=wrapCoord(nextY,yr.minY,yr.maxY);fishState.anchorY=pos.fish.y;fishState.yResumeAt=Math.max(fishState.yResumeAt,ts+120);}else{pos.fish.y=nextY;}}var nextX=pos.fish.x+fishState.vx*dt;var blocker=fishBlockedAt(nextX,pos.fish.y);if(blocker){pos.fish.x=fishStopX(blocker,fishState.vx);fishState.vx=0;}else if(nextX>r.maxX){pos.fish.x=r.minX+(nextX-r.maxX)%spanX;}else if(nextX<r.minX){pos.fish.x=r.maxX-(r.minX-nextX)%spanX;}else{pos.fish.x=nextX;}clampPos(fish,'fish');}window.requestAnimationFrame(animateFish);}
  if(fish){window.requestAnimationFrame(animateFish);}
  function animateBuddy(ts,el,key,state,motion){
    if(!el)return;
    if(!state.lastTs)state.lastTs=ts;
    var dt=Math.min(0.05,(ts-state.lastTs)/1000);
    state.lastTs=ts;
    if(Math.abs(state.hitX)>0.08){state.hitX+=(0-state.hitX)*Math.min(1,dt*12);}else if(state.hitX!==0){state.hitX=0;}
    if(Math.abs(state.hitY)>0.08){state.hitY+=(0-state.hitY)*Math.min(1,dt*12);}else if(state.hitY!==0){state.hitY=0;}
    updateBuddyVisual(el,state);
    if(!fishVisible||el.classList.contains('postit-dragging'))return;
    if(fishChat.active&&(key===fishChat.leftKey||key===fishChat.rightKey)){
      var leftKey=fishChat.leftKey,rightKey=fishChat.rightKey,leftEl=buddyElByKey(leftKey),rightEl=buddyElByKey(rightKey);
      if(leftEl&&rightEl){
        var midCenter=(buddyCenter(leftEl,leftKey).x+buddyCenter(rightEl,rightKey).x)*0.5,targetGap=Math.max(74,(leftEl.offsetWidth+rightEl.offsetWidth)*0.54),targetCenterX=midCenter+(key===leftKey?-1:1)*targetGap*0.5,targetX=targetCenterX-el.offsetWidth*0.5,targetY=fishChat.anchorY+Math.sin(ts*0.004+(key===leftKey?0:1.7))*4-el.offsetHeight*0.45;
        pos[key].x+=(targetX-pos[key].x)*Math.min(1,dt*2.6);
        pos[key].y+=(targetY-pos[key].y)*Math.min(1,dt*2.1);
        state.vx+=(0-state.vx)*Math.min(1,dt*4.2);
        state.vy+=(0-state.vy)*Math.min(1,dt*4.2);
        state.targetVx=0;
        state.targetVy=0;
        state.facing=key===leftKey?1:-1;
        clampBuddyPos(el,key);
        return;
      }
    }
    var xr=clownRange(el),yr=clownVerticalRange(el),spanX=Math.max(1,xr.maxX-xr.minX),spanY=Math.max(1,yr.maxY-yr.minY);
    if(!state.nextDecisionAt||ts>=state.nextDecisionAt)setBuddyCourse(state,motion,ts);
    state.vx+=(state.targetVx-state.vx)*Math.min(1,dt*motion.lerpX);
    state.vy+=(state.targetVy-state.vy)*Math.min(1,dt*motion.lerpY);
    state.vy+=Math.sin(ts*motion.driftFreq+state.driftPhase)*motion.driftAmp*dt;
    var nextX=pos[key].x+state.vx*dt;
    if(nextX<xr.minX){pos[key].x=xr.maxX-(xr.minX-nextX)%spanX;}else if(nextX>xr.maxX){pos[key].x=xr.minX+(nextX-xr.maxX)%spanX;}else{pos[key].x=nextX;}
    var nextY=pos[key].y+state.vy*dt;
    if(nextY<yr.minY){pos[key].y=yr.maxY-(yr.minY-nextY)%spanY;}else if(nextY>yr.maxY){pos[key].y=yr.minY+(nextY-yr.maxY)%spanY;}else{pos[key].y=nextY;}
    if(Math.abs(state.vx)>1.2)state.facing=state.vx>=0?1:-1;
    clampBuddyPos(el,key);
  }
  function animateBuddyFish(ts){updateFishChat(ts);if(clown)animateBuddy(ts,clown,'clown',clownState,clownMotion);if(violet)animateBuddy(ts,violet,'violet',violetState,violetMotion);if(green)animateBuddy(ts,green,'green',greenState,greenMotion);window.requestAnimationFrame(animateBuddyFish);}
  if(clown||violet||green){window.requestAnimationFrame(animateBuddyFish);}
  function dragBuddy(el,key,state,motion,updateVisual){
    var startX,startY,ox,oy,moved,lastPointerX,lastPointerY,lastPointerTs,releaseVx=0,releaseVy=0;
    function move(e){
      el.style.cursor='grabbing';
      var x=e.clientX||(e.touches&&e.touches[0].clientX);
      var y=e.clientY||(e.touches&&e.touches[0].clientY);
      if(x===undefined)return;
      var now=performance.now();
      var prevX=pos[key].x,prevY=pos[key].y;
      var dx=x-startX,dy=y-startY;
      if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
      if(container)updateBounds();
      var xr=clownDragRange(el),yr=clownVerticalRange(el);
      pos[key].x=clamp(ox+dx,xr.minX,xr.maxX);
      pos[key].y=wrapCoord(oy+dy,yr.minY,yr.maxY);
      el.style.left=pos[key].x+'px';
      el.style.top=pos[key].y+'px';
      if(lastPointerTs){
        var dtMs=Math.max(16,now-lastPointerTs);
        releaseVx=(x-lastPointerX)/(dtMs/1000);
        releaseVy=(y-lastPointerY)/(dtMs/1000);
      }
      lastPointerX=x;
      lastPointerY=y;
      lastPointerTs=now;
    }
    function stop(e){
      document.removeEventListener('mousemove',move);
      document.removeEventListener('mouseup',stop);
      document.removeEventListener('touchmove',move,{passive:false});
      document.removeEventListener('touchend',stop);
      el.classList.remove('postit-dragging');
      el.style.cursor='';
      state.lastTs=0;
      state.vx=clamp(releaseVx*motion.releaseScale,-motion.releaseMaxX,motion.releaseMaxX);
      state.vy=clamp(releaseVy*motion.releaseScale,-motion.releaseMaxY,motion.releaseMaxY);
      state.targetVx=state.vx||((Math.random()<0.5?-1:1)*(motion.releaseBase+Math.random()*motion.releaseVar));
      state.targetVy=clamp(state.vy*0.28+(Math.random()-0.5)*motion.releaseYJitter,-motion.releaseMaxY*0.58,motion.releaseMaxY*0.58);
      state.facing=state.targetVx>=0?1:-1;
      state.nextDecisionAt=performance.now()+motion.releaseDecisionMin+Math.random()*motion.releaseDecisionVar;
      if(!moved){var x=e.clientX||(e.changedTouches&&e.changedTouches[0].clientX),y=e.clientY||(e.changedTouches&&e.changedTouches[0].clientY);if(x==null||y==null){save(pos);}else{save(pos);}}else{save(pos);}
      setTimeout(function(){moved=false;},0);
    }
    function start(e){
      if(!fishVisible)return;
      e.preventDefault();
      moved=false;
      releaseVx=0;
      releaseVy=0;
      stopFishChat(performance.now(),false);
      el.classList.add('postit-dragging');
      state.hitX=0;
      state.hitY=0;
      updateVisual();
      var x=e.clientX||(e.touches&&e.touches[0].clientX);
      var y=e.clientY||(e.touches&&e.touches[0].clientY);
      startX=x;
      startY=y;
      ox=pos[key].x;
      oy=pos[key].y;
      lastPointerX=x;
      lastPointerY=y;
      lastPointerTs=performance.now();
      document.addEventListener('mousemove',move);
      document.addEventListener('mouseup',stop);
      document.addEventListener('touchmove',move,{passive:false});
      document.addEventListener('touchend',stop);
    }
    el.addEventListener('mouseleave',function(){el.style.cursor='grab';});
    el.addEventListener('mousedown',start);
    el.addEventListener('touchstart',start,{passive:false});
    el.addEventListener('click',function(e){if(moved){e.preventDefault();e.stopPropagation();}},true);
    bindTapToggle(el,function(){return !!moved;},function(){flipBuddyDirection(state,motion,updateVisual);},function(){return fishVisible;});
  }
  function drag(el,key){
    var startX,startY,ox,oy,moved,lastPointerX,lastPointerY,lastPointerTs,lastHitTs,waterX=0,waterY=0,waterTilt=0,waterRaf=0,dragTargetX=0,dragTargetY=0,dragRaf=0,dragActive=false,dragLastTs=0;
    function applyWaterDrag(){if(key==='fish')return;el.style.setProperty('--drag-water-x',waterX.toFixed(2)+'px');el.style.setProperty('--drag-water-y',waterY.toFixed(2)+'px');el.style.setProperty('--drag-water-tilt',waterTilt.toFixed(2)+'deg');}
    function stopWaterDragRaf(){if(waterRaf){window.cancelAnimationFrame(waterRaf);waterRaf=0;}}
    function clearWaterDrag(){if(key==='fish')return;stopWaterDragRaf();waterX=0;waterY=0;waterTilt=0;applyWaterDrag();el.classList.remove('postit-water-settling');}
    function settleWaterDrag(){if(key==='fish')return;stopWaterDragRaf();el.classList.add('postit-water-settling');function tick(){waterX+=(0-waterX)*0.18;waterY+=(0-waterY)*0.18;waterTilt+=(0-waterTilt)*0.16;applyWaterDrag();if(Math.abs(waterX)>0.08||Math.abs(waterY)>0.08||Math.abs(waterTilt)>0.08){waterRaf=window.requestAnimationFrame(tick);}else{clearWaterDrag();}}waterRaf=window.requestAnimationFrame(tick);}
    function updateWaterDrag(vx,vy){if(key==='fish')return;stopWaterDragRaf();el.classList.remove('postit-water-settling');var targetX=Math.max(-10,Math.min(10,-vx*0.007));var targetY=Math.max(-8,Math.min(8,-vy*0.006));var targetTilt=Math.max(-4.8,Math.min(4.8,vx*0.0032));waterX+=(targetX-waterX)*0.42;waterY+=(targetY-waterY)*0.38;waterTilt+=(targetTilt-waterTilt)*0.36;applyWaterDrag();}
    function stopDragRaf(){if(dragRaf){window.cancelAnimationFrame(dragRaf);dragRaf=0;}dragLastTs=0;}
    function animateDrag(ts){
      if(key==='fish'){dragRaf=0;return;}
      if(!dragLastTs)dragLastTs=ts;
      var dtMs=Math.max(16,ts-dragLastTs);
      dragLastTs=ts;
      var prevX=pos[key].x,prevY=pos[key].y;
      var ease=dragActive?0.14:0.11;
      pos[key].x+=(dragTargetX-pos[key].x)*ease;
      pos[key].y+=(dragTargetY-pos[key].y)*ease;
      if(Math.abs(dragTargetX-pos[key].x)<0.25)pos[key].x=dragTargetX;
      if(Math.abs(dragTargetY-pos[key].y)<0.25)pos[key].y=dragTargetY;
      el.style.left=pos[key].x+'px';el.style.top=pos[key].y+'px';
      var vx=(pos[key].x-prevX)/(dtMs/1000),vy=(pos[key].y-prevY)/(dtMs/1000);
      updateWaterDrag(vx,vy);
      var speed=Math.hypot(vx,vy);
      if(speed>8&&(!lastHitTs||ts-lastHitTs>24)&&maybeBumpFishWith(el,key,vx,vy,ts))lastHitTs=ts;
      if(dragActive||Math.abs(dragTargetX-pos[key].x)>0.25||Math.abs(dragTargetY-pos[key].y)>0.25){dragRaf=window.requestAnimationFrame(animateDrag);}else{dragRaf=0;dragLastTs=0;save(pos);}
    }
    function move(e){
      el.style.cursor='grabbing';
      var x=e.clientX||(e.touches&&e.touches[0].clientX);
      var y=e.clientY||(e.touches&&e.touches[0].clientY);
      if(x===undefined)return;
      var now=performance.now();
      var dx=x-startX,dy=y-startY;
      if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
      if(container)updateBounds();
      var p=bounds.pad;
      var minX=p;
      var maxX=Math.max(p,bounds.w-el.offsetWidth-p);
      var maxY=Math.max(p,bounds.h-el.offsetHeight-p);
      if(key==='fish'){var fr=fishDragRange(el),fyr=fishVerticalRange(el);minX=fr.minX;maxX=Math.max(minX,fr.maxX);}
      var nx=Math.max(p,Math.min(maxX,ox+dx));
      if(key==='fish')nx=Math.max(minX,Math.min(maxX,ox+dx));
      var rawNy=oy+dy;
      var ny=Math.max(p,Math.min(maxY,rawNy));
      if(key==='fish')ny=wrapCoord(rawNy,fyr.minY,fyr.maxY);
      if(key==='fish'){
        pos[key].x=nx;pos[key].y=ny;
        fishState.anchorY=ny;
        el.style.left=nx+'px';el.style.top=ny+'px';
        maybePushPostsWithFish(nx-prevX,ny-prevY);
      }else{
        dragTargetX=nx;dragTargetY=ny;
        if(!dragRaf)dragRaf=window.requestAnimationFrame(animateDrag);
      }
      if(lastPointerTs&&key!=='fish'){
        var dtMs=Math.max(16,now-lastPointerTs);
        var vx=(x-lastPointerX)/(dtMs/1000);
        var vy=(y-lastPointerY)/(dtMs/1000);
        updateWaterDrag(vx,vy);
      }
      lastPointerX=x;lastPointerY=y;lastPointerTs=now;
    }
    function stop(e){document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',stop);document.removeEventListener('touchmove',move,{passive:false});document.removeEventListener('touchend',stop);el.classList.remove('postit-dragging');el.style.cursor='';fishState.lastTs=0;dragActive=false;if(key!=='fish'){settleWaterDrag();if(!dragRaf&&(Math.abs(dragTargetX-pos[key].x)>0.25||Math.abs(dragTargetY-pos[key].y)>0.25))dragRaf=window.requestAnimationFrame(animateDrag);}if(!moved){var x=e.clientX||(e.changedTouches&&e.changedTouches[0].clientX),y=e.clientY||(e.changedTouches&&e.changedTouches[0].clientY);var links=el.querySelectorAll('a[href]');if(x!=null)for(var i=0;i<links.length;i++){var r=links[i].getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){if(links[i].target==='_blank')window.open(links[i].href,'_blank');else window.location=links[i].href;break;}}}if(key==='fish'||!dragRaf)save(pos);setTimeout(function(){moved=false;},0);}
    function start(e){
      if(key==='fish'&&!fishVisible)return;
      e.preventDefault();
      moved=false;
      el.classList.add('postit-dragging');
      clearWaterDrag();
      stopDragRaf();
      dragActive=true;
      if(key==='fish'){fishState.hitShift=0;fishState.hitLift=0;updateFishVisual();}
      var x=e.clientX||(e.touches&&e.touches[0].clientX);
      var y=e.clientY||(e.touches&&e.touches[0].clientY);
      startX=x;startY=y;
      ox=pos[key].x;oy=pos[key].y;
      dragTargetX=ox;dragTargetY=oy;
      lastPointerX=x;lastPointerY=y;lastPointerTs=performance.now();lastHitTs=0;
      document.addEventListener('mousemove',move);
      document.addEventListener('mouseup',stop);
      document.addEventListener('touchmove',move,{passive:false});
      document.addEventListener('touchend',stop);
    }
    function updateCursor(e){
      var x=e.clientX,y=e.clientY;
      if(x==null)return;
      var links=el.querySelectorAll('a[href]');
      var over=false;
      for(var i=0;i<links.length;i++){var r=links[i].getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){over=true;break;}}
      el.style.cursor=over?'pointer':'grab';
    }
    el.addEventListener('mousemove',updateCursor);
    el.addEventListener('mouseleave',function(){el.style.cursor='grab';});
    el.addEventListener('mousedown',start);
    el.addEventListener('touchstart',start,{passive:false});
    el.addEventListener('click',function(e){if(moved){e.preventDefault();e.stopPropagation();}},true);
    if(key==='fish')bindTapToggle(el,function(){return !!moved;},flipSubmarineDirection,function(){return fishVisible;});
  }
  posts.forEach(function(p){if(p.el){if(!pos[p.key])pos[p.key]=def[p.key];drag(p.el,p.key);}});
  if(clown)dragBuddy(clown,'clown',clownState,clownMotion,updateClownVisual);
  if(violet)dragBuddy(violet,'violet',violetState,violetMotion,updateVioletVisual);
  if(green)dragBuddy(green,'green',greenState,greenMotion,updateGreenVisual);
})();
