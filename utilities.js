const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

async function downloadFile(url, localPath) {
    const response = await axios({
      url,
      responseType: 'arraybuffer',
    });
  
    await fs.promises.writeFile(localPath, Buffer.from(response.data));
}

async function downloadFiles(audioUrls, folder) {
    const audioPaths = [];
    const promises = []

    for (let i = 0; i < audioUrls.length; i++) {
        const audioPath = `${folder}/audio-${i}.wav`;
        promises.push(downloadFile(audioUrls[i], audioPath));
        audioPaths.push(audioPath);
    }

    await Promise.all(promises);

    return audioPaths;
}

function createVideoFromImagesAndAudio(images, audios, srtPath, outputPath) {
    return new Promise((resolve, reject) => {
        // Ensure there are an equal number of images and audio files
        if (images.length !== audios.length) {
            console.error(JSON.stringify(images))
            console.error(JSON.stringify(audios))
            reject('Number of images and audio files must be the same.');
        }
        let command = ffmpeg();

        // Add input images and audio files to the command
        images.forEach((image, index) => {
            command = command
                .input(image)
                .input(audios[index]);
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

        // Replace backslashes with forward slashes in the SRT path
        const tempDirPath = 'C:/Users/Joe/Projects/prompt-to-storyboard/temp';
        const relativePath = path.relative(path.dirname(tempDirPath), srtPath);

        // Add the subtitles filter to the complex filter graph
        filterStr += `[outv]subtitles=${path.normalize(relativePath).replace(/\\/g, '/')}[finalv]`;

        command
            .complexFilter(filterStr)
            .outputOptions([
                '-map [finalv]',
                '-map [outa]',
                '-c:s mov_text',
                '-metadata:s:s:0 language=eng',
                '-shortest',
                '-y', // Overwrite output file if it exists
            ])
            .on('error', function (err, stdout, stderr) {
                console.log('Error:', err.message);
                console.log('ffmpeg stdout:', stdout);
                console.log('ffmpeg stderr:', stderr);
                reject(err);
            })
            .on('end', () => {
                resolve();
            })
            .save(outputPath);
    });
}
  
function deleteFolder(folderPath, delay = 2000) {
    if (fs.existsSync(folderPath)) {
        setTimeout(() => {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }, delay);
    }
}

async function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
            reject(err);
            } else {
            resolve(metadata.format.duration);
            }
        });
    });
  }

async function generateTranscripts(audioClips, dialogs) {
    const durationPromises = audioClips.map((audioPath) => getAudioDuration(audioPath));
    const durations = await Promise.all(durationPromises);
    
    const transcripts = durations.map((calcDuration, index) => ({
        duration: calcDuration,
        text: dialogs[index],
    }));

    return transcripts;
}

function generateSRT(transcripts, outputPath) {
    let srtContent = '';
    let startTime = 0;
  
    for (let index = 0; index < transcripts.length; index++) {
        const duration = transcripts[index].duration; // Assuming you have the duration of each audio clip
        if (!duration) {
            console.warn(`Duration not found for transcript ${index + 1}`);
          }
        const endTime = startTime + duration;
    
        srtContent += `${index + 1}\n`;
        srtContent += `${formatTimestamp(startTime)} --> ${formatTimestamp(endTime)}\n`;
        srtContent += `${transcripts[index].text}\n\n`;
    
        startTime = endTime;
    };
  
    fs.writeFileSync(outputPath, srtContent);
}

function formatTimestamp(timeInSeconds) {
    const totalSeconds = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds - totalSeconds) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

module.exports = {
    downloadFile,
    downloadFiles,
    createVideoFromImagesAndAudio,
    deleteFolder,
    generateSRT,
    generateTranscripts
  };