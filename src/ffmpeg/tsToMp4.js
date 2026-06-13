import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from './loadFFmpeg';

export async function tsToMp4(file, onProgress) {
  console.log('[tsToMp4] Начало конвертации файла:', file.name, file.size, 'bytes');

  try {
    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile('input.ts', await fetchFile(file));

    const progressHandler = (progress) => {
      const pct = Math.round(progress.progress * 100);
      console.log('[tsToMp4] Прогресс:', pct + '%');
      onProgress(pct);
    };
    ffmpeg.on('progress', progressHandler);

    let outputData;
    try {
      console.log('[tsToMp4] Перепаковка TS → MP4 без аудио...');

      await ffmpeg.exec([
        '-i', 'input.ts',
        '-c:v', 'copy',
        '-an',
        '-movflags', '+faststart',
        'output.mp4'
      ]);

      outputData = await ffmpeg.readFile('output.mp4');

      await ffmpeg.deleteFile('input.ts');
      await ffmpeg.deleteFile('output.mp4');

      console.log('[tsToMp4] Конвертация завершена, размер:', outputData.byteLength);
    } finally {
      ffmpeg.off('progress', progressHandler);
    }

    const outputBlob = new Blob([outputData], { type: 'video/mp4' });
    const baseName = file.name.replace(/\.ts$/i, '');
    const newFile = new File([outputBlob], baseName + '_converted.mp4', { type: 'video/mp4' });

    return newFile;
  } catch (error) {
    console.error('[tsToMp4] Ошибка конвертации:', error);
    throw new Error('Не удалось конвертировать TS файл: ' + (error.message || 'неизвестная ошибка'));
  }
}
