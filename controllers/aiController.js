const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { YoutubeTranscript } = require('youtube-transcript');

// List of available free models from OpenRouter
const AVAILABLE_MODELS = [
  'microsoft/phi-4-reasoning-plus:free',
  'thudm/glm-z1-32b:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-chat:free',
  'qwen/qwen3-32b:free',
];

// Configure OpenAI client to point to OpenRouter
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.YOUR_SITE_URL,
    'X-Title': process.env.YOUR_SITE_NAME,
  },
});

// Helper function to make API calls
const callAI = async (model, messages) => {
  if (!AVAILABLE_MODELS.includes(model)) {
    throw new Error(`Invalid model. Choose from: ${AVAILABLE_MODELS.join(', ')}`);
  }
  try {
    const completion = await openrouter.chat.completions.create({
      model: model,
      messages: messages,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`Error calling AI model ${model}:`, error);
    throw new Error('Failed to get response from AI model.');
  }
};

// 1. Generate Code Endpoint
exports.generateCode = async (req, res) => {
  const { prompt, model = 'deepseek/deepseek-chat:free' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const systemPrompt = `You are an expert web developer. Generate a complete, self-contained HTML file with embedded CSS and JavaScript based on the user's prompt. The HTML, CSS, and JS should be in a single index.html file. Do not use any external libraries unless specified. Your response should ONLY be the raw code for the index.html file, starting with <!DOCTYPE html> and ending with </html>. Do not include any explanations or markdown formatting like \`\`\`html.`;

  try {
    const code = await callAI(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    const dir = path.join(__dirname, '..', 'generated_code');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(dir, 'index.html');
    fs.writeFileSync(filePath, code);

    res.download(filePath, 'index.html', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Math Reasoning Endpoint
exports.getMathReasoning = async (req, res) => {
  const { prompt, model = 'microsoft/phi-4-reasoning-plus:free' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Math problem prompt is required.' });
  }

  const systemPrompt = 'You are a math tutor. Solve the following problem and provide a clear, step-by-step reasoning for your solution. Format the final answer clearly.';

  try {
    const reasoning = await callAI(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);
    res.json({ reasoning });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Coding Task Endpoint
exports.solveCodingTask = async (req, res) => {
  const { prompt, model = 'thudm/glm-z1-32b:free' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Coding task prompt is required.' });
  }

  const systemPrompt = 'You are an expert programmer. Solve the following coding task. Provide a detailed explanation of your approach, the code solution, and an analysis of its time and space complexity. Use markdown for code blocks.';

  try {
    const solution = await callAI(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);
    res.json({ solution });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. YouTube Summarizer Endpoint
exports.summarizeYoutubeVideo = async (req, res) => {
  const { url, model = 'deepseek/deepseek-chat-v3-0324:free' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required.' });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ error: 'Could not fetch transcript for this video. It might have transcripts disabled.' });
    }

    const transcriptText = transcript.map((item) => item.text).join(' ');
    const systemPrompt = 'You are a helpful assistant. Summarize the following video transcript into a concise overview with the main key points listed as bullet points.';

    const summary = await callAI(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Transcript: ${transcriptText}` },
    ]);

    res.json({ summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to summarize YouTube video. Please ensure the URL is correct and the video has a transcript.' });
  }
};

// 5. General Chat Endpoint
exports.handleChat = async (req, res) => {
  const { prompt, model = 'qwen/qwen3-32b:free' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required for chat.' });
  }

  const systemPrompt = 'You are Anjali, a friendly and helpful AI assistant. Engage in a natural and supportive conversation.';

  try {
    const response = await callAI(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Image to Text Endpoint
exports.imageToText = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required.' });
  }

  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // Note: Not all free models support vision. Using a vision-capable model if available.
    const model = 'qwen/qwen3-32b:free'; // Qwen3 may not support vision; adjust if needed
    const response = await openrouter.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: 'Describe this image in detail.' },
          ],
        },
      ],
    });

    fs.unlinkSync(imagePath);

    res.json({ description: response.choices[0].message.content });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: 'Failed to process image.' });
  }
};

// 7. Explainer Endpoint
exports.getExplainer = async (req, res) => {
  const { topic, model = 'deepseek/deepseek-chat:free' } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const systemPrompt = `You are an expert educator who simplifies complex topics. Explain the following topic in a simple, easy-to-understand way. Include analogies and "learning hacks" to make it memorable.`;

  try {
    const explanation = await callAI(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: topic },
    ]);
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
