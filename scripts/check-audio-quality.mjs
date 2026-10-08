// Synthetic signals only, fresh profile. Capture the production graph's summed
// floating output before a silent sink; never record a broadcast/user profile.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createRequire} from 'node:module';
import {measureSignal,channelDifferenceRms,rmsEnvelope} from './audio-metrics.mjs';
const require=createRequire(import.meta.url);
const {playerHTML}=require('../tests/helpers.cjs');
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
const output=path.resolve('output/audio-quality');
try {
  const page=await browser.newPage();
  await page.route('https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',route=>route.fulfill({contentType:'text/html',body:playerHTML}));
  await page.goto('https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  await page.evaluate(async()=>{
    const Native=window.AudioContext;
    const context=new Native({sampleRate:48000});
    const probe=window.__quality={context,chunks:[],sources:0,compressors:[],gains:[]};
    const code=`class Capture extends AudioWorkletProcessor {
      process(inputs,outputs) {
        for(const channel of outputs[0]||[]) channel.fill(0);
        const samples=(inputs[0]||[]).map(channel=>new Float32Array(channel));
        this.port.postMessage({frame:currentFrame,samples},samples.map(channel=>channel.buffer));
        return true;
      }
    } registerProcessor('knife-quality-capture',Capture);`;
    const module=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
    await context.audioWorklet.addModule(module); URL.revokeObjectURL(module);
    const sink=new AudioWorkletNode(context,'knife-quality-capture',{numberOfInputs:1,numberOfOutputs:1,
      outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    // Keep native processing active but deliver zeros to the real speakers.
    sink.connect(context.destination);
    sink.port.onmessage=({data})=>{probe.chunks.push(data);while(probe.chunks.length>2000)probe.chunks.shift();};
    Object.defineProperty(context,'destination',{get:()=>sink});
    const source=context.createMediaElementSource.bind(context);
    context.createMediaElementSource=video=>{const node=source(video);probe.sources++;return node;};
    const compressor=context.createDynamicsCompressor.bind(context);
    context.createDynamicsCompressor=()=>{const node=compressor();probe.compressors.push(node);return node;};
    const gain=context.createGain.bind(context);
    context.createGain=()=>{const node=gain();probe.gains.push(node);return node;};
    window.AudioContext=class {constructor(){return context;}};
  });
  for(const file of ['config.js','web/runtime.js','web/audio.js','web/player.js']) await page.evaluate(await fs.readFile(file,'utf8'));
  await page.evaluate(()=>{
    const runtime=window[Symbol.for('cheese-knife.runtime.v1')];
    window.postMessage({namespace:'cheese-knife',protocol:1,type:'config',requestId:runtime.requestId,
      revision:100,config:normalizeConfig({})},location.origin);
  });
  await page.locator('.knife-comp').waitFor();
  const signal=async({frequency=1000,amplitude=0.5,stereo='identical',bursts=false}={})=>{
    await page.evaluate(async options=>{
      const probe=window.__quality,video=document.querySelector('video'); video.pause();
      const rate=probe.context.sampleRate,length=rate*8,bytes=new ArrayBuffer(44+length*4),view=new DataView(bytes);
      const text=(offset,value)=>[...value].forEach((char,i)=>view.setUint8(offset+i,char.charCodeAt(0)));
      text(0,'RIFF');view.setUint32(4,36+length*4,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
      view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);
      view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length*4,true);
      for(let i=0;i<length;i++){
        const amplitude=options.bursts?(i%Math.round(rate*0.1)<rate*0.02?0.98:0.02):options.amplitude;
        const value=Math.sin(2*Math.PI*options.frequency*i/rate+0.37)*amplitude;
        view.setInt16(44+i*4,Math.round(value*32767),true);
        view.setInt16(46+i*4,options.stereo==='left-only'?0:Math.round(value*32767),true);
      }
      if(probe.url)URL.revokeObjectURL(probe.url);
      video.loop=true;video.src=probe.url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));
      await new Promise((resolve,reject)=>{video.addEventListener('loadeddata',resolve,{once:true});video.addEventListener('error',reject,{once:true});});
    },{frequency,amplitude,stereo,bursts});
  };
  await signal();
  // The media is still paused: interception precedes the first playback.
  await page.locator('.knife-comp button').click();
  await page.waitForFunction(()=>document.querySelector('.knife-comp').dataset.state==='on');
  const captured=await page.evaluate(()=>({sources:window.__quality.sources,state:window.__quality.context.state}));
  if(captured.sources!==1||captured.state!=='running')throw new Error('Cannot safely start synthetic audio capture');
  const run=async(enabled,gain)=>page.evaluate(async ({enabled,gain})=>{
    const runtime=window[Symbol.for('cheese-knife.runtime.v1')],video=document.querySelector('video');
    runtime.audio.setGain(video,gain);await runtime.audio.setEnabled(video,enabled); await video.play();
  },{enabled,gain});
  const windowSamples=async(start,end)=>page.evaluate(({start,end})=>{
    const rate=window.__quality.context.sampleRate,chunks=window.__quality.chunks;
    const last=chunks.at(-1);if(!last?.samples[0])throw new Error('No captured audio');
    end??=last.frame+last.samples[0].length;start??=end-Math.round(rate*0.5);
    const channels=[new Float32Array(end-start),new Float32Array(end-start)],covered=new Uint8Array(end-start);
    for(const chunk of chunks){
      const a=Math.max(start,chunk.frame),b=Math.min(end,chunk.frame+(chunk.samples[0]?.length||0));if(a>=b)continue;
      covered.fill(1,a-start,b-start);
      for(let channel=0;channel<2;channel++)if(chunk.samples[channel])channels[channel].set(chunk.samples[channel].subarray(a-chunk.frame,b-chunk.frame),a-start);
    }
    if(covered.some(value=>!value))throw new Error('Incomplete audio capture window');
    return {rate,start,end,channels:channels.map(channel=>Array.from(channel))};
  },{start,end});
  const summarize=(data,frequency)=>({sampleRate:data.rate,windowSeconds:(data.end-data.start)/data.rate,
    channels:data.channels.map(channel=>({...measureSignal(channel,data.rate,frequency),envelope8ms:rmsEnvelope(channel,data.rate)})),channelDifferenceRms:channelDifferenceRms(...data.channels)});
  const cases=[];
  for(const [frequency,amplitude,gain,enabled,stereo,bursts] of [
    [1000,0.5,1,false,'identical',false],
    [1000,0.01,1,false,'identical',false],[100,0.8,1,false,'identical',false],[5000,0.8,1,false,'identical',false],
    [1000,0.5,1,true,'identical',false],
    [1000,0.01,1.5,true,'identical',false],[1000,0.1,1.5,true,'identical',false],
    [1000,0.5,1.5,true,'identical',false],[1000,0.98,1.5,true,'identical',false],
    [1000,0.98,2,true,'identical',false],[100,0.8,1.5,true,'identical',false],
    [5000,0.8,1.5,true,'identical',false],[1000,0.5,1.5,true,'left-only',false],
    [1000,0.98,1.5,true,'identical',true]]){
    await signal({frequency,amplitude,stereo,bursts});await run(enabled,gain);await page.waitForTimeout(1750);
    cases.push({frequency,inputAmplitude:amplitude,gain,enabled,stereo,bursts,...summarize(await windowSamples(),bursts?null:frequency)});
  }
  const transitions=[];
  for(const frequency of [250,750,1000]){
    await signal({frequency,amplitude:0.5});await run(true,1);await page.waitForTimeout(1500);
    for(const [kind,value] of [['gain',1.5],['gain',2],['gain',0],['gain',1],['enabled',false],['enabled',true]]){
      const frame=await page.evaluate(async({kind,value})=>{
        const runtime=window[Symbol.for('cheese-knife.runtime.v1')],video=document.querySelector('video');
        const frame=Math.round(window.__quality.context.currentTime*window.__quality.context.sampleRate);
        if(kind==='gain')runtime.audio.setGain(video,value);else await runtime.audio.setEnabled(video,value);
        return frame;
      },{kind,value});
      await page.waitForTimeout(300);
      const rate=await page.evaluate(()=>window.__quality.context.sampleRate);
      transitions.push({frequency,kind,value,
        before:summarize(await windowSamples(frame-Math.round(rate*0.08),frame-Math.round(rate*0.04))),
        change:summarize(await windowSamples(frame-Math.round(rate*0.02),frame+Math.round(rate*0.04))),
        after:summarize(await windowSamples(frame+Math.round(rate*0.1),frame+Math.round(rate*0.14)))});
    }
  }
  // Explicitly labeled stress case; no user's settings or speakers are changed.
  await page.evaluate(()=>{const runtime=window[Symbol.for('cheese-knife.runtime.v1')];
    window.__quality.defaultConfig=runtime.config;
    runtime.config={...runtime.config,compressorThreshold:0,compressorKnee:0,compressorRatio:1};runtime.audio.configure();});
  await signal({frequency:1000,amplitude:0.98});await run(true,2);await page.waitForTimeout(1750);
  const stress={profile:'threshold0/knee0/ratio1/gain2',...summarize(await windowSamples(),1000)};
  await page.evaluate(()=>{const runtime=window[Symbol.for('cheese-knife.runtime.v1')];runtime.config=window.__quality.defaultConfig;runtime.audio.configure();});
  const nodes=await page.evaluate(()=>({sources:window.__quality.sources,
    compressor:window.__quality.compressors.map(node=>Object.fromEntries(['threshold','knee','ratio','attack','release'].map(key=>[key,node[key].value]))),
    sampleRate:window.__quality.context.sampleRate}));
  await page.evaluate(async()=>{document.querySelector('video').pause();await window.__quality.context.close();});
  const report={browser:browser.version(),profile:'fresh synthetic, silent output sink',configuration:'normalized defaults; separately labeled stress case',nodes,cases,transitions,stress,
    limits:'Steady coherent-window THD reports harmonics 2..10 below Nyquist, not all distortion. Floating >1 indicates headroom risk, not a measured hardware clip. Synthetic data is not subjective listening.'};
  if(nodes.sources!==1||cases[0].channels[0].rms<0.34||cases[0].channels[0].rms>0.36)throw new Error('Capture calibration failed');
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({browser:report.browser,nodes,report:path.join(output,'report.json'),cases:cases.map(item=>({frequency:item.frequency,amplitude:item.inputAmplitude,gain:item.gain,enabled:item.enabled,stereo:item.stereo,bursts:item.bursts,peak:item.channels[0].peak,rms:item.channels[0].rms,overFullScaleSamples:item.channels[0].overFullScaleSamples,thdPercent:item.channels[0].thdPercent})),
    stress:{profile:stress.profile,peak:stress.channels[0].peak,overFullScaleSamples:stress.channels[0].overFullScaleSamples},
    transitions:transitions.map(item=>({frequency:item.frequency,kind:item.kind,value:item.value,maxAdjacentStep:item.change.channels[0].maxAdjacentStep,baselineAdjacentStep:Math.max(item.before.channels[0].maxAdjacentStep,item.after.channels[0].maxAdjacentStep),peak:item.change.channels[0].peak,min8msRms:item.change.channels[0].envelope8ms.min,baselineMin8msRms:Math.min(item.before.channels[0].envelope8ms.min,item.after.channels[0].envelope8ms.min)}))},null,2));
}finally{await browser.close();}
