document.addEventListener('DOMContentLoaded', function() {
    const tweetInput = document.getElementById('tweetInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const charCount = document.getElementById('charCount');

    // Update character count
    tweetInput.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count > 280) {
            charCount.style.color = '#e0245e'; // Red for over limit
        } else {
            charCount.style.color = count >= 260 ? '#ffad1f' : '#657786'; // Yellow when approaching limit
        }
    });

    // Analyze tweet on button click
    analyzeBtn.addEventListener('click', analyzeTweet);

    // Also trigger analysis on Enter key (with Ctrl/Cmd)
    tweetInput.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            analyzeTweet();
        }
    });
});

function analyzeTweet() {
    const tweetText = document.getElementById('tweetInput').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results
    
    if (!tweetText.trim()) {
        displayEmptyState();
        return;
    }

    // --- RULES BASED ON ANALYSIS OF features.md & local_prod.yaml (the-algorithm-ml) ---
    // Refined based on understanding of feature preprocessing (DoubleNormLog) and architecture (MaskNet backbone).
    // NOTE: Ranking depends heavily on non-textual features (history, reputation, embeddings) not analyzed here.

    // Rule: Tweet Length (tweetsource.tweet.text.length)
    const tweetLength = tweetText.length;
    displayResult(
        tweetLength > 15 && tweetLength <= 280, 
        `Tweet Length: ${tweetLength} characters`,
        tweetLength === 0 ? 'Tweet is empty.' :
        tweetLength <= 40 ? 'Very short tweets might lack context. (Feature: `text.length`)' :
        tweetLength > 280 ? 'Tweet is too long for Twitter.' :
        'Length is within standard limits. (Feature: `text.length`)'
    );

    // Rule: External Links (recap.tweetfeature.has_link, recap.tweetfeature.link_count)
    // Note: link_count likely undergoes log-transform, meaning 0 vs 1 link matters more than 2 vs 3.
    const links = tweetText.match(/https?:\/\/\S+/gi) || [];
    const linkCount = links.length;
    displayResult(
        linkCount <= 1, 
        `Links: ${linkCount} external link(s)`,
        linkCount === 0 ? 'No external links detected (Feature: `has_link`).' :
        linkCount === 1 ? 'Contains 1 link. Links can add value but *might* slightly reduce initial reach. (Feature: `link_count`).' :
        'Contains multiple links (>1). This might reduce reach or appear spammy, especially as the model uses a log-transformed count.'
    );

    // Rule: Hashtags (recap.tweetfeature.num_hashtags)
    // Note: num_hashtags undergoes log-transform. The difference between 0-1 and 1-2 is more significant to the model than 3 vs 4.
    // Importance in current ranking is uncertain.
    const hashtags = tweetText.match(/#\w+/g) || [];
    const hashtagCount = hashtags.length;
    // The isGood boolean (first arg) is now ignored by displayResult for hashtags, but we keep the logic for clarity
    displayResult(
        hashtagCount >= 0, // Pass true to avoid error, but icon/style handled by title check
        `Hashtags: ${hashtagCount} found`,
        hashtagCount === 0 ? 'No hashtags used. While their ranking impact is unclear, 1-2 relevant hashtags can aid discovery. (Feature: `num_hashtags` - log transformed)' :
        hashtagCount <= 2 ? `Uses ${hashtagCount} hashtag(s). Optimal range often cited as 1-2 for discovery, though direct ranking impact is uncertain.` :
        `Uses >2 hashtags. This may appear spammy and potentially hinder readability; impact diminishes due to log transform.`
    );

    // Rule: Mentions (recap.tweetfeature.num_mentions)
    // Note: num_mentions undergoes log-transform. Low counts (0-2) likely have clearer impact than higher counts.
    const mentions = tweetText.match(/@\w+/g) || [];
    const mentionCount = mentions.length;
    displayResult(
        mentionCount <= 2, // Tightening recommendation based on log transform
        `Mentions: ${mentionCount} found`,
        mentionCount === 0 ? 'No @mentions detected (Feature: `num_mentions` - log transformed).' :
        mentionCount <= 2 ? 'Appropriate number of mentions (1-2).' :
        'Using >2 mentions might reduce visibility or seem spammy (impact diminishes due to log transform).'
    );

    // Rule: Media Content (Proxy for many features: contains_media, has_image, has_video etc.)
    // Actual media is crucial and represented by many features. This text check is only a weak proxy.
    const mentionsMediaKeywords = /\b(image|photo|pic|picture|video|gif|media|visual)\b/i.test(tweetText);
    displayResult(
        mentionsMediaKeywords, 
        'Media Mention (Proxy)',
        mentionsMediaKeywords ? 'Keywords suggest media. Attaching actual images/videos is highly recommended (Multiple features like `contains_media`).' :
        'No media keywords found. Consider adding relevant images/videos - this is often a strong positive signal.'
    );

    // Rule: Question (tweetsource.tweet.text.has_question)
    const hasQuestion = /\?/.test(tweetText);
    displayResult(
        hasQuestion,
        'Question Asked?',
        hasQuestion ? 'Includes a question, often drives replies (Feature: `has_question`).' :
        'Consider adding a question to encourage interaction.'
    );

    // Rule: Excessive Caps (Approximation of tweetsource.tweet.text.num_caps)
    // Note: num_caps likely undergoes log-transform.
    const words = tweetText.split(/\s+/);
    const capsCount = (tweetText.match(/[A-Z]/g) || []).length;
    const allCapsWords = words.filter(word => word.length > 2 && word === word.toUpperCase()).length;
    const excessiveCaps = allCapsWords > 1 || (capsCount / (tweetLength + 1) > 0.4 && tweetLength > 20); // Adjusted heuristic
    displayResult(
        !excessiveCaps,
        'Capitalization',
        excessiveCaps ? 'Uses excessive capitalization (all-caps words or high ratio), may reduce engagement (Related feature: `num_caps` - log transformed).' :
        'Good use of capitalization.'
    );
    
    // Rule: Newlines / Formatting (Approximation of tweetsource.tweet.text.num_newlines)
    // Note: num_newlines likely undergoes log-transform.
    const newlineCount = (tweetText.match(/\n/g) || []).length;
     displayResult(
        newlineCount <= 4, // Slightly stricter
        'Formatting (Newlines)',
        newlineCount <= 4 ? `Contains ${newlineCount} newlines. Good formatting aids readability (Feature: \`num_newlines\` - log transformed).` :
        'Excessive newlines (>4) might hinder readability or seem spammy.'
    );

    // Rule: Emoji Count (Approximation inspired by emojiTokens feature)
    // Note: Actual feature might be set-based, not count-based. Log-transform likely applies if treated as count.
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
    const emojiCount = (tweetText.match(emojiRegex) || []).length;
     displayResult(
        emojiCount <= 4, // Slightly stricter
        'Emoji Usage',
        emojiCount === 0 ? 'No emojis detected. Emojis can add personality.' :
        emojiCount <= 4 ? `Uses ${emojiCount} emoji(s). Emojis can increase engagement when used appropriately.` :
        'Uses many emojis (>4). Excessive emojis might seem unprofessional or spammy.'
    );

    // Reminder about limitations
    displayGeneralDisclaimer();
}

function displayResult(isGood, title, message) {
    const resultsDiv = document.getElementById('results');
    const resultItem = document.createElement('div');
    const icon = document.createElement('span');
    icon.className = 'result-icon';
    
    // Special handling for Hashtags rule due to uncertainty
    if (title.startsWith('Hashtags:')) {
        icon.textContent = '?'; // Use question mark
        resultItem.className = 'result-item neutral'; // Apply neutral style
    } else {
        // Original logic for other rules
        icon.textContent = isGood ? '✓' : '✗';
        resultItem.className = `result-item ${isGood ? 'good' : 'bad'}`;
    }
    
    const content = document.createElement('div');
    
    const titleElem = document.createElement('strong');
    titleElem.textContent = title;
    
    const messageElem = document.createElement('p');
    messageElem.textContent = message;
    
    content.appendChild(titleElem);
    content.appendChild(messageElem);
    
    resultItem.appendChild(icon);
    resultItem.appendChild(content);
    
    resultsDiv.appendChild(resultItem);
}

function displayEmptyState() {
    const resultsDiv = document.getElementById('results');
    const emptyState = document.createElement('p');
    emptyState.textContent = 'Enter a tweet draft to analyze.';
    emptyState.style.textAlign = 'center';
    emptyState.style.color = '#657786';
    emptyState.style.padding = '20px';
    resultsDiv.appendChild(emptyState);
}

// Add a function to display the general disclaimer
function displayGeneralDisclaimer() {
    const resultsDiv = document.getElementById('results');
    const disclaimer = document.createElement('p');
    disclaimer.innerHTML = `<strong>Note:</strong> This analysis is based *only* on the text content and known features from Twitter's public algorithm documentation. It cannot assess author reputation, user relationships, real-time trends, attached media quality, or other crucial ranking factors. Use as a general guide.`;
    disclaimer.style.marginTop = '20px';
    disclaimer.style.padding = '10px';
    disclaimer.style.fontSize = '13px';
    disclaimer.style.color = '#657786';
    disclaimer.style.backgroundColor = '#e1e8ed';
    disclaimer.style.borderRadius = '5px';
    disclaimer.style.textAlign = 'center';
    resultsDiv.appendChild(disclaimer);
}