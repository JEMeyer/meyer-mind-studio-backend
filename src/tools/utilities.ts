import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { SoxCommand } from 'sox-audio';

import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || '');
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || '');

import os from 'os';
import { Transcript } from '../types/types';
import { FfmpegError } from './exceptions';
const platform = os.platform();

export async function downloadFile(url: string, localPath: string) {
  const response = await axios({
    url,
    responseType: 'arraybuffer',
  });

  await fs.promises.writeFile(localPath, Buffer.from(response.data));
}

export async function downloadAndTrimAudio(url: string, localPath: string) {
  await downloadFile(url, localPath);
  await trimAudioFile(localPath);
}

export function createVideoFromImagesAndAudio(
  images: string[],
  audios: string[],
  srtPath: string,
  outputPath: string
) {
  return new Promise<void>((resolve, reject) => {
    // Ensure there are an equal number of images and audio files
    if (images.length !== audios.length) {
      console.error(JSON.stringify(images));
      console.error(JSON.stringify(audios));
      reject('Number of images and audio files must be the same.');
    }
    let command = ffmpeg();

    // Add input images and audio files to the command
    images.forEach((image, index) => {
      command = command.input(image).input(audios[index]);
    });

    // Set up complex filter graph
    let filterStr = '';
    for (let i = 0; i < images.length * 2; i += 2) {
      filterStr += `[${i}:v]scale=512:512,setpts=PTS-STARTPTS[v${i / 2}];`;
      filterStr += `[${i + 1}:a]asetpts=PTS-STARTPTS[a${i / 2}];`;
    }
    filterStr += `[v0][a0]`;
    for (let i = 1; i < images.length; i++) {
      filterStr += `[v${i}][a${i}]`;
    }
    filterStr += `concat=n=${images.length}:v=1:a=1[outv][outa];`;

    if (platform === 'win32') {
      // Windows-specific code
      const tempDirPath = path
        .normalize(`${process.cwd()}/temp`)
        .replace(/\\/g, '/');
      const relativePath = path.relative(path.dirname(tempDirPath), srtPath);
      // Add the subtitles filter to the complex filter graph
      filterStr += `[outv]subtitles=${path
        .normalize(relativePath)
        .replace(/\\/g, '/')}[finalv]`;
    } else {
      // Linux-specific code
      filterStr += `[outv]subtitles=${srtPath}[finalv]`;
    }

    command
      .complexFilter(filterStr)
      .outputOptions([
        '-map [finalv]',
        '-map [outa]',
        '-c:v libx264',
        '-profile:v high',
        '-pix_fmt yuv420p',
        '-c:s mov_text',
        '-metadata:s:s:0 language=eng',
        '-y', // Overwrite output file if it exists
      ])
      .on('error', function (err, stdout, stderr) {
        console.log('Error:', err.message);
        console.log('ffmpeg stdout:', stdout);
        console.log('ffmpeg stderr:', stderr);
        reject(new FfmpegError());
      })
      .on('end', () => {
        resolve();
      })
      .save(outputPath);
  });
}

export function deleteFolder(folderPath: string, delay = 2000) {
  if (fs.existsSync(folderPath)) {
    setTimeout(() => {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }, delay);
  }
}

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration || 0);
      }
    });
  });
}

export async function generateTranscripts(
  audioClips: string[],
  dialogs: string[]
): Promise<Transcript[]> {
  const durationPromises = audioClips.map((audioPath) =>
    getAudioDuration(audioPath)
  );
  const durations = await Promise.all(durationPromises);

  const transcripts = durations.map((calcDuration, index) => ({
    duration: calcDuration,
    text: dialogs[index],
  }));

  return transcripts;
}


// Create a function to trim the audio
export async function trimAudioFile(filepath: string, silenceThreshold = 0.1, silenceDuration = 1): Promise<void> {
  try {
    // Create a new SoxCommand instance
    const command = new SoxCommand();

    command.input(filepath)
        .inputFileType('wav')
        .output(filepath)  // Overwrite original file
        .outputFileType('wav')
        .addEffect('silence', [1, silenceDuration, silenceThreshold + 'd', '-1', silenceDuration, silenceThreshold + 'd']);

    // Execute the command
    await new Promise<void>((resolve, reject) => {
        command.run((err: Error) => {
            if (err) reject(err);
            else resolve();
        });
    });
  } catch (e) {
    console.error(e);
    console.error('dead in trim');
  }
}

export function generateSRT(transcripts: Transcript[], outputPath: string) {
  let srtContent = '';
  let startTime = 0;

  for (let index = 0; index < transcripts.length; index++) {
    const duration = transcripts[index].duration; // Assuming you have the duration of each audio clip
    if (!duration) {
      console.warn(`Duration not found for transcript ${index + 1}`);
    }
    const endTime = startTime + duration;

    srtContent += `${index + 1}\n`;
    srtContent += `${formatTimestamp(startTime)} --> ${formatTimestamp(
      endTime
    )}\n`;
    srtContent += `${transcripts[index].text}\n\n`;

    startTime = endTime;
  }

  fs.writeFileSync(outputPath, srtContent);
}

export function formatTimestamp(timeInSeconds: number) {
  const totalSeconds = Math.floor(timeInSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds - totalSeconds) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds
      .toString()
      .padStart(3, '0')}`;
}

export function isEnumKey<K extends string | number | symbol>(
  e: Record<K, unknown>,
  key: unknown
): key is K {
  return Object.values(e).includes(key);
}

export function safeStringify(obj: any) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return; // Exclude circular references
      }
      cache.add(value);
    }
    return value;
  });
}
