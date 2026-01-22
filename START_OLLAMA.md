# Start Ollama - Quick Fix

## ✅ Ollama is Installed!

But it's **not running yet**. You need to start it.

---

## 🚀 Two Ways to Start Ollama

### Option 1: Background Service (Recommended - Runs Automatically)

```bash
brew services start ollama
```

**This starts Ollama in the background** - you can close the terminal and it keeps running.

**To stop later:**
```bash
brew services stop ollama
```

---

### Option 2: Manual Start (Keep Terminal Open)

```bash
ollama serve
```

**Keep this terminal window open!** If you close it, Ollama stops.

---

## ✅ After Starting

### Test It's Running:

```bash
curl http://localhost:11434/api/tags
```

**Expected:** JSON output (even if empty, that's OK - means it's running)

### Now Pull the Model:

```bash
ollama pull llama3
```

**This will download ~4GB** - wait for "success" message.

---

## 🎯 Quick Commands (Run These Now)

```bash
# 1. Start Ollama (choose one method above)
brew services start ollama

# 2. Wait 2-3 seconds, then test
curl http://localhost:11434/api/tags

# 3. Pull the model
ollama pull llama3
```

---

## ✅ You're Done When You See:

After `ollama pull llama3`:
```
success
```

After `curl http://localhost:11434/api/tags`:
```json
{"models":[...]}
```

---

**Status:** Installation ✅ | Starting Required ⚠️  
**Next:** `brew services start ollama` → Test → Pull Model ✅
