const { generateAsync } = require('stability-client');
const path = require('path');

async function GenerateFrame(prompt, characters, theme, setting, folder) {
    try {
        let transformedPrompt = prompt;
        characters.forEach(obj => {
            const placeholder = `{${obj.id}}`;
            transformedPrompt = transformedPrompt.replace(placeholder, obj.description);
        });

        const { res, images } = await generateAsync({
            prompt: `HD picture of ${transformedPrompt} in the style of ${theme}. background setting: ${setting}`,
            apiKey: process.env.DREAMSTUDIO_API_KEY,
            outDir: folder
        });
        return images[0].filePath;
    } catch (e) {
        console.error(`Error creating image: ${e}`);
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