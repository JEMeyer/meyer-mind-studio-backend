const { generateAsync } = require('stability-client');
const path = require('path');
const fs = require('fs')

async function GenerateFrame(prompt, characters, theme, setting, folder) {
    try {
        let transformedPrompt = prompt;
        characters.forEach(obj => {
            const placeholder = `{${obj.id}}`;
            transformedPrompt = transformedPrompt.replace(placeholder, obj.description);
        });

        const { res, images } = await generateAsync({
            prompt: `I want an HD picture of ${transformedPrompt} in the style of a ${theme} with a background setting of ${setting}`,
            apiKey: process.env.DREAMSTUDIO_API_KEY,
            outDir: folder
        });
        return images[0].filePath;
    } catch (e) {
        console.error(`Error creating image with prompt:${prompt}: ${e}`);
        throw e;
    }
}

async function Generate(data) {
    try {
        const { res, images } = await generateAsync({
            prompt: data.prompt,
            apiKey: process.env.DREAMSTUDIO_API_KEY,
            seed: [data.seed],
            steps: data.steps,
            cfgScale: data.scale,
            noStore: true
        });

        const fileNameData = `${data.seed}_____${path.basename(images[0].filePath)}`;

        return {
            data: images[0].buffer,
            fileName: fileNameData,
        };
    } catch (e) {
        console.error(`Error creating image with prompt:${data.prompt}: ${e}`);
        throw e;
    }
}

module.exports = {
    Generate,
    GenerateFrame
}