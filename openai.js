const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let seed_prompt = `Give back a basic overview of a scene based on the prompt in the\n
form of a scene in a movie. Determine the dialog characters would say (avoid adding added noises like grunts), and think of what image would\n
go well with the dialog in each frame. Produce a brief description of each frame, such as "man shouting with a gun in his hand". Return a\n
single JSON object, which I will describe in text, and also in a skeleton form of the object. There should be a name for the scene at the root, only 1-3 words, that describes the scene. The object should contain an array of objects, with each\n
object containing speaker number, the dialog (make the dialog R movie rated, using swear words when it adds to the emotion of the scene), an emotion to say the dialog line (the ONLY value you can use for emotion are 'Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull') and a short description of the frame (ensure nothing in the description is against openai content policy).\n
There should also be a 'theme' defined at the root of the object which should be applied to all images in order to provide a cohesive feel. There should also be a 'speakers' array to map a gender onto the speakers (only allowed genders are male and female) - the array should\n
be the same length as the number of speakers, so if there are three speakers, I would expect an array of length 3 for 'speakers'). There should be at least 6 frames, but you can make up to 12 if there is a lot of dialog. The theme\n
should be a description of the art frame style, that if given to a text to image generator, will provide multiple photos that look like they belong in the same series. Also ensure that the theme  prompt plus frame description won't be seen as being against the content policy of OpenAI. The theme should be specific artistic styles, painters, or drawing styles - be  specific. A basic example of\n
the the object is {name: "cowboy showdown", theme: "a van gogh painting of humanoid robot cowboys in the town square", speakers: ['male', 'female'] frames: [{speaker: 1, dialog: "this town ain't\n
big enough for the both of us", emotion: 'Angry', frame_desc: "cowboy staring down the road, gun at hip"},{speaker: 2, dialog: "only one way for us to find out who is top dog",\n
emotion: 'Surprise', frame_desc: "man with gun drawn and smoke coming from the barrel"}]}. I want your response to ONLY be the JSON object described so I can use a JSON decoder\n
 to interpret it. Nothing should be returned other than the JSON object. I will now give you a sample prompt:`;

let second_prompt = `Create a movie scene with a name, theme, speakers, and 6-12 frames. Return a JSON object with a name (1-3 words), theme (artistic style or painter, be verbose, similar to the sample JSON provided later), speakers (mapping genders), and an array of frames. Each frame includes speaker number, R-rated dialog (enough so a speaker talks for at least 2 seconds - make sure each frame has dialog), emotion ('Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull'), and a description of the action in the frame (describe the characters with unique visual detail, and make the details consistent for the same characters between frames). Using the prompt, create information to properly describe a full movie recap, and use this as the basis for the dialog. Example: {name: "cowboy showdown", theme: "4k high quality movie-production, movie storyboard cyberpunk city life, bladerunner style!! forest, vivid, photorealistic, magical, fantasy, 8K UHD, photography", speakers: ['male', 'female'], frames: [{speaker: 1, dialog: "this town ain't big enough", emotion: 'Angry', frame_desc: "cowboy with gun at hip"}, {speaker: 2, dialog: "only one way to find out", emotion: 'Surprise', frame_desc: "man with gun drawn"}]}. Only return the JSON object, as I will deserialize it based on the schema I provided to you.`;

let third_prompt = `Create a movie scene with a name, setting, theme, speakers, and 6-12 frames. Return a JSON object with a name (1-3 words), setting (brief description of what is in the background for all frames, such as the town or building they are in), theme (artistic style or painter, be verbose, similar to the sample JSON provided later), speakers (mapping speaker number to gender and a visual description of the speaker), and an array of frames. Each frame must include speaker number, brief R-rated dialog (THIS FIELD IS REQUIRED, must be between 1-150 characters in length), emotion (only allowed values: 'Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull'), and a description of the action in the frame (reference the speaker numbers as characters so I know which characters to draw in the scene. Be sure to always include at least 1 character, and mark the  characters with {}, so if you want to say that "character 1 looks at character 2", put in "{1} looks at {2}"). Using the prompt, create information to properly describe a full movie recap, and use this as the basis for the dialog. Example:
{
    name: "Bozos Wawawawa",
    setting: 'Inside a circus tent during a performance',
    theme: 'Bright and colorful, reminiscent of vintage circus posters with bold typography and exaggerated illustrations',
    speakers: [
      {
        id: 1,
        gender: 'male',
        description: 'Bozo the clown, with a red nose, curly blue hair, and oversized shoes'
      },
      {
        id: 2,
        gender: 'female',
        description: 'An exasperated ringmaster, wearing a top hat and a red coat with gold trim'
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
        emotion: 'Confused',
        frame_desc: '{1} looks up at {2} with a puzzled expression, as a spotlight illuminates them both'
      },
      {
        speaker: 2,
        dialog: "Yes, that sound! It's driving everyone crazy!",
        emotion: 'Annoyed',
        frame_desc: '{2} gestures to the crowd, who are covering their ears and shaking their heads'
      },
      {
        speaker: 1,
        dialog: 'Wawawawa!',
        emotion: 'Defiant',
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
      const gptResponse = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: third_prompt + `"""${prompt.trim()}"""` }],
      });

      // If parsing is successful, it will return the parsed data and exit the loop
      return JSON.parse(gptResponse.data.choices[0].message.content);
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

async function GenerateFrame(prompt, theme) {
    const daleeResponse =  await openai.createImage({
        prompt: `I want a picture of ${prompt} in the style of a ${theme}.`,
        size: "256x256",
    });
    return daleeResponse.data.data[0].url;
}

module.exports = {
    GenerateStoryboard,
    GenerateFrame
  };