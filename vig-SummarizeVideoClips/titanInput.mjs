const titanInput = (customPrompt) => {
    const bodyInput = {
        inputText: customPrompt,
        textGenerationConfig: {
            maxTokenCount: 8000,
            stopSequences: [],
            temperature: 0,
            topP: 1,
        },
    };
    const input = {
        "modelId": "amazon.titan-text-express-v1",
        "contentType": "application/json",
        "accept": "application/json",
        "body": JSON.stringify(bodyInput),
    };
    return input;
};

export { titanInput };

/*{
    'inputTextTokenCount': int,
    'results': [{
        'tokenCount': int,
        'outputText': '\n<response>\n',
        'completionReason': string
    }]
}*/