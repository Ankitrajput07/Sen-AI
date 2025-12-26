document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messageArea = document.getElementById('message-area');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const modelSelectorContainer = document.getElementById('model-selector');
    const focusModeBar = document.getElementById('focus-mode-bar');
    const focusModeText = document.getElementById('focus-mode-text');
    const exitFocusModeBtn = document.getElementById('exit-focus-mode-btn');

    // API Key (WARNING: Insecure for production)
    const OPENROUTER_API_KEY = "Add Api key....";

    // AI Models
    const models = [
        { name: "DeepSeek Coder", id: "deepseek/deepseek-chat-v3-0324" },
        { name: "Qwen3", id: "qwen/qwen3-14b" },
        { name: "GPT-3.5 Turbo", id: "openai/gpt-3.5-turbo" },
        { name: "Mistral 7B", id: "mistralai/mistral-7b-instruct" },
        { name: "openai(gpt-oss)", id: "openai/gpt-oss-20b" },
        { name: "llama-3.3", id: "meta-llama/llama-3.3-70b-instruct" }
    ];

    // --- NEW: State Management for Focus Mode ---
    let conversationState = {
        isFocused: false,
        focusedModel: null, // {id, name}
        history: [], // [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
    };

    // --- INITIALIZATION ---
    populateModelSelector();
    setupEventListeners();

    // --- FUNCTIONS ---
    function populateModelSelector() {
        models.forEach(model => {
            modelSelectorContainer.innerHTML += `
                <div class="model-choice">
                    <input type="checkbox" id="${model.id}" value="${model.id}" checked>
                    <label for="${model.id}">${model.name}</label>
                </div>`;
        });
    }

    function setupEventListeners() {
        sendButton.addEventListener('click', handleSendMessage);
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        // Listen for clicks on "Continue" buttons
        messageArea.addEventListener('click', handleContinueClick);
        exitFocusModeBtn.addEventListener('click', exitFocusMode);
    }

    function handleSendMessage() {
        const promptText = promptInput.value.trim();
        if (promptText === '') return;

        const welcomeMessage = messageArea.querySelector('.welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        displayUserMessage(promptText);
        promptInput.value = '';

        if (conversationState.isFocused) {
            sendMessageToFocusedModel(promptText);
        } else {
            sendMessageToAllModels(promptText);
        }
    }

    function sendMessageToAllModels(promptText) {
        const selectedModels = Array.from(modelSelectorContainer.querySelectorAll('input:checked')).map(cb => {
            return models.find(m => m.id === cb.value);
        });

        if (selectedModels.length === 0) {
            alert("Please select at least one AI model.");
            return;
        }

        const responseContainerId = `response-${Date.now()}`;
        displayMultiAiResponseContainer(responseContainerId, selectedModels);

        selectedModels.forEach(model => {
            fetchAiResponse(promptText, model, responseContainerId, []);
        });
    }

    function sendMessageToFocusedModel(promptText) {
        conversationState.history.push({ role: 'user', content: promptText });
        const model = conversationState.focusedModel;
        
        const responseContainerId = `response-${Date.now()}`;
        displaySingleAiResponseContainer(responseContainerId, model);

        fetchAiResponse(promptText, model, responseContainerId, conversationState.history.slice(0, -1));
    }

    function displayUserMessage(text) {
        messageArea.innerHTML += `<div class="user-message"><div class="user-message-bubble">${text}</div></div>`;
        scrollToBottom();
    }

    function displayMultiAiResponseContainer(containerId, modelsToDisplay) {
        let gridHtml = modelsToDisplay.map(model => `
            <div class="ai-response-card" id="card-${model.id.replace('/', '-')}-${containerId}">
                <div class="model-name">${model.name}</div>
                <div class="model-response"><div class="loading-spinner"></div></div>
                <button class="continue-btn" data-model-id="${model.id}" data-model-name="${model.name}">Continue with this</button>
            </div>`).join('');

        messageArea.innerHTML += `<div class="ai-response-container" id="${containerId}"><div class="ai-responses-grid">${gridHtml}</div></div>`;
        scrollToBottom();
    }

    function displaySingleAiResponseContainer(containerId, model) {
        messageArea.innerHTML += `
            <div class="single-ai-response" id="card-${model.id.replace('/', '-')}-${containerId}">
                <div class="model-name">${model.name}</div>
                <div class="model-response"><div class="loading-spinner"></div></div>
            </div>`;
        scrollToBottom();
    }

    async function fetchAiResponse(promptText, model, containerId, history) {
        const card = document.getElementById(`card-${model.id.replace('/', '-')}-${containerId}`);
        const responseElement = card.querySelector('.model-response');
        
        const messages = [...history, { role: 'user', content: promptText }];

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: model.id, messages: messages })
            });

            if (!response.ok) throw new Error((await response.json()).error.message);

            const data = await response.json();
            const content = data.choices[0].message.content;
            responseElement.textContent = content;

            if (conversationState.isFocused) {
                conversationState.history.push({ role: 'assistant', content: content });
            }

        } catch (error) {
            responseElement.textContent = `Error: ${error.message}`;
            responseElement.style.color = 'red';
        }
    }

    function handleContinueClick(event) {
        if (!event.target.classList.contains('continue-btn')) return;

        const button = event.target;
        const modelId = button.dataset.modelId;
        const modelName = button.dataset.modelName;

        // Find the user prompt and AI response to start the history
        const responseCard = button.closest('.ai-response-card');
        const aiResponse = responseCard.querySelector('.model-response').textContent;

        const userPromptContainer = button.closest('.ai-response-container').previousElementSibling;
        const userPrompt = userPromptContainer.querySelector('.user-message-bubble').textContent;

        // Enter Focus Mode
        conversationState = {
            isFocused: true,
            focusedModel: { id: modelId, name: modelName },
            history: [
                { role: 'user', content: userPrompt },
                { role: 'assistant', content: aiResponse }
            ]
        };
        
        updateUiForFocusMode();
    }

    function updateUiForFocusMode() {
        modelSelectorContainer.style.display = 'none';
        focusModeBar.style.display = 'flex';
        focusModeText.textContent = `Chatting with: ${conversationState.focusedModel.name}`;
        
        // Add a highlight or message indicating focus has started
        messageArea.innerHTML += `<div class="focus-notice">--- Conversation now focused on ${conversationState.focusedModel.name} ---</div>`;
        scrollToBottom();
    }

    function exitFocusMode() {
        conversationState = { isFocused: false, focusedModel: null, history: [] };
        
        modelSelectorContainer.style.display = 'flex';
        focusModeBar.style.display = 'none';

        messageArea.innerHTML += `<div class="focus-notice">--- Focus mode ended. Now chatting with all selected models. ---</div>`;
        scrollToBottom();
    }

    function scrollToBottom() {
        messageArea.scrollTop = messageArea.scrollHeight;
    }

});
