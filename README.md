# Tweet Optimizer

A real-time tool that analyzes tweet drafts based on Twitter's public algorithm to help optimize your content for better engagement.

## Overview

Tweet Optimizer provides instant feedback on tweet drafts by examining various features known to be inputs to Twitter's ranking algorithm. As you type, the tool analyzes your content for patterns that might enhance or reduce visibility in Twitter feeds.

The analysis is based on reverse engineering [Twitter's public algorithm repository](https://github.com/twitter/the-algorithm), [the-algorithm-ml](https://github.com/twitter/the-algorithm-ml) and studying the actual features used in their "Heavy Ranker" machine learning model.

## Features

- **Real-time Analysis**: Get immediate feedback as you type
- **Algorithm-Informed**: Based on actual features from Twitter's ML ranking system
- **Focus on Actionable Items**: Issues to fix are shown first, followed by positive signals
- **Clean, Modern UI**: Simple, distraction-free interface
- **Feature Impact Understanding**: Learn how features like hashtags, links, and emojis affect ranking

## What It Analyzes

- Tweet length and content quality
- Hashtag and mention usage patterns
- Link inclusion and count
- Question mark presence (drives engagement)
- Capitalization patterns
- Newline formatting
- Emoji usage
- Media keyword mentions (image/video proxy)

## Technical Details

The tool implements checks based on actual ranking features from Twitter's algorithm codebase. Key insights include:

- Many tweet features undergo log-transformation, meaning the difference between 0 and 1 (e.g., hashtags) is more impactful than differences at higher counts
- Twitter uses a complex multi-task neural network (MaskNet backbone) for ranking
- Hundreds of signals are used in the full model, including user reputation, engagement history, and graph relationships

## Limitations

This client-side tool cannot access or analyze:
- User reputation or history
- Relationship graphs between users
- Actual media quality or engagement predictions
- Real-time personalization factors

## Contributing

Contributions are welcome! If you find additional insights from Twitter's algorithm that could improve this tool, please open an issue or submit a pull request.

## Credits

- Analysis based on [Twitter's public algorithm repository](https://github.com/twitter/the-algorithm) & [the-algorithm-ml](https://github.com/twitter/the-algorithm-ml)

## License

[MIT License](LICENSE)
