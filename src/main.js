import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import "./style.css";
const $=s=>document.querySelector(s);
let model=null,img=null;
const canvas=$("#faceCanvas"),ctx=canvas.getContext("2d");
async function init(){
 $("#status").textContent="ENGINE STATUS: LOADING LOCAL MODEL";
 try{
  const appRoot=new URL("../",import.meta.url); const vision=await FilesetResolver.forVisionTasks(new URL("wasm/",appRoot).href);
  model=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:new URL("models/face_landmarker.task",appRoot).href,delegate:"CPU"},runningMode:"IMAGE",numFaces:1});
  $("#status").textContent="ENGINE STATUS: READY • LOCAL MODEL";
  $("#run").disabled=!img;
 }catch(e){$("#status").textContent="MODEL ERROR: "+(e?.message||String(e));console.error(e);}
}
$("#photo").addEventListener("change",e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith("image/"))return;
 const url=URL.createObjectURL(file),next=new Image();
 next.onload=()=>{img=next;canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;ctx.drawImage(img,0,0);$("#previewWrap").hidden=false;$("#run").disabled=!model;};
 next.src=url;
});
function imageMetrics(image){
 const w=240,h=Math.max(1,Math.round(w*image.naturalHeight/image.naturalWidth)),c=document.createElement("canvas");c.width=w;c.height=h;
 const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(image,0,0,w,h);const d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h);
 let sum=0,sum2=0,edges=0;
 for(let i=0,p=0;i<d.length;i+=4,p++){const v=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];g[p]=v;sum+=v;sum2+=v*v;}
 const n=w*h,mean=sum/n,sd=Math.sqrt(Math.max(0,sum2/n-mean*mean));
 for(let y=1;y<h;y++)for(let xx=1;xx<w;xx++){const p=y*w+xx;edges+=Math.abs(g[p]-g[p-1])+Math.abs(g[p]-g[p-w]);}
 const clamp=v=>Math.max(0,Math.min(100,v));
 const q={lighting:clamp(100-Math.abs(mean-128)/1.28),contrast:clamp(sd/64*100),sharpness:clamp(edges/(2*n)/28*100),portrait:clamp(100-Math.abs(Math.log((image.naturalWidth/image.naturalHeight)/.75))*28)};
 return q;
}
function paintMesh(points){
 ctx.drawImage(img,0,0,canvas.width,canvas.height);
 ctx.save();ctx.strokeStyle="rgba(255,121,54,.7)";ctx.lineWidth=Math.max(1,canvas.width/900);
 for(const e of FaceLandmarker.FACE_LANDMARKS_TESSELATION){const a=points[e.start],b=points[e.end];if(!a||!b)continue;ctx.beginPath();ctx.moveTo(a.x*canvas.width,a.y*canvas.height);ctx.lineTo(b.x*canvas.width,b.y*canvas.height);ctx.stroke();}
 ctx.fillStyle="#8be0b5";for(const p of points){ctx.beginPath();ctx.arc(p.x*canvas.width,p.y*canvas.height,Math.max(1,canvas.width/650),0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function report(points,q){
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
 const centering=Math.max(0,100-(Math.abs(cx-.5)*160+Math.abs(cy-.48)*100));
 const faceSize=Math.min(100,(Math.max(...ys)-Math.min(...ys))*180);
 const data=[["LIGHTING",q.lighting],["CONTRAST",q.contrast],["SHARPNESS",q.sharpness],["PORTRAIT FRAMING",q.portrait],["FACE CENTERING",centering],["FACE SIZE IN FRAME",faceSize]];
 const total=Math.round(data.reduce((a,v)=>a+v[1],0)/data.length);
 $("#overall").textContent=total;$("#indexTag").textContent=total>=80?"STRONG IMAGE":total>=60?"FAIR IMAGE":"RETAKE SUGGESTED";
 $("#metrics").innerHTML=data.map(([name,val])=>`<div class="metric"><b>${Math.round(val)}%</b><small>${name}</small></div>`).join("");
 const sorted=[...data].sort((a,b)=>b[1]-a[1]),low=[...data].sort((a,b)=>a[1]-b[1]);
 $("#best").textContent=`${sorted[0][0]} — ${Math.round(sorted[0][1])}%`;
 $("#worst").textContent=`${low[0][0]} — ${Math.round(low[0][1])}%`;
 const tips=[];
 if(q.lighting<65)tips.push("Lighting: face a window or soft light source. Avoid strong light behind you.");
 if(q.contrast<40)tips.push("Contrast: use even lighting and a simple background; harsh shadows can obscure details.");
 if(q.sharpness<50)tips.push("Sharpness: clean the lens, hold the phone steady and avoid digital zoom.");
 if(q.portrait<60)tips.push("Framing: try a vertical portrait crop with a little space above the head.");
 if(centering<65)tips.push("Centering: position the face closer to the middle of the frame.");
 if(faceSize<45)tips.push("Distance: move a little closer while keeping the camera at a natural eye-level angle.");
 if(!tips.length)tips.push("The photo has a balanced technical baseline. Keep the same lighting and camera distance when comparing photos.");
 tips.push("The face mesh maps 478 landmarks for tracking effects; it does not rate individual facial traits.");
 $("#recommendations").innerHTML=tips.map(t=>`<li>${t}</li>`).join("");
}
$("#run").addEventListener("click",()=>{
 if(!model||!img)return;
 $("#status").textContent="ENGINE STATUS: ANALYZING ON DEVICE";
 try{
  const result=model.detect(img);
  if(!result.faceLandmarks?.length){$("#status").textContent="NO FACE DETECTED — TRY A CLEARER, FRONT-FACING PHOTO";return;}
  const points=result.faceLandmarks[0];paintMesh(points);$("#landmarkCount").textContent=points.length;$("#meshBar").style.width=(points.length/478*100)+"%";
  report(points,imageMetrics(img));$("#report").hidden=false;$("#status").textContent="ENGINE STATUS: COMPLETE • IMAGE NOT UPLOADED";$("#report").scrollIntoView({behavior:"smooth"});
 }catch(err){$("#status").textContent="ANALYSIS ERROR";console.error(err);}
});
$("#reset").addEventListener("click",()=>{img=null;$("#photo").value="";$("#previewWrap").hidden=true;$("#report").hidden=true;$("#run").disabled=true;$("#status").textContent="ENGINE STATUS: WAITING FOR IMAGE";});
init();