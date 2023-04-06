const { generateAsync } = require('stability-client');

async function GenerateFrame(prompt, speakers, theme, setting, folder) {
    try {
        let transformedPrompt = prompt;
        speakers.forEach(obj => {
            const placeholder = `{${obj.id}}`;
            transformedPrompt = transformedPrompt.replace(placeholder, obj.description);
          });
          
        const { res, images } = await generateAsync({
            prompt: `I want a picture of ${transformedPrompt} in the style of a ${theme} with a background setting of ${setting}`,
            apiKey: process.env.DREAMSTUDIO_API_KEY,
            outDir: folder
        });
        return images[0].filePath;
    } catch (e) {
        console.error(`Error creating image with prompt:${prompt}: ${e}`);
    }
}


module.exports = {
    GenerateFrame
}