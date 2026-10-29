// Guards both late audio and text from responses interrupted in this connection.
export class ResponseGuard {
  active = null;
  blocked = new Set();
  pending = false;
  audioStream = null;
  interrupt() {
    if(this.active) this.blocked.add(this.active);
    this.active = null;
    this.pending = true;
  }
  accept(event) {
    if(event.type === 'response.canceled') { this.pending = false; return true; }
    if(event.type === 'response.done') {
      const id=event.response_id||event.response?.id;
      if(this.pending||(id&&this.blocked.has(id)))return false;
      if(!id||id===this.active)this.active=null;
      return true;
    }
    if(!event.type.startsWith('response.output_')) return true;
    // Seeduplex audio.delta has no response_id; started establishes its stream.
    if(event.type === 'response.output_audio.started') this.audioStream=event.response_id;
    const id = event.response_id || (event.type.startsWith('response.output_audio.') ? this.audioStream : null);
    if(id && this.blocked.has(id)) return false;
    if(this.pending) {
      if(id) this.blocked.add(id);
      return false;
    }
    if(id) this.active = id;
    return true;
  }
}
