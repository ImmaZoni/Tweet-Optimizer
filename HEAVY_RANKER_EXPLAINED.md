# Twitter Heavy Ranker (Recap Model) Explained

This document summarizes findings from exploring the `the-algorithm-ml/projects/home/recap/` codebase, which contains the "Heavy Ranker" model used for ranking tweets in the home timeline.

## 1. Overview

The Heavy Ranker is a complex deep learning model designed to predict various engagement types (likes, replies, retweets, etc.) for a given user-tweet pair. It uses a multi-task learning architecture, meaning it shares parameters across different prediction tasks while also having task-specific components.

## 2. Input Features (`FEATURES.md`)

The model takes a large number of input features, documented in `FEATURES.md`. These fall into several categories:

*   **Aggregate Features:** The bulk of the features. These represent historical counts or sums of user actions, author actions, or feature values over different time windows (e.g., 30 minutes, 1 day, 50 days) and scopes (e.g., user-level, author-level, user-author pair, user-topic pair). They capture user preferences, author popularity, topic affinity, etc.
*   **Tweet Content Features (`recap.tweetfeature`, `tweetsource`):**
    *   **Text-Based:** Length, number of hashtags, number of mentions, presence of question marks, language, number of capital letters, number of newlines.
    *   **Media-Based:** Presence/type of media (image, video, GIF, card), video duration, view counts, aspect ratios, color information, face detection. *Media features are numerous and seem important.*
    *   **Entity-Based:** Presence of links, hashtags, mentions, news keywords, trends.
    *   **Safety/Content Flags:** Indicators for sensitive content, spam, abuse, NSFW, duplicates.
    *   **Author/Context:** Whether the author is verified, new, bot-like; tweet type (reply, retweet); conversation details (if it's a reply, features of the parent tweet).
*   **User-Author Relationship (`realgraph`, `realtime_interaction_graph`):** Features describing the connection strength and interaction history between the viewing user and the tweet author (follows, mutual follows, past likes, DMs, blocks, etc.).
*   **Embeddings (`Twhin`, `SimClusters`):** Dense vector representations (embeddings) of users and tweets derived from graph learning (follow graph, engagement graph) used to calculate similarity scores.
*   **Contextual Features:** Device type, time of day, day of week, user state (new, light, heavy tweeter).

## 3. Feature Preprocessing (`model/feature_transform.py`, `config/local_prod.yaml`)

Before features enter the main network, they are preprocessed:

*   **Categorization:** Features are likely implicitly categorized into continuous, binary, discrete (for embeddings), etc., based on configuration.
*   **Continuous Feature Transformation (`DoubleNormLog`):** The `local_prod.yaml` config confirms this method is used.
    1.  **Handle Non-Finite:** Replace NaN/infinity with 0.
    2.  **Log Transform:** Apply `sign(x) * log(1 + abs(x))`. This compresses large values, making the model more sensitive to changes at lower values (e.g., 0 vs 1 hashtag matters more than 10 vs 11).
    3.  **Batch Normalization (Optional):** Applied in this config (momentum 0.01).
    4.  **Clamp:** Limit the range of values to +/- 5.0.
*   **Binary Features:** Concatenated *after* continuous features are processed. `LayerNorm` is applied to the combined tensor.
*   **Embeddings:** Precomputed Twhin embeddings (`author_embedding`, `user_embedding`, `user_eng_embedding`) are passed as input features and layer-normalized within the model.

## 4. Model Architecture (`model/entrypoint.py`, `model/config.py`, `model/mlp.py`, `model/mask_net.py`, `config/local_prod.yaml`)

*   **Structure:** Uses a Multi-Task Learning (MTL) approach defined in `MultiTaskRankingModel`.
*   **MTL Strategy:** Configured as `share_all`. All tasks share a common backbone network, with small task-specific "towers" on top.
*   **Backbone Network:**
    *   Architecture: **Parallel MaskNet** (`use_parallel: true`).
    *   Consists of 4 parallel `MaskBlock`s. Each takes the full combined feature/embedding input.
    *   The 4 outputs (each size 1024) are concatenated (total size 4096).
    *   This concatenated tensor is passed through a final MLP (1 hidden layer of size 2048, ReLU activation).
    *   The final output dimension of the shared backbone is 2048.
*   **Task Towers:**
    *   Input: Takes the 2048-dimension output from the backbone.
    *   Architecture: Simple **MLP** for each task (e.g., `is_favorited`, `is_replied`).
    *   Structure: 2 hidden layers (256 units -> 128 units, with ReLU), followed by a final linear layer (1 unit) outputting the logit for the task.
    *   Optional Dropout is applied in some towers (e.g., negative feedback, report).
*   **Other Components:**
    *   This config does *not* use discrete learned embeddings (`large_embeddings: null`, `small_embeddings: null`).
    *   This config does *not* use position debiasing (`position_debias_config: null`).
*   **Outputs:** Each task tower outputs logits, which are converted to probabilities (sigmoid) and potentially calibrated (`AffineMap`, `NumericCalibration`).

## 5. Key Takeaways for Tweet Optimizer Tool

*   Ranking is extremely complex, relying heavily on user/author history, relationships, and real-time data unavailable to a simple text analyzer.
*   Features like `num_hashtags`, `has_question`, `text.length`, `num_caps`, `num_newlines` are direct inputs, but undergo non-linear transformations (like log scaling) before use. Low counts likely have a proportionally larger impact than high counts.
*   Media presence (`contains_media`, `has_image`, `has_video`) is represented by many features and is likely very important.
*   Simple textual analysis can only approximate a small fraction of the ranking signals. Tool limitations must be clearly communicated.

## 6. Training and Loss Function (`model/model_and_loss.py`, `main.py`)

*   **Loss Calculation:** Handled by the `ModelAndLoss` wrapper class.
*   **Loss Type:** Uses standard **Binary Cross-Entropy with Logits** (`BCEWithLogitsLoss`) for each prediction task (like, reply, etc.). This is suitable for predicting the probability of binary outcomes.
*   **Multi-Task Loss:** The losses from individual tasks are combined (likely summed or averaged) to form the final loss for optimizing the model.
*   **Class Imbalance:** The loss function allows weighting positive examples differently for each task (`pos_weight`), helping to counteract potential class imbalance (e.g., rare events like reporting a tweet).

---
*Further exploration needed: Optimizer details (`optimizer/`), DCN/DLRM architectures (though not used in this config), Embedding details (`embedding/` dir), Data loading/schema (`data/`, `config/home_recap_2022/segdense.json`).*
