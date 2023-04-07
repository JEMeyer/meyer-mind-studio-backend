const axios = require('axios');

async function Generate(data) {
    const response = await axios.post('http://192.168.1.99:20020/generate', data, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const secondResponse = await axios.get(`http://192.168.1.99:20020/download/${response.data.download_id}`, {
        responseType: 'arraybuffer'
    });

    const filename = secondResponse.headers['content-disposition'].split('filename=')[1].replace(/"/g, '');

    return {
        data: secondResponse.data,
        fileName: `${data.seed}_____${filename}`,
    };
}

module.exports = {
    Generate
};