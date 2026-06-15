// Sintetizador de áudio local com a Web Audio API para efeitos retro do Jogo do Galo

export function playSound(type: 'click_x' | 'click_o' | 'win' | 'draw' | 'reset') {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'click_x') {
      // Tom alto limpo e rápido
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'click_o') {
      // Tom médio e macio
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'win') {
      // Melodia triunfante em arpejo ascendente
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      notes.forEach((freq, index) => {
        const itemOsc = ctx.createOscillator();
        const itemGain = ctx.createGain();
        
        itemOsc.type = 'sine';
        itemOsc.frequency.setValueAtTime(freq, now + index * 0.1);
        
        itemGain.gain.setValueAtTime(0.08, now + index * 0.1);
        itemGain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.3);
        
        itemOsc.connect(itemGain);
        itemGain.connect(ctx.destination);
        
        itemOsc.start(now + index * 0.1);
        itemOsc.stop(now + index * 0.1 + 0.3);
      });
    } else if (type === 'draw') {
      // Descida simples neutra
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'reset') {
      // Varredura sonora ascendente
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (error) {
    console.warn('Falha ao inicializar áudio ou áudio desativado:', error);
  }
}
