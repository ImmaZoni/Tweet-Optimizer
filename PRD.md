**Product Requirements Document: Tweet Optimizer**

**1. Introduction**

This document outlines the requirements for the "Tweet Optimizer," a simple web-based tool designed to help users improve their tweet drafts. The tool will analyze user-provided tweet text against a set of rules derived from the publicly available Twitter algorithm source code (`github.com/twitter/the-algorithm`). The goal is to provide actionable feedback, highlighting aspects of the tweet that might positively or negatively impact its potential visibility or engagement based on inferred algorithmic behavior. This tool aims to demystify parts of the algorithm and empower users to craft more effective tweets.

**2. Goals**

*   **User Goal:** Provide users with simple, clear, and actionable feedback on their tweet drafts to help them optimize content for potentially better performance (engagement, visibility) on Twitter.
*   **Project Goal (MVP):** Launch a functional client-side web application that implements a core set of optimization checks based on verifiable insights derived from analyzing the public Twitter algorithm code.
*   **Technical Goal:** Successfully interpret relevant sections of the Twitter algorithm's Scala codebase to extract meaningful, generalizable rules applicable to tweet composition.

**3. Target Audience**

*   Social Media Managers
*   Marketing Professionals
*   Content Creators
*   Individuals seeking to improve their tweet engagement and reach.

**4. Requirements & Features**

**4.1. Core Functionality (MVP)**

*   **Tweet Input:**
    *   FE-1: Provide a text area (`<textarea>`) where users can paste or type their draft tweet.
    *   FE-2: Include a button ("Analyze Tweet" or similar) to trigger the analysis process.
*   **Analysis Engine (Client-Side JavaScript):**
    *   AE-1: Implement JavaScript functions to parse the input tweet text.
    *   AE-2: Implement a set of predefined rules based on **offline analysis** of the `twitter/the-algorithm` Scala source code. *(See Section 6: Technical Considerations for the rule derivation process)*.
    *   AE-3: Each rule check should evaluate the tweet text against a specific criterion (e.g., presence of a link, number of hashtags).
*   **Feedback Display:**
    *   FD-1: Display the analysis results clearly below the input area.
    *   FD-2: For each rule checked, display:
        *   A clear visual indicator:
            *   Checkmark (✓) or similar for "good" / adherence to a positive factor.
            *   Cross (X) or similar for "bad" / presence of a potentially negative factor.
        *   A concise description of the rule being checked (e.g., "Contains an external link," "Uses N hashtags").
    *   FD-3: Results should update each time the analysis is triggered.

**4.2. Potential Rules for Investigation (To be verified by code analysis)**

*(This list is speculative and MUST be confirmed/refined by analyzing the Scala code. The actual implementation depends entirely on what can be reasonably inferred from the public repository).*

*   **Link Presence:** Detect if `http://` or `https://` exists. (Hypothesis: External links might be de-prioritized).
*   **Media Mention:** Detect keywords suggesting media (image, pic, video, gif). (Note: Cannot reliably detect *attached* media from text alone, this is a proxy).
*   **Hashtag Count:** Count the number of `#` symbols. (Hypothesis: Optimal range exists, e.g., 1-3).
*   **Question Format:** Detect the presence of a question mark `?`. (Hypothesis: Questions encourage engagement).
*   **Mention Count:** Count the number of `@` symbols. (Hypothesis: May influence reach or notifications).
*   **Negative Keywords:** Check for presence on a list of potentially sensitive or spammy words (This requires careful definition and may be hard to infer accurately).
*   **Tweet Length:** Check character count. (While Twitter enforces limits, specific lengths might perform better).
*   **Use of Retweet/Quote Tweet:** Analyze if the text suggests a manual RT or QT format (less relevant if using native features, but could be analyzed).

**5. Design & User Experience (UX)**

*   **Simplicity:** The interface should be minimal and intuitive. Focus on the core workflow: paste -> analyze -> review feedback.
*   **Clarity:** Feedback must be easy to understand at a glance (visual indicators) with brief explanations.
*   **Responsiveness:** Basic responsiveness for usability on different screen sizes (desktop primarily for MVP).
*   **Technology:** Static HTML, CSS, and Vanilla JavaScript (or a lightweight framework if preferred). No backend required for MVP.

**6. Technical Considerations & Challenges**

*   **Algorithm Code Analysis (CRITICAL):**
    *   The primary challenge is analyzing and interpreting the `twitter/the-algorithm` repository, which is written mainly in **Scala**.
    *   This requires **manual effort** by someone proficient in Scala and potentially familiar with ML concepts and distributed systems.
    *   **The JavaScript application will NOT parse Scala code directly.** It will implement rules *derived* from the findings of the manual Scala code analysis.
    *   Focus must be on identifying code sections related to tweet feature extraction and ranking logic.
*   **Rule Accuracy & Generalization:** The public algorithm is complex and contextual. Rules derived will be simplifications and generalizations. The public code might not represent the *entire* production algorithm or the latest version.
*   **Limitations:** The tool can only analyze the *text* of the tweet. It cannot assess attached media, user reputation, audience targeting, real-time trends, or A/B test experiment effects that influence actual tweet performance. This limitation should be acknowledged.
*   **Maintenance:** The Twitter algorithm changes. Rules derived from the current public code may become outdated.

**7. Release Criteria (MVP)**

*   Functional tweet input text area and analysis trigger button.
*   Client-side analysis engine implementing at least **3-5 distinct rules** that have been reasonably **verified** through analysis of the public Scala code.
*   Clear display of results using Checkmark/Cross indicators and descriptive text for each implemented rule.
*   Basic, clean UI rendering correctly on modern desktop browsers.
*   Disclaimer stating the tool is based on analysis of public code and has limitations.

**8. Future Considerations (Post-MVP)**

*   Implement more verified rules as analysis progresses.
*   Provide more detailed explanations for *why* a rule matters, potentially linking to blog posts or analyses.
*   Add a character counter.
*   Refine UI/UX based on user feedback.
*   Explore ways to indicate confidence levels in certain rules.
*   Consider incorporating insights from reputable third-party analyses of the algorithm (if available and reliable).
*   Potentially offer suggestions for improvement (e.g., "Consider adding an image" instead of just "X - No media mentioned").

**9. Open Questions**

*   Which specific, actionable rules can be reliably extracted and verified from the current public Scala codebase? (Requires deep dive analysis).
*   How to best handle nuances or conflicting factors found in the algorithm code within simple binary (Good/Bad) feedback?
*   How to effectively communicate the tool's limitations to the user?
*   What is the strategy for updating rules if/when Twitter updates its public algorithm code or new analyses emerge?

---