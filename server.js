// Require express
require('dotenv').config();
const express = require("express");
const fs = require('fs').promises;
const multer = require('multer');
const Coqui = require('./coqui.js');
const { createVideoFromImagesAndAudio, deleteFolder, generateSRT, generateTranscripts} = require('./utilities.js');
const OpenAI = require('./openai.js');
const Stability = require('./stabilityai.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { createReadStream } = require('fs');

// Initialize express
const app = express();
const PORT = 12345;

const upload = multer({ storage: multer.memoryStorage() });

// parse JSON
app.use(express.json());

// parse URL encoded data
app.use(express.urlencoded({ extended: true }));

// create a server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.post('/promptToStoryboard', upload.none(), async (req, res) => {
    // Check if request body is empty
    if (!Object.keys(req.body).length) {
        return res.status(400).json({
            message: "Request body cannot be empty",
        });
    }

    try {

        // Use object destructuring to get name and age
        const prompt = req.body.prompt;

        const gpt_output = await OpenAI.GenerateStoryboard(prompt)

        speakers = []
        for (let x in gpt_output.speakers) {
            const gender = gpt_output.speakers[x].gender
            const desc = gpt_output.speakers[x].description
            if (gender === 'male') {
                speakers.push({
                    id:  gpt_output.speakers[x].id,
                    speaker: Coqui.MaleSpeakers[Math.floor(Math.random() * Coqui.MaleSpeakers.length)].id,
                    description: desc
                })
            } else {
                speakers.push({
                    id:  gpt_output.speakers[x].id,
                    speaker: Coqui.FemaleSpeakers[Math.floor(Math.random() * Coqui.FemaleSpeakers.length)].id,
                    description: desc
                })
            }
        }

        console.log(gpt_output)

        const currentWorkingDirectory = process.cwd();
        const uniqueFolder = path.join(currentWorkingDirectory, 'temp', uuidv4());
        imagePromises = []
        audioPromises = []

        await fs.mkdir(uniqueFolder, { recursive: true });

        for (let x in gpt_output.frames) {
            imagePromises.push(Stability.GenerateFrame(gpt_output.frames[x]['frame_desc'], speakers, gpt_output.theme, gpt_output.theme, uniqueFolder));
            audioPromises.push(Coqui.CreateSoundSample(speakers[gpt_output.frames[x]['speaker'] - 1].speaker, gpt_output.frames[x]['dialog'], gpt_output.frames[x]['emotion'], uniqueFolder, x));
        }
        const audioPaths = await Promise.all(audioPromises);
        
        const outputVideo = `${uniqueFolder}/${gpt_output.name}.mp4`;
        const transcripts = await generateTranscripts(audioPaths, gpt_output.frames.map((frame) => frame.dialog))
        const srtPath = path.join(uniqueFolder, 'subtitles.srt');
        generateSRT(transcripts, srtPath);

        const imagePaths = (await Promise.all(imagePromises));
        await createVideoFromImagesAndAudio(imagePaths, audioPaths, srtPath, outputVideo);

        const fileStream = createReadStream(outputVideo);
        const fileName = `${gpt_output.name}.mp4`;

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        fileStream.pipe(res);

        res.on('finish', () => {
            deleteFolder(uniqueFolder);
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to create storyboard",
        });
        deleteFolder(uniqueFolder);
        console.error(err);
    }
});