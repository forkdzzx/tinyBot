import {LocalSpotter,EXPERIMENTAL_WAKE_INDEXES} from './wake-core.mjs';
try{
  const engine=new LocalSpotter({phraseIndexes:EXPERIMENTAL_WAKE_INDEXES});let enabled=false,epoch=0;
  process.on('message',e=>{
    try{
      if(e.type==='listen'){epoch=e.epoch;enabled=true;engine.reset();process.send({type:'listening',epoch});}
      else if(e.type==='pause'){epoch=e.epoch;enabled=false;engine.reset();}
      else if(e.type==='audio'){
        if(enabled&&e.epoch===epoch){
          const result=engine.accept(e.pcm);
          if(result){enabled=false;process.send({type:'hit',index:result.index,epoch});}
        }
        process.send({type:'ack'});
      }
    }catch{enabled=false;process.send({type:'error'});}
  });
  process.on('disconnect',()=>process.exit());
  process.send({type:'ready'});
}catch{process.send?.({type:'error'});process.exitCode=1;}
