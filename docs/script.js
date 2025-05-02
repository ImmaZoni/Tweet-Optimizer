document.addEventListener('DOMContentLoaded', function() {
    const tweetInput = document.getElementById('tweetInput');
    const charCount = document.getElementById('charCount');
    const resultsDiv = document.getElementById('results');

    // Set up debounce function for analysis
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Update character count and trigger analysis when user types
    tweetInput.addEventListener('input', function() {
        // Update character count
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count > 280) {
            charCount.style.color = 'var(--danger)';
        } else if (count >= 260) {
            charCount.style.color = 'var(--warning)';
        } else {
            charCount.style.color = 'var(--gray)';
        }

        // If user is typing, show loading indicator
        if (count > 0) {
            showLoadingIndicator();
            debouncedAnalyze();
        } else {
            // If input is empty, show empty state
            showEmptyState();
        }
    });

    // Debounce the analysis to prevent excessive processing while typing
    const debouncedAnalyze = debounce(analyzeTweet, 500);

    // Initialize with empty state
    showEmptyState();

    // Auto-focus the textarea on page load
    tweetInput.focus();
});

function showLoadingIndicator() {
    const resultsDiv = document.getElementById('results');
    
    // If loading indicator already exists, don't create a new one
    if (document.querySelector('.typing-indicator')) return;
    
    resultsDiv.innerHTML = '';
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        loadingIndicator.appendChild(dot);
    }
    
    resultsDiv.appendChild(loadingIndicator);
}

function showEmptyState() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="empty-state">
            <i class="far fa-edit"></i>
            <p>Start typing to see real-time analysis</p>
        </div>
    `;
}

function analyzeTweet() {
    const tweetText = document.getElementById('tweetInput').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results
    
    if (!tweetText.trim()) {
        showEmptyState();
        return;
    }

    // Create arrays to store results by type
    const badResults = [];
    const goodResults = [];
    const neutralResults = [];

    // --- RULES BASED ON ANALYSIS OF features.md & local_prod.yaml (the-algorithm-ml) ---
    // Refined based on understanding of feature preprocessing (DoubleNormLog) and architecture (MaskNet backbone).
    // NOTE: Ranking depends heavily on non-textual features (history, reputation, embeddings) not analyzed here.

    // Rule: Tweet Length (tweetsource.tweet.text.length)
    const tweetLength = tweetText.length;
    collectResult(
        tweetLength > 15 && tweetLength <= 280, 
        `Tweet Length: ${tweetLength} characters`,
        tweetLength === 0 ? 'Tweet is empty.' :
        tweetLength <= 40 ? 'Very short tweets might lack context. (Feature: `text.length`)' :
        tweetLength > 280 ? 'Tweet is too long for Twitter.' :
        'Length is within standard limits. (Feature: `text.length`)',
        goodResults,
        badResults
    );

    // Rule: External Links (recap.tweetfeature.has_link, recap.tweetfeature.link_count)
    // Note: link_count likely undergoes log-transform, meaning 0 vs 1 link matters more than 2 vs 3.
    const links = tweetText.match(/https?:\/\/\S+/gi) || [];
    const linkCount = links.length;
    collectResult(
        linkCount <= 1, 
        `Links: ${linkCount} external link(s)`,
        linkCount === 0 ? 'No external links detected (Feature: `has_link`).' :
        linkCount === 1 ? 'Contains 1 link. Links can add value but *might* slightly reduce initial reach. (Feature: `link_count`).' :
        'Contains multiple links (>1). This might reduce reach or appear spammy, especially as the model uses a log-transformed count.',
        goodResults,
        badResults
    );

    // Rule: Hashtags (recap.tweetfeature.num_hashtags)
    // Note: num_hashtags undergoes log-transform. The difference between 0-1 and 1-2 is more significant to the model than 3 vs 4.
    // Importance in current ranking is uncertain.
    const hashtags = tweetText.match(/#\w+/g) || [];
    const hashtagCount = hashtags.length;
    
    // Hashtags are considered neutral
    neutralResults.push({
        title: `Hashtags: ${hashtagCount} found`,
        message: hashtagCount === 0 ? 'No hashtags used. While their ranking impact is unclear, 1-2 relevant hashtags can aid discovery. (Feature: `num_hashtags` - log transformed)' :
        hashtagCount <= 2 ? `Uses ${hashtagCount} hashtag(s). Optimal range often cited as 1-2 for discovery, though direct ranking impact is uncertain.` :
        `Uses >2 hashtags. This may appear spammy and potentially hinder readability; impact diminishes due to log transform.`
    });

    // Rule: Mentions (recap.tweetfeature.num_mentions)
    // Note: num_mentions undergoes log-transform. Low counts (0-2) likely have clearer impact than higher counts.
    const mentions = tweetText.match(/@\w+/g) || [];
    const mentionCount = mentions.length;
    collectResult(
        mentionCount <= 2, // Tightening recommendation based on log transform
        `Mentions: ${mentionCount} found`,
        mentionCount === 0 ? 'No @mentions detected (Feature: `num_mentions` - log transformed).' :
        mentionCount <= 2 ? 'Appropriate number of mentions (1-2).' :
        'Using >2 mentions might reduce visibility or seem spammy (impact diminishes due to log transform).',
        goodResults,
        badResults
    );

    // Rule: Media Content (Proxy for many features: contains_media, has_image, has_video etc.)
    // Actual media is crucial and represented by many features. This text check is only a weak proxy.
    const mentionsMediaKeywords = /\b(image|photo|pic|picture|video|gif|media|visual)\b/i.test(tweetText);
    collectResult(
        mentionsMediaKeywords, 
        'Media Mention (Proxy)',
        mentionsMediaKeywords ? 'Keywords suggest media. Attaching actual images/videos is highly recommended (Multiple features like `contains_media`).' :
        'No media keywords found. Consider adding relevant images/videos - this is often a strong positive signal.',
        goodResults,
        badResults
    );

    // Rule: Question (tweetsource.tweet.text.has_question)
    const hasQuestion = /\?/.test(tweetText);
    collectResult(
        hasQuestion,
        'Question Asked?',
        hasQuestion ? 'Includes a question, often drives replies (Feature: `has_question`).' :
        'Consider adding a question to encourage interaction.',
        goodResults,
        badResults
    );

    // Rule: Excessive Caps (Approximation of tweetsource.tweet.text.num_caps)
    // Note: num_caps likely undergoes log-transform.
    const words = tweetText.split(/\s+/);
    const capsCount = (tweetText.match(/[A-Z]/g) || []).length;
    const allCapsWords = words.filter(word => word.length > 2 && word === word.toUpperCase()).length;
    const excessiveCaps = allCapsWords > 1 || (capsCount / (tweetLength + 1) > 0.4 && tweetLength > 20); // Adjusted heuristic
    collectResult(
        !excessiveCaps,
        'Capitalization',
        excessiveCaps ? 'Uses excessive capitalization (all-caps words or high ratio), may reduce engagement (Related feature: `num_caps` - log transformed).' :
        'Good use of capitalization.',
        goodResults,
        badResults
    );
    
    // Rule: Newlines / Formatting (Approximation of tweetsource.tweet.text.num_newlines)
    // Note: num_newlines likely undergoes log-transform.
    const newlineCount = (tweetText.match(/\n/g) || []).length;
    collectResult(
        newlineCount <= 4, // Slightly stricter
        'Formatting (Newlines)',
        newlineCount <= 4 ? `Contains ${newlineCount} newlines. Good formatting aids readability (Feature: \`num_newlines\` - log transformed).` :
        'Excessive newlines (>4) might hinder readability or seem spammy.',
        goodResults,
        badResults
    );

    // Rule: Emoji Count (Approximation inspired by emojiTokens feature)
    // Note: Actual feature might be set-based, not count-based. Log-transform likely applies if treated as count.
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
    const emojiCount = (tweetText.match(emojiRegex) || []).length;
    collectResult(
        emojiCount <= 4, // Slightly stricter
        'Emoji Usage',
        emojiCount === 0 ? 'No emojis detected. Emojis can add personality.' :
        emojiCount <= 4 ? `Uses ${emojiCount} emoji(s). Emojis can increase engagement when used appropriately.` :
        'Uses many emojis (>4). Excessive emojis might seem unprofessional or spammy.',
        goodResults,
        badResults
    );

    // Display results in the specified order: bad (X) first, good (✓) second, neutral (?) last
    
    // Add a section header for issues if there are any
    if (badResults.length > 0) {
        const issuesHeader = document.createElement('h3');
        issuesHeader.className = 'results-category-header';
        issuesHeader.innerHTML = '<i class="fas fa-exclamation-circle"></i> Issues to Address';
        resultsDiv.appendChild(issuesHeader);
        
        // Display all bad results
        badResults.forEach(result => {
            displayResult(false, result.title, result.message);
        });
    }
    
    // Add a section header for good items if there are any
    if (goodResults.length > 0) {
        const goodHeader = document.createElement('h3');
        goodHeader.className = 'results-category-header';
        goodHeader.innerHTML = '<i class="fas fa-check-circle"></i> Positive Signals';
        resultsDiv.appendChild(goodHeader);
        
        // Display all good results
        goodResults.forEach(result => {
            displayResult(true, result.title, result.message);
        });
    }
    
    // Add a section header for neutral items if there are any
    if (neutralResults.length > 0) {
        const neutralHeader = document.createElement('h3');
        neutralHeader.className = 'results-category-header';
        neutralHeader.innerHTML = '<i class="fas fa-question-circle"></i> Uncertain Impact';
        resultsDiv.appendChild(neutralHeader);
        
        // Display all neutral results
        neutralResults.forEach(result => {
            // Using title.startsWith is no longer needed as we explicitly track neutral items
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item neutral';
            resultItem.innerHTML = `
                <span class="result-icon">?</span>
                <div>
                    <strong>${result.title}</strong>
                    <p>${result.message}</p>
                </div>
            `;
            resultsDiv.appendChild(resultItem);
        });
    }

    // Add a small disclaimer at the bottom as a footer
    addCompactDisclaimer();
}

// Helper function to collect results by type
function collectResult(isGood, title, message, goodArray, badArray) {
    const result = { title, message };
    
    if (isGood) {
        goodArray.push(result);
    } else {
        badArray.push(result);
    }
}

function displayResult(isGood, title, message) {
    const resultsDiv = document.getElementById('results');
    const resultItem = document.createElement('div');
    
    resultItem.className = `result-item ${isGood ? 'good' : 'bad'}`;
    resultItem.innerHTML = `
        <span class="result-icon">${isGood ? '✓' : '✗'}</span>
        <div>
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
    `;
    
    resultsDiv.appendChild(resultItem);
}

// A more compact disclaimer to save space
function addCompactDisclaimer() {
    const resultsDiv = document.getElementById('results');
    const disclaimer = document.createElement('p');
    disclaimer.innerHTML = `<small>Analysis based only on text content. Cannot assess user reputation, relationships, media quality, or other ranking factors.</small>`;
    disclaimer.style.marginTop = '15px';
    disclaimer.style.color = 'var(--gray)';
    disclaimer.style.fontSize = '12px';
    disclaimer.style.textAlign = 'center';
    resultsDiv.appendChild(disclaimer);
}