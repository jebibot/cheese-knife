export function measureSignal(samples, sampleRate, toneHz = null) {
  if (!samples?.length) throw new Error('samples required');
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('invalid sample rate');
  let sum = 0, squares = 0, peak = 0, overFullScaleSamples = 0, maxAdjacentStep = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    if (!Number.isFinite(value)) throw new Error('non-finite audio sample');
    sum += value; squares += value * value; peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) > 1) overFullScaleSamples++;
    if (i) maxAdjacentStep = Math.max(maxAdjacentStep, Math.abs(value - samples[i-1]));
  }
  const mean = sum / samples.length, rms = Math.sqrt(squares / samples.length);
  const result = { samples:samples.length, mean, rms, peak, peakDbfs:peak ? 20*Math.log10(peak) : null,
    rmsDbfs:rms ? 20*Math.log10(rms) : null, overFullScaleSamples, maxAdjacentStep,
    thdPercent:null, thdnPercent:null, fundamentalAmplitude:null, spectralReason:'' };
  if (toneHz == null) return result;
  if (!Number.isFinite(toneHz) || toneHz <= 0 || toneHz >= sampleRate/2) throw new Error('invalid tone frequency');
  const cycles = toneHz * samples.length / sampleRate;
  if (Math.abs(cycles - Math.round(cycles)) > 1e-6) return {...result,spectralReason:'non-coherent-window'};
  let fundamental = 0, harmonicPower = 0;
  for (let h = 1; h <= 10 && h*toneHz < sampleRate/2; h++) {
    let sin = 0, cos = 0;
    for (let i = 0; i < samples.length; i++) {
      const phase = 2*Math.PI*h*toneHz*i/sampleRate;
      sin += samples[i]*Math.sin(phase); cos += samples[i]*Math.cos(phase);
    }
    const amplitudeSquared = 4*(sin*sin+cos*cos)/(samples.length*samples.length);
    if (h === 1) fundamental = Math.sqrt(amplitudeSquared); else harmonicPower += amplitudeSquared;
  }
  if (fundamental < 1e-9) return {...result,spectralReason:'tone-not-detectable'};
  return {...result,fundamentalAmplitude:fundamental,
    thdPercent:100*Math.sqrt(harmonicPower)/fundamental,
    thdnPercent:100*Math.sqrt(Math.max(0,2*(rms*rms-mean*mean)-fundamental*fundamental))/fundamental};
}

export function channelDifferenceRms(left, right) {
  if (!left?.length || left.length !== right?.length) throw new Error('equal nonempty channels required');
  let squares = 0;
  for (let i = 0; i < left.length; i++) {
    if (!Number.isFinite(left[i]) || !Number.isFinite(right[i])) throw new Error('non-finite audio sample');
    squares += (left[i]-right[i])**2;
  }
  return Math.sqrt(squares/left.length);
}

export function rmsEnvelope(samples,sampleRate,windowMs=8) {
  const windowSamples=Math.round(sampleRate*windowMs/1000);
  if(windowSamples<1||samples.length<windowSamples)throw new Error('invalid envelope window');
  let squares=0,min=Infinity,max=0;
  for(let i=0;i<samples.length;i++){
    if(!Number.isFinite(samples[i]))throw new Error('non-finite audio sample');
    squares+=samples[i]**2;
    if(i>=windowSamples)squares-=samples[i-windowSamples]**2;
    if(i>=windowSamples-1){const value=Math.sqrt(Math.max(0,squares/windowSamples));min=Math.min(min,value);max=Math.max(max,value);}
  }
  return {windowSamples,min,max};
}
