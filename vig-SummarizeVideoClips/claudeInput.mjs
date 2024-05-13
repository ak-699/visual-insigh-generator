const claudeInput = (customPrompt) => {
  const bodyInput = {
    prompt: `\n\nHuman:${customPrompt}\n\nAssistant:`,
    max_tokens_to_sample: 10000,
    temperature: 0.5,
    top_k: 250,
    top_p: 1,
    stop_sequences: ["\n\nHuman:"],
    anthropic_version: "bedrock-2023-05-31",
  }

  const input = {
    "modelId": "anthropic.claude-v2:1",
    "contentType": "application/json",
    "accept": "*/*",
    "body": JSON.stringify(bodyInput),
  }
  return input
}

export { claudeInput };
//completion