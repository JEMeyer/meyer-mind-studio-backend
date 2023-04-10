import { ChatCompletionRequestMessage } from "openai";
import { OpenAIAPIError } from "./exceptions";
import { validlateMainPrompt } from "./gptValidator";
import { callGPT } from "./openai";
import { PrimaryStoryboardResponse } from "./types";

const response_prompt1 = `{
    name: 'Jenga Battle',
    setting: 'luxurious living room with a Jenga set on the coffee table',
    theme: 'Modern, sleek and dark, focus, contrasting colors.',
    speakers: [
      {
        id: 1,
        visual_description: 'Donald Trump, with a blue suit, red tie',
        voice_description: 'An older male with a brash, New York accent and a deep, gravelly voice.'
      },
      {
        id: 2,
        visual_description: 'Snoop Dogg, with gold chains, sunglasses',
        voice_description: 'A middle-aged african-american male with a laid-back, West Coast drawl and a smooth, mellow voice.'
      }
    ],
    frames: [
      {
        speakerId: 1,
        dialog: "Oops, looks like I slipped. Don't worry, I'll fix it.",
        emotion: 'Happy',
        visual_description: '{1} adjusting a Jenga block, trying to prevent it from falling, while {2} looks on in suspicion.'
      },
      {
        speakerId: 2,
        dialog: 'Come on, man. We playing fair or what?',
        emotion: 'Angry',
        visual_description: '{2} reaching for a block that was moved out of place.'
      },
      {
        speakerId: 1,
        dialog: "Hey, calm down. It's just a game.",
        emotion: 'Neutral',
        visual_description: "{1} standing up from his chair to show the Jenga tower."
      },
      {
        speakerId: 2,
        dialog: "I see what you're doing, and it ain't cool. Nobody cheats on my watch.",
        emotion: 'Dull',
        visual_description: '{2} confronting {1} face-to-face, pushing the table to the side.'
      },
      {
        speakerId: 1,
        dialog: 'Relax, Snoop. Just having a little fun.',
        emotion: 'Surprise',
        visual_description: "{1} grining slyly and straighten=ing his tie, {2} looks mad."
      },
      {
        speakerId: 2,
        dialog: "This ain't 'Little Fun', homie. It's Jenga!",
        emotion: 'Sad',
        visual_description: '{2} grabbing a block from the middle of the wobbly tower, as {1} flinches.'
      }
    ]
  }`;
const storyboard_prompt = `You are a storyboard creator. You create a movie scene with a name, setting, theme, speakers, and 6-12 frames. Return a JSON object with: a name (1-4 words), setting_description (5-15 words describing what is in the background for all frames, such as the town or building they are in), theme_visuals (5-15 words describing an artistic style or painter, be verbose, similar to the sample JSON provided later), speakers (mapping a speakerId, a visual_description of the speaker (5-10 words, avoid using 'kids', 'boy', or 'girl' for content filter reasons)), and a voice_description of the speakers voice (use singlar case (eg 'student' and not 'students'), for the description of the voice, be sure to include the gender of the speaker. Do not include any curly braces in the dialog)). You also return an array of frames. Each frame must include speakerId of the person speaking, brief R-rated dialog (THIS FIELD IS REQUIRED, must be at least 1 word but no more than 50 (hard limit at 250 characters) and do not include any curly braces in the dialog), emotion (pick from ['Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull'], any other  value is invalid), and a visual_description of the visuals in the frame (only include words relevant to paint the frame and use present participle form, reference the speaker numbers as characters so I know which characters to draw in the scene. If there are any characters that should be drawn in the image, mark them with {}, so if you want to say that "character 1 looks at character 2", put in "{1} looks at {2}". If you add a character to be drawn in a frame, the speaker is almost always one of the drawn characters. Only include a maximum of 2 speaker references per visual_description). Combined descriptions (theme_visuals, setting_description, frame.visual_description (with speaker.visual_description substitutions eg "{1} stands up" becomes "speaker1.visual_description stands up" but with the actual substitution done)) over 65 words. Using the prompt, create information to properly describe a full movie recap, and use this as the basis for the dialog. The combined length of each frame's frame_desc (including substituting {1} for character 1's visual_description), the setting, and the theme should be less than 70 words. Here is an example of the JSON I expect back:${response_prompt1}\nI will process your response through a JSON.decode(), so only reply with valid JSON in the form provided. Prompt:`;

export async function GenerateStoryboard(prompt: string) {
    let retries = 1;
    let clarifications = 3;

    while (retries > 0) {
        try {
            let response =
                (await callGPT(`${storyboard_prompt}"""${prompt.trim()}"""`)) || '';
            let parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;
            let errors = validlateMainPrompt(parsedObject);

            // Retry once
            if (errors.length > 0) {
                while (clarifications > 0) {
                    console.error('Failed validation:', errors.join(', '))
                    const correctingPrompt =
                        `I have a JSON object with some constraints I'd like you to help me resolve. I would like you to return to me a modified JSON object, based on the following feedback: ${errors.join('\n')} Do not modify any fields not mentioned in the feedback provided. The JSON object should be identical, but with modifications to avoid thet issues specified. Only reply with the JSON object, as I will do a JSON.decode() to parse the message and expect only that object. The JSON object is: """${response}"""`;

                    response =
                        (await callGPT(correctingPrompt)) || '';
                    parsedObject = JSON.parse(response) as PrimaryStoryboardResponse;
                    errors = validlateMainPrompt(parsedObject);

                    if (errors.length === 0) {
                        return parsedObject
                    }
                    clarifications--;
                }
                throw new SyntaxError("Max clarifications reached.");
            }
            // If parsing is successful, it will return the parsed data and exit the loop
            return parsedObject;
        } catch (error) {
            if (error instanceof SyntaxError) {
                retries--; // Decrement the retry counter if a SyntaxError is thrown
                console.error(`Syntax error: ${error}, retries left:${retries}`);
                if (retries < 0) {
                    console.error('Out of retries');
                    throw new OpenAIAPIError();
                }
            } else {
                // If the error is not a SyntaxError, throw it immediately
                throw new OpenAIAPIError();
            }
        }
    }
    throw new OpenAIAPIError();
}

const image_prompt =
    'Given a basic prompt, upscale it into a visually engaging description for an image generation model, focusing on key elements and impactful details while avoiding excessive verbosity. The description should be concise yet impressive, capturing the essence of the scene. Limit your response to a maximum of 50 words. Here is the prompt:';
export async function GenerateImagePrompt(prompt: string) {
    const response = await callGPT(image_prompt + prompt.trim());
    console.log(response);
    return response;
}