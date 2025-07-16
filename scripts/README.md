# Daily News Automation with Ollama (Local LLM)

## Prerequisites

1. **Install Ollama**:
   ```bash
   # Install Ollama
   brew install ollama
   
   # Start Ollama service
   ollama serve
   ```

2. **Download a Model** (in a new terminal):
   ```bash
   # Recommended models for news generation:
   ollama pull llama2          # Good balance of speed/quality
   ollama pull mistral         # Better quality, slower
   ollama pull codellama       # Alternative option
   ollama pull llama2:13b      # Larger model, better quality
   ```

3. **Install Dependencies**:
   ```bash
   cd scripts
   npm install
   ```

## Usage Options

### Option 1: Quick Test
```bash
# Test with default model (llama2)
npm run scrape

# Test with specific models
npm run scrape-mistral
npm run scrape-codellama
OLLAMA_MODEL=llama2:13b npm run scrape
```

### Option 2: Automated Daily Schedule
```bash
# Start the scheduler (runs daily at 8 AM PST)
node scheduler.js
```

### Option 3: macOS Automation (Recommended)
```bash
# Copy the plist file
cp com.runningreport.newsscraper.plist ~/Library/LaunchAgents/

# Load the automation
launchctl load ~/Library/LaunchAgents/com.runningreport.newsscraper.plist

# Check if it's loaded
launchctl list | grep runningreport
```

## Configuration

Set environment variables to customize:

```bash
# Change the model
export OLLAMA_MODEL="mistral"

# Change Ollama URL (if running on different port)
export OLLAMA_URL="http://localhost:11434"
```

## Recommended Models

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama2` | 3.8GB | Fast | Good | Daily automation |
| `mistral` | 4.1GB | Medium | Better | Higher quality summaries |
| `llama2:13b` | 7.3GB | Slow | Best | Best quality (if you have RAM) |
| `codellama` | 3.8GB | Fast | Good | Alternative to llama2 |

## Troubleshooting

### Common Issues:

1. **"Ollama not accessible"**:
   ```bash
   ollama serve
   # Keep this running in background
   ```

2. **Model not found**:
   ```bash
   ollama pull llama2
   ```

3. **Memory issues with large models**:
   - Use smaller models like `llama2` instead of `llama2:13b`
   - Close other applications to free RAM

4. **Slow generation**:
   - Use `llama2` (fastest)
   - Consider upgrading to Apple Silicon Mac for better performance

## How it Works

1. **Scrapes** running news websites daily
2. **Processes** content with local Ollama LLM
3. **Updates** your blog-posts.json automatically  
4. **Maintains** only the 10 most recent posts
5. **Runs completely offline** (except for web scraping)

## Advantages of Ollama

- ✅ **Free** - No API costs
- ✅ **Private** - All processing happens locally
- ✅ **Fast** - No network latency to external APIs
- ✅ **Reliable** - No rate limits or API downtime
- ✅ **Customizable** - Switch models easily

## Performance Tips

- **M1/M2 Macs**: Excellent performance with all models
- **Intel Macs**: Stick to smaller models (llama2, mistral)
- **RAM**: 8GB minimum for llama2, 16GB+ for larger models
- **Storage**: Models take 4-8GB each
