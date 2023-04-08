const axios = require('axios');
const { downloadFile } = require('./utilities.js');


const COQUI_SPEAKERS = [
  {
    "id": "0f82817b-eea7-4f28-8a02-5900a1b23e30",
    "name": "Damien Black"
  },
  {
    "id": "d91d2f95-1a1d-4062-bad1-f1497bb5b487",
    "name": "Gitta Nikolina"
  },
  {
    "id": "b8ffb895-79b8-4ec6-be9c-6eb2d1fbe83c",
    "name": "Claribel Dervla"
  },
  {
    "id": "f05c5b91-7540-4b26-b534-e820d43065d1",
    "name": "Ana Florence"
  },
  {
    "id": "cb4f835e-7f61-4b8c-a0f6-f059bbf6f583",
    "name": "Vjollca Johnnie"
  },
  {
    "id": "d2bd7ccb-1b65-4005-9578-32c4e02d8ddf",
    "name": "Viktor Menelaos"
  },
  {
    "id": "e399c204-7040-4f1d-bb92-5223fa6feceb",
    "name": "Baldur Sanjin"
  },
  {
    "id": "fc9917ef-8f32-418e-9254-e535c0c6df3d",
    "name": "Zacharie Aimilios"
  },
  {
    "id": "c791b5b5-0558-42b8-bb0b-602ac5efc0b9",
    "name": "Viktor Eka"
  },
  {
    "id": "d4b43fc7-6e16-4664-b9ec-97246f505d8d",
    "name": "Torcull Diarmuid"
  },
  {
    "id": "2e66d236-dba1-4741-acd6-badc008aa8af",
    "name": "Ethan Heedful"
  },
  {
    "id": "27373d4a-0b84-480d-9ce3-fc34fba415be",
    "name": "Craig Gutsy"
  },
  {
    "id": "9b1cb1b4-f4fa-48ea-af20-54c91f35bfdd",
    "name": "Brenda Stern"
  },
  {
    "id": "9145d03c-2da9-4893-8c92-ee9480e75830",
    "name": "Tammy Grit"
  },
  {
    "id": "8255e841-3b5c-48af-9089-640a2ee2c308",
    "name": "Henriette Usha"
  },
  {
    "id": "ebe2db86-62a6-49a1-907a-9a1360d4416e",
    "name": "Sofia Hellen"
  },
  {
    "id": "e1a51d31-0f2f-4532-98d4-7b73e2481d06",
    "name": "Ludvig Milivoj"
  },
  {
    "id": "ab86648c-68d3-4b03-a6dc-f4a78cf527d5",
    "name": "Kazuhiko Atallah"
  },
  {
    "id": "b479aa77-3af6-45b6-9a96-506bd867c5a2",
    "name": "Adde Michal"
  },
  {
    "id": "8ca72d29-f9ec-4df8-8ad0-de7a1c5790b0",
    "name": "Ilkin Urbano"
  },
  {
    "id": "6720d486-5d43-4d92-8893-57a1b58b334d",
    "name": "Dionisio Schuyler"
  },
  {
    "id": "b1ec84ad-c7c6-4085-b3e9-fcae55529b77",
    "name": "Abrahan Mack"
  },
  {
    "id": "ba43f07b-67bf-47a2-bce5-b1d5fa2ba1b5",
    "name": "Gilberto Mathias"
  },
  {
    "id": "b082061d-695e-4d1b-a8f9-b5c4cb8e6e2a",
    "name": "Suad Qasim"
  },
  {
    "id": "f6d81c82-1376-4dd5-9825-cd9f353cbfb9",
    "name": "Tanja Adelina"
  },
  {
    "id": "ff34248d-1fae-479b-85b6-9ae2b6043acd",
    "name": "Annmarie Nele"
  },
  {
    "id": "de21e9e3-2da0-478e-a3d8-4b042d3a3b28",
    "name": "Alison Dietlinde"
  },
  {
    "id": "e34ac3b4-0aed-4a7f-adf5-f2a2e2424694",
    "name": "Asya Anara"
  },
  {
    "id": "fd613b67-e9b8-45ae-8702-a34ff65f1b78",
    "name": "Tammie Ema"
  },
  {
    "id": "67c19643-429d-4cef-bb30-bf2a84ba1c84",
    "name": "Royston Min"
  },
  {
    "id": "b67f6eb1-c3ac-4da2-b359-47895eb93580",
    "name": "Badr Odhiambo"
  }
];

const COQUI_EMOTIONS = ['Neutral', 'Happy', 'Sad', 'Surprise', 'Angry', 'Dull']

const male_names = ["Damien Black", "Viktor Menelaos", "Baldur Sanjin", "Zacharie Aimilios", "Viktor Eka", "Torcull Diarmuid", "Ethan Heedful", "Craig Gutsy", "Ludvig Milivoj", "Kazuhiko Atallah", "Adde Michal", "Ilkin Urbano", "Dionisio Schuyler", "Abrahan Mack", "Gilberto Mathias", "Suad Qasim", "Royston Min", "Badr Odhiambo"];
const female_names = ["Gitta Nikolina", "Claribel Dervla", "Ana Florence", "Vjollca Johnnie", "Brenda Stern", "Tammy Grit", "Henriette Usha", "Sofia Hellen", "Tanja Adelina", "Annmarie Nele", "Alison Dietlinde", "Asya Anara", "Tammie Ema"];

MaleSpeakers = COQUI_SPEAKERS.filter(speaker => male_names.includes(speaker.name));
FemaleSpeakers = COQUI_SPEAKERS.filter(speaker => female_names.includes(speaker.name));

async function CreateSoundSample(voiceId, text, emotion, folder, index) {
  const local_emotion = COQUI_EMOTIONS.indexOf(emotion) > 0 ? emotion : 'Neutral'

  var options = {
    method: 'POST',
    url: 'https://app.coqui.ai/api/v2/samples',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`
    },
    data: {
      voice_id: voiceId,
      name: 'temp',
      text: text,
      emotion: local_emotion
    }
  };
  const response = await axios.request(options);
  const audio_url = response.data.audio_url

  const audioPath = `${folder}/audio-${index}.wav`;
  await downloadFile(audio_url, audioPath);
  return audioPath;
}

async function VoiceFromPrompt(speaker_prompt) {
  var options = {
    method: 'POST',
    url: 'https://app.coqui.ai/api/v2/voices/from-prompt/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.COQUI_API_KEY}`
    },
    data: {
      prompt: speaker_prompt,
      name: 'temp',
    }
  };

  const response = await axios.request(options);

  console.log(response.data);
  return response.data.id;
};

module.exports = {
  MaleSpeakers,
  FemaleSpeakers,
  CreateSoundSample,
  VoiceFromPrompt
};