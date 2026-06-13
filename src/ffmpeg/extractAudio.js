function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  let interleaved;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      interleaved[i * 2] = left[i];
      interleaved[i * 2 + 1] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const dataLength = interleaved.length * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function extractAudio(file, audioBitrate, onProgress) {
  return new Promise((resolve, reject) => {
    const audioCtx = new AudioContext();
    const reader = new FileReader();

    let targetSampleRate = 44100;
    if (audioBitrate) {
      const bitrateNum = parseInt(audioBitrate);
      if (bitrateNum <= 64) targetSampleRate = 22050;
      else if (bitrateNum <= 128) targetSampleRate = 32000;
      else if (bitrateNum <= 192) targetSampleRate = 44100;
      else targetSampleRate = 48000;
    }

    reader.onload = async (e) => {
      try {
        const audioBuffer = await audioCtx.decodeAudioData(e.target.result);

        const offlineCtx = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.duration * targetSampleRate,
          targetSampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        const resampledBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(resampledBuffer);

        onProgress(100);
        audioCtx.close();
        resolve(wavBlob);
      } catch (err) {
        audioCtx.close();
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsArrayBuffer(file);
  });
}
