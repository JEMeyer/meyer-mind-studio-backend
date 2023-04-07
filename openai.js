const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let storyboard_prompt = `Create a movie scene with a name, setting, theme, speakers, and 6-12 frames. Return a JSON object with a name (1-3 words), setting (brief description of what is in the background for all frames, such as the town or building they are in), theme (artistic style or painter, be verbose, similar to the sample JSON provided later), speakers (mapping a speaker number, a visual description of the speaker, and a description of the speakers voice (for the description of the voice, be sure to include the gender of the speaker, as shown in the example)), and an array of frames. Each frame must include speaker number, brief R-rated dialog (THIS FIELD IS REQUIRED, must be between 1-150 characters in length), emotion (only allowed values: 'Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull'), and a description of the action in the frame (reference the speaker numbers as characters so I know which characters to draw in the scene. Be sure to always include at least 1 character, and mark the  characters with {}, so if you want to say that "character 1 looks at character 2", put in "{1} looks at {2}"). Using the prompt, create information to properly describe a full movie recap, and use this as the basis for the dialog. Example:
{
    name: "Bozos Wawawawa",
    setting: 'Inside a circus tent during a performance',
    theme: 'Bright and colorful, reminiscent of vintage circus posters with bold typography and exaggerated illustrations',
    speakers: [
      {
        id: 1,
        description: 'Bozo the clown, with a red nose, curly blue hair, and oversized shoes'
        voice_prompt: 'An older male with a British accent and a pleasing, deep voice'
      },
      {
        id: 2,
        description: 'An exasperated ringmaster, wearing a top hat and a red coat with gold trim'
        voice_prompt: 'An tennager female with a American accent and a shrill voice.'
      }
    ],
    frames: [
      {
        speaker: 1,
        dialog: 'Wawawawa!',
        emotion: 'Happy',
        frame_desc: "{1} jumps up and down, waving his arms and shouting 'wawawawa' as the audience cheers"
      },
      {
        speaker: 2,
        dialog: 'Bozo, please stop that!',
        emotion: 'Angry',
        frame_desc: '{2} walks up to {1} and scolds him, wagging a finger as the crowd grows quiet'
      },
      {
        speaker: 1,
        dialog: 'Wawawawa?',
        emotion: 'Surprise',
        frame_desc: '{1} looks up at {2} with a puzzled expression, as a spotlight illuminates them both'
      },
      {
        speaker: 2,
        dialog: "Yes, that sound! It's driving everyone crazy!",
        emotion: 'Angry',
        frame_desc: '{2} gestures to the crowd, who are covering their ears and shaking their heads'
      },
      {
        speaker: 1,
        dialog: 'Wawawawa!',
        emotion: 'Dull',
        frame_desc: "{1} grins mischievously and starts hopping on one foot, still saying 'wawawawa'"
      },
      {
        speaker: 2,
        dialog: "That's it, Bozo! You're fired!",
        emotion: 'Angry',
        frame_desc: '{2} points a finger at {1} and storms offstage, as the audience boos and hisses'
      }
    ]
  }
ONLY return the valid JSON object, passing anything other than a valid JSON object will kill the application. It must be valid JSON.`;

async function GenerateStoryboard(prompt) {
  let retries = 3;

  while (retries > 0) {
    try {
      const response = await callGPT(storyboard_prompt + `"""${prompt.trim()}"""`);
      
      // If parsing is successful, it will return the parsed data and exit the loop
      return JSON.parse(response);
    } catch (error) {
      if (error instanceof SyntaxError) {
        retries--; // Decrement the retry counter if a SyntaxError is thrown
        if (retries === 0) {
          console.error('Failed openAI request ', error)
          throw new Error('All retries failed due to JSON parsing error');
        }
      } else {
        // If the error is not a SyntaxError, throw it immediately
        throw error;
      }
    }
  }
}

const image_prompt = "Given a basic prompt, upscale it into a visually engaging description for an image generation model, focusing on key elements and impactful details while avoiding excessive verbosity. The description should be concise yet impressive, capturing the essence of the scene. Limit your response to a maximum of 50 words. Here's the basic prompt:";
async function GenerateImagePrompt(prompt) {
  const response = await callGPT(image_prompt + `"""${prompt.trim()}"""`);
  console.log(response);
  return response;
}

async function callGPT(prompt) {
  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt}],
  });

  return res.data.choices[0].message.content
}

async function DallEGenerate(prompt, theme) {
    const daleeResponse =  await openai.createImage({
        prompt: `I want a picture of ${prompt} in the style of a ${theme}.`,
        size: "256x256",
    });
    return daleeResponse.data.data[0].url;
}

module.exports = {
    GenerateStoryboard,
    DallEGenerate,
    GenerateImagePrompt
  };