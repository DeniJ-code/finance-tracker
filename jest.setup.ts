import '@testing-library/jest-dom'

// Set required env vars before any module is imported
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? 'test_bot_token_for_jest'
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test_session_secret_32_chars_min!!'
